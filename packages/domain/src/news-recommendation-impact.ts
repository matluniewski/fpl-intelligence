import type {
  ClaimId,
  EvidenceId,
  NewsSignalId,
  PlayerAvailabilityStateId,
  PlayerId,
  ProvenanceId,
  RecommendationOptionId,
} from "./identifiers";
import type {
  RecommendationConfidenceBand,
  RecommendationHorizon,
} from "./recommendation";
import type { UtcInstant, Version } from "./primitives";
import type { PlayerAvailabilityState, NewsSignal } from "./news-intelligence";

export type NewsRecommendationStatus =
  "hold" | "wait" | "review" | "sell" | "withheld";
export type CaptaincySuitability = "supported" | "downgraded" | "withheld";
export type NewsRecommendationImpactOutcome =
  "changed" | "unchanged" | "withheld";
export type NewsRecommendationMaterialityReason =
  | "expected_minutes_changed"
  | "start_probability_changed"
  | "projected_points_changed"
  | "recommendation_status_changed"
  | "captaincy_suitability_changed"
  | "confidence_band_changed";

export interface NewsRecommendationDecisionInput {
  readonly expectedMinutes: number;
  readonly startProbability: number;
  readonly projectedPoints: number;
  readonly status: Exclude<NewsRecommendationStatus, "withheld">;
  readonly captaincySuitability: Exclude<CaptaincySuitability, "withheld">;
  readonly confidenceBand: RecommendationConfidenceBand;
}

export interface NewsRecommendationImpactRules {
  readonly version: Version;
  readonly expectedMinutesDelta: number;
  readonly startProbabilityDelta: number;
  readonly projectedPointsDelta: number;
}

export interface NewsRecommendationCausalChain {
  readonly signal: NewsSignal;
  readonly availabilityState: PlayerAvailabilityState;
  readonly claimRefs: readonly ClaimId[];
  readonly evidenceRefs: readonly EvidenceId[];
  readonly provenanceRefs: readonly ProvenanceId[];
}

/** A deterministic upstream producer may expose one evaluated fallback. */
export interface SupportedRecommendationAlternative {
  readonly optionId: RecommendationOptionId;
  readonly expectedPointsDelta: number;
  readonly rationaleCode: string;
}

