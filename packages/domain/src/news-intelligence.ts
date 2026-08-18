import type {
  ClaimId,
  EvidenceId,
  NewsSignalId,
  PlayerAvailabilityStateId,
  PlayerId,
  ProvenanceId,
  ProviderId,
  RawNewsItemId,
  SourceId,
  SourcePolicyId,
  TeamId,
} from "./identifiers";
import type { UtcInstant, Version } from "./primitives";
import type {
  CommercialUseClassification,
  ExternalReference,
  ProvenanceLifecycleState,
} from "./provenance";

export type PermissionDecision =
  "permitted" | "restricted" | "blocked" | "not_reviewed";

export interface NewsContentPolicy {
  readonly sourcePolicyId: SourcePolicyId;
  readonly policyVersion: Version;
  readonly commercialUse: CommercialUseClassification;
  readonly retention: PermissionDecision;
  readonly display: PermissionDecision;
  readonly externalProcessing: PermissionDecision;
}

export interface RawContentReference {
  readonly availability:
    "not_retained" | "retained_reference" | "policy_blocked";
  readonly locator?: string;
  readonly fingerprint?: string;
}

export interface RawNewsItemInput {
  readonly rawNewsItemId: RawNewsItemId;
  readonly sourceId: SourceId;
  readonly providerId: ProviderId;
  readonly ingestionKey: string;
  readonly fetchedAt: UtcInstant;
  readonly publishedAt?: UtcInstant;
  readonly observedAt?: UtcInstant;
  readonly externalReference?: ExternalReference;
  readonly contentReference: RawContentReference;
  readonly contentPolicy?: NewsContentPolicy;
  readonly provenanceRefs: readonly ProvenanceId[];
}

export type RawNewsItem = Omit<RawNewsItemInput, "contentPolicy"> & {
  readonly contentPolicy: NewsContentPolicy | null;
  readonly policyState: "permitted" | "restricted" | "blocked";
};

export type ClaimDirectness =
  "explicit_quote" | "direct_report" | "inference" | "speculation";
export type ClaimCertainty = "not_assessed" | "low" | "medium" | "high";
export type NewsSourceType =
  | "official_club"
  | "official_competition"
  | "player_or_staff"
  | "journalist"
  | "publisher"
  | "licensed_aggregator"
  | "other_reviewed";
export type ClaimType =
  | "availability"
  | "injury"
  | "suspension"
  | "expected_start"
  | "minutes_limit"
  | "lineup"
  | "transfer_status"
  | "other_reviewed";
export type ClaimedAvailability =
  "available" | "doubtful" | "unavailable" | "suspended" | "unknown";

export type ClaimSubject =
  | { readonly kind: "player"; readonly playerId: PlayerId }
  | { readonly kind: "team"; readonly teamId: TeamId };

/** Provider-independent shape accepted from any untrusted extraction boundary. */
export interface UntrustedClaimCandidate {
  readonly claimType: ClaimType;
  readonly assertedState: string;
  readonly directness: ClaimDirectness;
  readonly certainty: ClaimCertainty;
  readonly sourceType: NewsSourceType;
  readonly eventTime?: UtcInstant;
}

export interface ClaimExtractionIdentity {
  readonly method: "deterministic_rule" | "model_assisted" | "manual_review";
  readonly implementationVersion: Version;
  readonly schemaVersion: Version;
  readonly modelVersion?: Version;
  readonly promptVersion?: Version;
}

export interface ClaimInput extends UntrustedClaimCandidate {
  readonly claimId: ClaimId;
  readonly rawNewsItemId: RawNewsItemId;
  readonly subject: ClaimSubject;
  readonly extractedAt: UtcInstant;
  readonly originalReference: ExternalReference;
  readonly extraction: ClaimExtractionIdentity;
  readonly provenanceRefs: readonly ProvenanceId[];
}

export interface ClaimValidationContext {
  readonly rawNewsItem: RawNewsItem;
}

