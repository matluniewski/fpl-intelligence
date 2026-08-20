import {
  createNewsSignal,
  createPlayerAvailabilityState,
} from "./news-intelligence-factory";
import {
  createNewsSignalId,
  createPlayerAvailabilityStateId,
  type PlayerId,
} from "./identifiers";
import type {
  Claim,
  ClaimCertainty,
  ClaimDirectness,
  ClaimedAvailability,
  Evidence,
  NewsSignal,
  PlayerAvailabilityState,
  RawNewsItem,
} from "./news-intelligence";
import {
  assessSourceReputation,
  type SourceReputationCatalog,
  type SourceReputationContext,
  type SourceReliabilityTier,
} from "./source-reputation";
import type { UtcInstant, Version } from "./primitives";

export interface EvidenceEngineRules {
  readonly name: string;
  readonly version: Version;
  readonly currentWithinMs: number;
  readonly staleWithinMs: number;
  readonly minimumResolvedScore: number;
}

export interface EvidenceEngineEntry {
  readonly claim: Claim;
  readonly evidence: readonly Evidence[];
  readonly rawNewsItem: RawNewsItem;
  /** Same key means dependent or syndicated reports and counts only once. */
  readonly independenceKey: string;
}

export interface ResolvePlayerEvidenceInput {
  readonly playerId: PlayerId;
  readonly context: SourceReputationContext;
  readonly evaluatedAt: UtcInstant;
  readonly rules: EvidenceEngineRules;
  readonly sourceReputation: SourceReputationCatalog;
  readonly entries: readonly EvidenceEngineEntry[];
}

export interface EvidenceEngineResolution {
  readonly signal: NewsSignal;
  readonly availability: PlayerAvailabilityState;
  readonly explanation: readonly string[];
}

const tierScore: Readonly<Record<SourceReliabilityTier, number>> = {
  authoritative: 4,
  trusted: 3,
  standard: 2,
  conservative: 1,
};
const directnessScore: Readonly<Record<ClaimDirectness, number>> = {
  explicit_quote: 3,
  direct_report: 2,
  inference: 1,
  speculation: 0,
};
const certaintyScore: Readonly<Record<ClaimCertainty, number>> = {
  high: 3,
  medium: 2,
  low: 1,
  not_assessed: 0,
};

function sorted<T extends string>(values: Iterable<T>): readonly T[] {
  return Object.freeze([...new Set(values)].sort());
}

function freshness(
  latestAt: UtcInstant | null,
  evaluatedAt: UtcInstant,
  rules: EvidenceEngineRules,
): "current" | "stale" | "expired" {
  if (latestAt === null) return "expired";
  const age = new Date(evaluatedAt).getTime() - new Date(latestAt).getTime();
  if (age <= rules.currentWithinMs) return "current";
  if (age <= rules.staleWithinMs) return "stale";
  return "expired";
}

function availabilityAssumption(
  state: ClaimedAvailability,
  confidence: ClaimCertainty,
): Readonly<{ probability: number | null; minutes: number | null }> {
  if (confidence === "low" || confidence === "not_assessed")
    return Object.freeze({ probability: null, minutes: null });
  if (state === "available")
    return Object.freeze({ probability: 1, minutes: 90 });
  if (state === "doubtful")
    return Object.freeze({ probability: 0.5, minutes: 45 });
  if (state === "unavailable" || state === "suspended")
    return Object.freeze({ probability: 0, minutes: 0 });
  return Object.freeze({ probability: null, minutes: null });
}

function confidenceFrom(score: number): ClaimCertainty {
  if (score >= 10) return "high";
  if (score >= 6) return "medium";
  return "low";
}

/**
 * Resolves provider-independent evidence only. It never promotes extraction
 * output to truth: policy, lifecycle, freshness, reputation, and corroboration
 * are explicit inputs, and conflicts remain unresolved when not provable.
 */