export interface NewsRecommendationImpact {
  readonly playerId: PlayerId;
  readonly horizon: RecommendationHorizon;
  readonly evaluatedAt: UtcInstant;
  readonly rulesVersion: Version;
  readonly outcome: NewsRecommendationImpactOutcome;
  readonly before: NewsRecommendationDecisionInput;
  readonly after: NewsRecommendationDecisionInput;
  readonly materialityReasons: readonly NewsRecommendationMaterialityReason[];
  readonly currentStatus: NewsRecommendationStatus;
  readonly currentCaptaincySuitability: CaptaincySuitability;
  readonly alternative: SupportedRecommendationAlternative | null;
  readonly causalChain: Readonly<{
    signalRef: NewsSignalId;
    availabilityStateRef: PlayerAvailabilityStateId;
    claimRefs: readonly ClaimId[];
    evidenceRefs: readonly EvidenceId[];
    provenanceRefs: readonly ProvenanceId[];
  }>;
}

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite.`);
}

function validateDecision(
  value: NewsRecommendationDecisionInput,
  label: string,
): void {
  finite(value.expectedMinutes, `${label}.expectedMinutes`);
  finite(value.startProbability, `${label}.startProbability`);
  finite(value.projectedPoints, `${label}.projectedPoints`);
  if (value.expectedMinutes < 0 || value.expectedMinutes > 90)
    throw new RangeError(
      `${label}.expectedMinutes must be between zero and 90.`,
    );
  if (value.startProbability < 0 || value.startProbability > 1)
    throw new RangeError(
      `${label}.startProbability must be between zero and one.`,
    );
}

function uniqueSorted<T extends string>(
  values: readonly T[],
  label: string,
): readonly T[] {
  if (values.length === 0 || new Set(values).size !== values.length)
    throw new RangeError(`${label} must be non-empty and unique.`);
  return Object.freeze([...values].sort());
}

/**
 * Compares normalized baseline and news-adjusted decision inputs. It never
 * produces an action: upstream deterministic recommendation logic supplies
 * both decisions and any bounded alternative.
 */
export function evaluateNewsRecommendationImpact(input: {
  readonly playerId: PlayerId;
  readonly horizon: RecommendationHorizon;
  readonly evaluatedAt: UtcInstant;
  readonly before: NewsRecommendationDecisionInput;
  readonly after: NewsRecommendationDecisionInput;
  readonly causalChain: NewsRecommendationCausalChain;
  readonly alternative?: SupportedRecommendationAlternative;
  readonly rules: NewsRecommendationImpactRules;
}): NewsRecommendationImpact {
  validateDecision(input.before, "before");
  validateDecision(input.after, "after");
  for (const [label, value] of Object.entries({
    expectedMinutesDelta: input.rules.expectedMinutesDelta,
    startProbabilityDelta: input.rules.startProbabilityDelta,
    projectedPointsDelta: input.rules.projectedPointsDelta,
  })) {
    finite(value, `rules.${label}`);
    if (value < 0) throw new RangeError(`rules.${label} must not be negative.`);
  }
  const { signal, availabilityState } = input.causalChain;
  if (
    signal.playerId !== input.playerId ||
    availabilityState.playerId !== input.playerId
  )
    throw new RangeError("Causal chain must target the evaluated player.");
  if (!availabilityState.signalRefs.includes(signal.newsSignalId))
    throw new RangeError("Availability state must retain the causing signal.");
  const claimRefs = uniqueSorted(
    input.causalChain.claimRefs,
    "causalChain.claimRefs",
  );
  const evidenceRefs = uniqueSorted(
    input.causalChain.evidenceRefs,
    "causalChain.evidenceRefs",
  );
  const provenanceRefs = uniqueSorted(
    input.causalChain.provenanceRefs,
    "causalChain.provenanceRefs",
  );
  if (
    !claimRefs.every((id) => signal.claimRefs.includes(id)) ||
    !evidenceRefs.every((id) => signal.evidenceRefs.includes(id)) ||
    !evidenceRefs.every((id) => availabilityState.evidenceRefs.includes(id)) ||
    !provenanceRefs.every((id) => signal.provenanceRefs.includes(id)) ||
    !provenanceRefs.every((id) => availabilityState.provenanceRefs.includes(id))
  )
    throw new RangeError(
      "Causal chain references must retain signal and availability lineage.",
    );

  const unavailable =
    signal.freshness === "expired" ||
    availabilityState.freshness === "expired" ||
    signal.effectiveFrom > input.evaluatedAt ||
    availabilityState.effectiveFrom > input.evaluatedAt ||
    (signal.effectiveUntil !== undefined &&
      signal.effectiveUntil < input.evaluatedAt) ||
    (availabilityState.effectiveUntil !== undefined &&
      availabilityState.effectiveUntil < input.evaluatedAt) ||
    signal.conflictState === "unresolved_conflict" ||
    availabilityState.conflictState === "unresolved_conflict";
  const reasons: NewsRecommendationMaterialityReason[] = [];
  if (
    Math.abs(input.after.expectedMinutes - input.before.expectedMinutes) >=
    input.rules.expectedMinutesDelta
  )
    reasons.push("expected_minutes_changed");
  if (
    Math.abs(input.after.startProbability - input.before.startProbability) >=
    input.rules.startProbabilityDelta
  )
    reasons.push("start_probability_changed");
  if (
    Math.abs(input.after.projectedPoints - input.before.projectedPoints) >=
    input.rules.projectedPointsDelta
  )
    reasons.push("projected_points_changed");
  if (input.after.status !== input.before.status)
    reasons.push("recommendation_status_changed");
  if (input.after.captaincySuitability !== input.before.captaincySuitability)
    reasons.push("captaincy_suitability_changed");
  if (input.after.confidenceBand !== input.before.confidenceBand)
    reasons.push("confidence_band_changed");
  const outcome: NewsRecommendationImpactOutcome = unavailable
    ? "withheld"
    : reasons.length === 0
      ? "unchanged"
      : "changed";
  const alternative = input.alternative ?? null;
  if (alternative !== null) {
    finite(alternative.expectedPointsDelta, "alternative.expectedPointsDelta");
    if (alternative.rationaleCode.trim().length === 0)
      throw new RangeError("alternative.rationaleCode must not be empty.");
  }
  return Object.freeze({
    playerId: input.playerId,
    horizon: Object.freeze({ ...input.horizon }),
    evaluatedAt: input.evaluatedAt,
    rulesVersion: input.rules.version,
    outcome,
    before: Object.freeze({ ...input.before }),
    after: Object.freeze({ ...input.after }),
    materialityReasons: Object.freeze(reasons),
    currentStatus: unavailable ? "withheld" : input.after.status,
    currentCaptaincySuitability: unavailable
      ? "withheld"
      : input.after.captaincySuitability,
    alternative:
      alternative === null ? null : Object.freeze({ ...alternative }),
    causalChain: Object.freeze({
      signalRef: signal.newsSignalId,
      availabilityStateRef: availabilityState.availabilityStateId,
      claimRefs,
      evidenceRefs,
      provenanceRefs,
    }),
  });
}
