import type { ProvenanceId } from "./identifiers";
import type { UtcInstant } from "./primitives";
import type {
  Claim,
  ClaimCandidateValidationResult,
  ClaimInput,
  ClaimValidationContext,
  Evidence,
  EvidenceInput,
  NewsContractValidationIssue,
  NewsSignal,
  NewsSignalInput,
  PlayerAvailabilityState,
  PlayerAvailabilityStateInput,
  RawNewsItem,
  RawNewsItemInput,
  UntrustedClaimCandidate,
} from "./news-intelligence";
import { NewsContractError } from "./news-intelligence";
import { createUtcInstant } from "./primitives";

const CLAIM_TYPES = [
  "availability",
  "injury",
  "suspension",
  "expected_start",
  "minutes_limit",
  "lineup",
  "transfer_status",
  "other_reviewed",
] as const;
const DIRECTNESS = [
  "explicit_quote",
  "direct_report",
  "inference",
  "speculation",
] as const;
const CERTAINTY = ["not_assessed", "low", "medium", "high"] as const;
const SOURCE_TYPES = [
  "official_club",
  "official_competition",
  "player_or_staff",
  "journalist",
  "publisher",
  "licensed_aggregator",
  "other_reviewed",
] as const;
const AVAILABILITY = [
  "available",
  "doubtful",
  "unavailable",
  "suspended",
  "unknown",
] as const;
const FRESHNESS = ["current", "stale", "expired", "unknown"] as const;
const CONFLICT = [
  "no_conflict",
  "unresolved_conflict",
  "resolved_by_rule",
] as const;
const PERMISSION_DECISIONS = [
  "permitted",
  "restricted",
  "blocked",
  "not_reviewed",
] as const;
const COMMERCIAL_USE = [
  "permitted",
  "restricted",
  "unclear",
  "not_reviewed",
] as const;
const EVIDENCE_STANCES = ["supports", "contradicts", "context"] as const;
const EVIDENCE_REFERENCE_KINDS = [
  "quote_metadata",
  "source_reference",
  "content_fingerprint",
  "content_unavailable",
] as const;
const LIFECYCLE_STATES = [
  "active",
  "stale",
  "expired",
  "corrected",
  "withdrawn",
  "deleted",
  "inaccessible",
  "quarantined",
  "policy_disabled",
] as const;