/** Claims remain unresolved assertions; extraction never makes them truth. */
export interface Claim extends ClaimInput {
  readonly resolutionState: "unresolved";
}

export interface EvidenceReference {
  readonly kind:
    | "quote_metadata"
    | "source_reference"
    | "content_fingerprint"
    | "content_unavailable";
  readonly locator?: string;
}

export interface EvidenceInput {
  readonly evidenceId: EvidenceId;
  readonly claimId: ClaimId;
  readonly rawNewsItemId: RawNewsItemId;
  readonly stance: "supports" | "contradicts" | "context";
  readonly sourceContextCode: string;
  readonly reference: EvidenceReference;
  readonly observedAt: UtcInstant;
  readonly ingestedAt: UtcInstant;
  readonly assessedAt: UtcInstant;
  readonly provenanceRefs: readonly ProvenanceId[];
  readonly lifecycleState: ProvenanceLifecycleState;
}

export type Evidence = EvidenceInput;

export type SignalFreshness = "current" | "stale" | "expired" | "unknown";
export type SignalConflictState =
  "no_conflict" | "unresolved_conflict" | "resolved_by_rule";

export interface NewsSignalInput {
  readonly newsSignalId: NewsSignalId;
  readonly playerId: PlayerId;
  readonly state: ClaimedAvailability;
  readonly evaluatedAt: UtcInstant;
  readonly effectiveFrom: UtcInstant;
  readonly effectiveUntil?: UtcInstant;
  readonly confidenceBand: ClaimCertainty;
  readonly freshness: SignalFreshness;
  readonly conflictState: SignalConflictState;
  readonly claimRefs: readonly ClaimId[];
  readonly evidenceRefs: readonly EvidenceId[];
  readonly provenanceRefs: readonly ProvenanceId[];
  readonly ruleName: string;
  readonly ruleVersion: Version;
  readonly reasonCodes: readonly string[];
}

export type NewsSignal = NewsSignalInput;

export interface PlayerAvailabilityStateInput {
  readonly availabilityStateId: PlayerAvailabilityStateId;
  readonly playerId: PlayerId;
  readonly availability: ClaimedAvailability;
  readonly expectedStartProbability: number | null;
  readonly expectedMinutes: number | null;
  readonly evaluatedAt: UtcInstant;
  readonly effectiveFrom: UtcInstant;
  readonly effectiveUntil?: UtcInstant;
  readonly confidenceBand: ClaimCertainty;
  readonly freshness: SignalFreshness;
  readonly conflictState: SignalConflictState;
  readonly assumptionCodes: readonly string[];
  readonly signalRefs: readonly NewsSignalId[];
  readonly evidenceRefs: readonly EvidenceId[];
  readonly provenanceRefs: readonly ProvenanceId[];
  readonly ruleName: string;
  readonly ruleVersion: Version;
}

/** Projection-facing state; it intentionally contains no provider fields. */
export type PlayerAvailabilityState = PlayerAvailabilityStateInput;

export type NewsContractValidationCode =
  | "invalid_shape"
  | "invalid_value"
  | "empty_value"
  | "content_policy_violation"
  | "missing_provenance"
  | "time_invalid"
  | "lineage_missing";

export interface NewsContractValidationIssue {
  readonly code: NewsContractValidationCode;
  readonly path: string;
  readonly message: string;
}

export type ClaimCandidateValidationResult =
  | { readonly success: true; readonly value: UntrustedClaimCandidate }
  | {
      readonly success: false;
      readonly issues: readonly NewsContractValidationIssue[];
    };

export class NewsContractError extends Error {
  readonly code = "news_contract_invalid" as const;
  readonly issues: readonly NewsContractValidationIssue[];

  constructor(issues: readonly NewsContractValidationIssue[]) {
    super("News intelligence contract input is invalid.");
    this.name = "NewsContractError";
    this.issues = Object.freeze([...issues]);
  }
}