export function resolvePlayerEvidence(
  input: ResolvePlayerEvidenceInput,
): EvidenceEngineResolution {
  const reasonCodes = new Set<string>();
  const eligible = input.entries.filter((entry) => {
    if (
      entry.claim.subject.kind !== "player" ||
      entry.claim.subject.playerId !== input.playerId ||
      entry.claim.claimType !== "availability"
    )
      return false;
    if (entry.rawNewsItem.policyState === "blocked") {
      reasonCodes.add("policy_blocked_input_excluded");
      return false;
    }
    if (
      entry.evidence.length === 0 ||
      entry.evidence.some((value) => value.lifecycleState !== "active")
    ) {
      reasonCodes.add("inactive_or_missing_evidence_excluded");
      return false;
    }
    return true;
  });

  const latestAt = eligible.reduce<UtcInstant | null>((latest, entry) => {
    const candidate = entry.evidence.reduce(
      (value, evidence) =>
        evidence.assessedAt > value ? evidence.assessedAt : value,
      entry.claim.extractedAt,
    );
    return latest === null || candidate > latest ? candidate : latest;
  }, null);
  const resultFreshness = freshness(latestAt, input.evaluatedAt, input.rules);
  if (resultFreshness !== "current")
    reasonCodes.add(`${resultFreshness}_evidence`);

  const current = resultFreshness === "current" ? eligible : [];
  const states = sorted(current.map((entry) => entry.claim.assertedState));
  // Keep eligible lineage even when it is stale/expired so the conservative
  // result remains explainable without treating old evidence as current.
  const claimRefs = sorted(eligible.map((entry) => entry.claim.claimId));
  const evidenceRefs = sorted(
    eligible.flatMap((entry) =>
      entry.evidence.map((value) => value.evidenceId),
    ),
  );
  const provenanceRefs = sorted(
    eligible.flatMap((entry) => entry.claim.provenanceRefs),
  );
  const independentKeys = new Set<string>();
  let score = 0;
  for (const entry of current) {
    const assessment = assessSourceReputation({
      catalog: input.sourceReputation,
      sourceId: entry.rawNewsItem.sourceId,
      sourceType: entry.claim.sourceType,
      context: input.context,
    });
    for (const code of assessment.rationaleCodes) reasonCodes.add(code);
    if (!assessment.contextMatched) {
      reasonCodes.add("source_context_not_approved");
      continue;
    }
    if (independentKeys.has(entry.independenceKey)) {
      reasonCodes.add("dependent_or_syndicated_report_not_counted");
      continue;
    }
    independentKeys.add(entry.independenceKey);
    score +=
      tierScore[assessment.tier] +
      directnessScore[entry.claim.directness] +
      certaintyScore[entry.claim.certainty];
  }

  const conflict = states.length > 1;
  if (conflict) reasonCodes.add("conflicting_availability_claims");
  const resolved =
    !conflict &&
    states.length === 1 &&
    score >= input.rules.minimumResolvedScore;
  if (!resolved) reasonCodes.add("insufficient_evidence_for_resolved_state");
  const confidence = resolved ? confidenceFrom(score) : "low";
  const state = resolved ? (states[0] as ClaimedAvailability) : "unknown";
  const conflictState = conflict
    ? "unresolved_conflict"
    : resolved
      ? "no_conflict"
      : "unresolved_conflict";
  const identity = `${input.playerId}:${input.evaluatedAt}:${input.rules.version}`;
  const effectiveFrom = input.evaluatedAt;
  const assumptions = availabilityAssumption(state, confidence);
  const signal = createNewsSignal({
    newsSignalId: createNewsSignalId(`evidence-engine:${identity}`),
    playerId: input.playerId,
    state,
    evaluatedAt: input.evaluatedAt,
    effectiveFrom,
    confidenceBand: confidence,
    freshness: resultFreshness,
    conflictState,
    claimRefs,
    evidenceRefs,
    provenanceRefs,
    ruleName: input.rules.name,
    ruleVersion: input.rules.version,
    reasonCodes: sorted(reasonCodes),
  });
  const availability = createPlayerAvailabilityState({
    availabilityStateId: createPlayerAvailabilityStateId(
      `evidence-engine:${identity}`,
    ),
    playerId: input.playerId,
    availability: state,
    expectedStartProbability: assumptions.probability,
    expectedMinutes: assumptions.minutes,
    evaluatedAt: input.evaluatedAt,
    effectiveFrom,
    confidenceBand: confidence,
    freshness: resultFreshness,
    conflictState,
    assumptionCodes: sorted(reasonCodes),
    signalRefs: [signal.newsSignalId],
    evidenceRefs,
    provenanceRefs,
    ruleName: input.rules.name,
    ruleVersion: input.rules.version,
  });
  return Object.freeze({
    signal,
    availability,
    explanation: sorted(reasonCodes),
  });
}