function issue(
  code: NewsContractValidationIssue["code"],
  path: string,
  message: string,
): NewsContractValidationIssue {
  return { code, path, message };
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function assertValid(issues: readonly NewsContractValidationIssue[]): void {
  if (issues.length > 0) throw new NewsContractError(issues);
}

function freezeRefs<T>(refs: readonly T[]): readonly T[] {
  return Object.freeze([...refs]);
}

function validateProvenance(
  refs: readonly ProvenanceId[],
  path: string,
): NewsContractValidationIssue[] {
  return refs.length === 0
    ? [
        issue(
          "missing_provenance",
          path,
          "Material news data must retain provenance.",
        ),
      ]
    : [];
}

function validateCodes(
  values: readonly string[],
  path: string,
): NewsContractValidationIssue[] {
  const seen = new Set<string>();
  const issues: NewsContractValidationIssue[] = [];
  for (const [index, value] of values.entries()) {
    if (!nonEmpty(value))
      issues.push(
        issue("empty_value", `${path}[${index}]`, "Code must not be empty."),
      );
    else if (seen.has(value))
      issues.push(
        issue("invalid_value", `${path}[${index}]`, "Codes must be unique."),
      );
    seen.add(value);
  }
  return issues;
}

function validateExternalReference(
  reference: { readonly namespace: string; readonly externalId: string },
  path: string,
): NewsContractValidationIssue[] {
  return !nonEmpty(reference.namespace) || !nonEmpty(reference.externalId)
    ? [
        issue(
          "empty_value",
          path,
          "External reference namespace and identifier must not be empty.",
        ),
      ]
    : [];
}

export function createRawNewsItem(input: RawNewsItemInput): RawNewsItem {
  const issues = [
    ...validateProvenance(input.provenanceRefs, "provenanceRefs"),
  ];
  if (!nonEmpty(input.ingestionKey))
    issues.push(
      issue(
        "empty_value",
        "ingestionKey",
        "Central ingestion requires a stable ingestion key.",
      ),
    );
  if (input.publishedAt !== undefined && input.publishedAt > input.fetchedAt)
    issues.push(
      issue(
        "time_invalid",
        "publishedAt",
        "Publication cannot be after fetching.",
      ),
    );
  if (input.observedAt !== undefined && input.observedAt > input.fetchedAt)
    issues.push(
      issue(
        "time_invalid",
        "observedAt",
        "Observation cannot be after fetching.",
      ),
    );
  if (
    input.contentReference.availability === "retained_reference" &&
    !nonEmpty(input.contentReference.locator ?? "")
  )
    issues.push(
      issue(
        "invalid_value",
        "contentReference.locator",
        "Retained references require a locator.",
      ),
    );
  if (
    input.contentReference.availability === "policy_blocked" &&
    (input.contentReference.locator !== undefined ||
      input.contentReference.fingerprint !== undefined)
  )
    issues.push(
      issue(
        "content_policy_violation",
        "contentReference",
        "Policy-blocked content cannot retain a locator or fingerprint.",
      ),
    );
  if (
    input.contentReference.fingerprint !== undefined &&
    !nonEmpty(input.contentReference.fingerprint)
  )
    issues.push(
      issue(
        "empty_value",
        "contentReference.fingerprint",
        "Content fingerprint must not be empty when supplied.",
      ),
    );
  if (input.externalReference !== undefined)
    issues.push(
      ...validateExternalReference(
        input.externalReference,
        "externalReference",
      ),
    );
  const policy = input.contentPolicy ?? null;
  if (
    policy !== null &&
    (!COMMERCIAL_USE.includes(policy.commercialUse) ||
      !PERMISSION_DECISIONS.includes(policy.retention) ||
      !PERMISSION_DECISIONS.includes(policy.display) ||
      !PERMISSION_DECISIONS.includes(policy.externalProcessing))
  )
    issues.push(
      issue(
        "invalid_value",
        "contentPolicy",
        "Content policy contains an unrecognized decision.",
      ),
    );
  const policyState =
    policy?.commercialUse === "permitted"
      ? "permitted"
      : policy?.commercialUse === "restricted"
        ? "restricted"
        : "blocked";
  if (
    input.contentReference.availability === "retained_reference" &&
    policy?.retention !== "permitted" &&
    policy?.retention !== "restricted"
  )
    issues.push(
      issue(
        "content_policy_violation",
        "contentReference",
        "Content cannot be retained without an affirmative retention decision.",
      ),
    );
  assertValid(issues);
  return Object.freeze({
    ...input,
    contentPolicy: policy,
    policyState,
    contentReference: Object.freeze({ ...input.contentReference }),
    ...(input.externalReference === undefined
      ? {}
      : { externalReference: Object.freeze({ ...input.externalReference }) }),
    provenanceRefs: freezeRefs(input.provenanceRefs),
    ...(policy === null ? {} : { contentPolicy: Object.freeze({ ...policy }) }),
  });
}

export function validateClaimCandidate(
  value: unknown,
): ClaimCandidateValidationResult {
  const issues: NewsContractValidationIssue[] = [];
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return Object.freeze({
      success: false,
      issues: Object.freeze([
        issue("invalid_shape", "$", "Claim candidate must be an object."),
      ]),
    });
  const candidate = value as Record<string, unknown>;
  if (!CLAIM_TYPES.includes(candidate["claimType"] as never))
    issues.push(
      issue("invalid_value", "claimType", "Claim type is not recognized."),
    );
  if (
    typeof candidate["assertedState"] !== "string" ||
    !/^[a-z][a-z0-9_]{0,63}$/u.test(candidate["assertedState"])
  )
    issues.push(
      issue(
        "invalid_value",
        "assertedState",
        "Asserted state must be a normalized lowercase code, not generated prose.",
      ),
    );
  if (
    candidate["claimType"] === "availability" &&
    !AVAILABILITY.includes(candidate["assertedState"] as never)
  )
    issues.push(
      issue(
        "invalid_value",
        "assertedState",
        "Availability claims must use a recognized availability state.",
      ),
    );
  if (!DIRECTNESS.includes(candidate["directness"] as never))
    issues.push(
      issue(
        "invalid_value",
        "directness",
        "Claim directness is not recognized.",
      ),
    );
  if (!CERTAINTY.includes(candidate["certainty"] as never))
    issues.push(
      issue("invalid_value", "certainty", "Claim certainty is not recognized."),
    );
  if (!SOURCE_TYPES.includes(candidate["sourceType"] as never))
    issues.push(
      issue("invalid_value", "sourceType", "Source type is not recognized."),
    );
  let eventTime: UtcInstant | undefined;
  if (candidate["eventTime"] !== undefined) {
    try {
      if (typeof candidate["eventTime"] !== "string") throw new RangeError();
      eventTime = createUtcInstant(candidate["eventTime"]);
    } catch {
      issues.push(
        issue(
          "invalid_value",
          "eventTime",
          "Event time must be an ISO timestamp with an explicit UTC offset.",
        ),
      );
    }
  }
  if (issues.length > 0)
    return Object.freeze({ success: false, issues: Object.freeze(issues) });
  return Object.freeze({
    success: true,
    value: Object.freeze({
      claimType: candidate["claimType"],
      assertedState: (candidate["assertedState"] as string).trim(),
      directness: candidate["directness"],
      certainty: candidate["certainty"],
      sourceType: candidate["sourceType"],
      ...(eventTime === undefined ? {} : { eventTime }),
    } as UntrustedClaimCandidate),
  });
}

export function createClaim(
  input: ClaimInput,
  context: ClaimValidationContext,
): Claim {
  const issues = [
    ...validateProvenance(input.provenanceRefs, "provenanceRefs"),
  ];
  const validated = validateClaimCandidate(input);
  if (!validated.success) issues.push(...validated.issues);
  if (context.rawNewsItem.rawNewsItemId !== input.rawNewsItemId)
    issues.push(
      issue(
        "lineage_missing",
        "rawNewsItemId",
        "Claim input must reference the validated raw news item.",
      ),
    );
  if (
    !input.provenanceRefs.some((provenanceId) =>
      context.rawNewsItem.provenanceRefs.includes(provenanceId),
    )
  )
    issues.push(
      issue(
        "lineage_missing",
        "provenanceRefs",
        "Claim provenance must retain lineage to the raw news item.",
      ),
    );
  issues.push(
    ...validateExternalReference(input.originalReference, "originalReference"),
  );
  if (context.rawNewsItem.policyState === "blocked")
    issues.push(
      issue(
        "content_policy_violation",
        "rawNewsItemId",
        "A policy-blocked raw item cannot produce a Claim.",
      ),
    );
  if (
    input.extraction.method === "model_assisted" &&
    (input.extraction.modelVersion === undefined ||
      input.extraction.promptVersion === undefined)
  )
    issues.push(
      issue(
        "lineage_missing",
        "extraction",
        "Model-assisted extraction requires model and prompt versions.",
      ),
    );
  if (
    input.extraction.method !== "model_assisted" &&
    (input.extraction.modelVersion !== undefined ||
      input.extraction.promptVersion !== undefined)
  )
    issues.push(
      issue(
        "invalid_value",
        "extraction",
        "Only model-assisted extraction may carry model or prompt versions.",
      ),
    );
  if (
    input.extraction.method === "model_assisted" &&
    context.rawNewsItem.contentPolicy?.externalProcessing !== "permitted" &&
    context.rawNewsItem.contentPolicy?.externalProcessing !== "restricted"
  )
    issues.push(
      issue(
        "content_policy_violation",
        "extraction",
        "Model-assisted extraction requires an affirmative external-processing decision.",
      ),
    );
  assertValid(issues);
  return Object.freeze({
    ...input,
    subject: Object.freeze({ ...input.subject }),
    extraction: Object.freeze({ ...input.extraction }),
    originalReference: Object.freeze({ ...input.originalReference }),
    provenanceRefs: freezeRefs(input.provenanceRefs),
    resolutionState: "unresolved",
  });
}

export function createEvidence(input: EvidenceInput): Evidence {
  const issues = [
    ...validateProvenance(input.provenanceRefs, "provenanceRefs"),
  ];
  if (!nonEmpty(input.sourceContextCode))
    issues.push(
      issue(
        "empty_value",
        "sourceContextCode",
        "Evidence source context is required.",
      ),
    );
  if (!EVIDENCE_STANCES.includes(input.stance))
    issues.push(
      issue("invalid_value", "stance", "Evidence stance is not recognized."),
    );
  if (!EVIDENCE_REFERENCE_KINDS.includes(input.reference.kind))
    issues.push(
      issue(
        "invalid_value",
        "reference.kind",
        "Evidence reference kind is not recognized.",
      ),
    );
  if (!LIFECYCLE_STATES.includes(input.lifecycleState))
    issues.push(
      issue(
        "invalid_value",
        "lifecycleState",
        "Evidence lifecycle state is not recognized.",
      ),
    );
  if (
    input.observedAt > input.ingestedAt ||
    input.ingestedAt > input.assessedAt
  )
    issues.push(
      issue(
        "time_invalid",
        "$",
        "Evidence observation, ingestion, and assessment times must be ordered.",
      ),
    );
  if (
    input.reference.kind === "content_unavailable" &&
    input.reference.locator !== undefined
  )
    issues.push(
      issue(
        "content_policy_violation",
        "reference",
        "Unavailable content cannot retain a locator or excerpt.",
      ),
    );
  if (
    input.reference.kind !== "content_unavailable" &&
    !nonEmpty(input.reference.locator ?? "")
  )
    issues.push(
      issue(
        "empty_value",
        "reference.locator",
        "Available evidence metadata requires a locator.",
      ),
    );
  assertValid(issues);
  return Object.freeze({
    ...input,
    reference: Object.freeze({ ...input.reference }),
    provenanceRefs: freezeRefs(input.provenanceRefs),
  });
}

export function createNewsSignal(input: NewsSignalInput): NewsSignal {
  const issues = [
    ...validateProvenance(input.provenanceRefs, "provenanceRefs"),
    ...validateCodes(input.reasonCodes, "reasonCodes"),
  ];
  if (!AVAILABILITY.includes(input.state))
    issues.push(
      issue("invalid_value", "state", "Signal state is not recognized."),
    );
  if (!CERTAINTY.includes(input.confidenceBand))
    issues.push(
      issue(
        "invalid_value",
        "confidenceBand",
        "Confidence band is not recognized.",
      ),
    );
  if (!FRESHNESS.includes(input.freshness))
    issues.push(
      issue("invalid_value", "freshness", "Freshness is not recognized."),
    );
  if (!CONFLICT.includes(input.conflictState))
    issues.push(
      issue(
        "invalid_value",
        "conflictState",
        "Conflict state is not recognized.",
      ),
    );
  if (input.claimRefs.length === 0 || input.evidenceRefs.length === 0)
    issues.push(
      issue(
        "lineage_missing",
        "$",
        "Signals require claim and evidence lineage.",
      ),
    );
  if (!nonEmpty(input.ruleName) || input.reasonCodes.length === 0)
    issues.push(
      issue(
        "empty_value",
        "$",
        "Signals require a rule name and reason codes.",
      ),
    );
  if (
    input.effectiveUntil !== undefined &&
    input.effectiveUntil < input.effectiveFrom
  )
    issues.push(
      issue("time_invalid", "$", "Signal effective window is inverted."),
    );
  assertValid(issues);
  return Object.freeze({
    ...input,
    claimRefs: freezeRefs(input.claimRefs),
    evidenceRefs: freezeRefs(input.evidenceRefs),
    provenanceRefs: freezeRefs(input.provenanceRefs),
    reasonCodes: freezeRefs(input.reasonCodes),
  });
}

export function createPlayerAvailabilityState(
  input: PlayerAvailabilityStateInput,
): PlayerAvailabilityState {
  const issues = [
    ...validateProvenance(input.provenanceRefs, "provenanceRefs"),
    ...validateCodes(input.assumptionCodes, "assumptionCodes"),
  ];
  if (!AVAILABILITY.includes(input.availability))
    issues.push(
      issue("invalid_value", "availability", "Availability is not recognized."),
    );
  if (
    !CERTAINTY.includes(input.confidenceBand) ||
    !FRESHNESS.includes(input.freshness) ||
    !CONFLICT.includes(input.conflictState)
  )
    issues.push(
      issue(
        "invalid_value",
        "$",
        "Availability assessment metadata is not recognized.",
      ),
    );
  if (input.signalRefs.length === 0 || input.evidenceRefs.length === 0)
    issues.push(
      issue(
        "lineage_missing",
        "$",
        "Availability state requires signal and evidence lineage.",
      ),
    );
  if (!nonEmpty(input.ruleName) || input.assumptionCodes.length === 0)
    issues.push(
      issue(
        "empty_value",
        "$",
        "Availability state requires a rule name and assumptions.",
      ),
    );
  if (
    input.expectedStartProbability !== null &&
    (!Number.isFinite(input.expectedStartProbability) ||
      input.expectedStartProbability < 0 ||
      input.expectedStartProbability > 1)
  )
    issues.push(
      issue(
        "invalid_value",
        "expectedStartProbability",
        "Expected-start probability must be between zero and one.",
      ),
    );
  if (
    input.expectedMinutes !== null &&
    (!Number.isFinite(input.expectedMinutes) ||
      input.expectedMinutes < 0 ||
      input.expectedMinutes > 90)
  )
    issues.push(
      issue(
        "invalid_value",
        "expectedMinutes",
        "Expected minutes must be between zero and 90.",
      ),
    );
  if (
    input.effectiveUntil !== undefined &&
    input.effectiveUntil < input.effectiveFrom
  )
    issues.push(
      issue("time_invalid", "$", "Availability effective window is inverted."),
    );
  assertValid(issues);
  return Object.freeze({
    ...input,
    assumptionCodes: freezeRefs(input.assumptionCodes),
    signalRefs: freezeRefs(input.signalRefs),
    evidenceRefs: freezeRefs(input.evidenceRefs),
    provenanceRefs: freezeRefs(input.provenanceRefs),
  });
}
