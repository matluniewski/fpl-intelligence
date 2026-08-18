import type {
  ProviderId,
  ProvenanceId,
  SourceId,
  SourcePolicyId,
} from "./identifiers";
import type { UtcInstant, Version } from "./primitives";

export type DataCategory =
  | "fpl_game_state"
  | "football_fact"
  | "identity_reference"
  | "news_content"
  | "structured_evidence"
  | "user_authorized_import"
  | "other_reviewed_external_data";

export type CommercialUseClassification =
  "permitted" | "restricted" | "unclear" | "not_reviewed";

export type ProvenanceLifecycleState =
  | "active"
  | "stale"
  | "expired"
  | "corrected"
  | "withdrawn"
  | "deleted"
  | "inaccessible"
  | "quarantined"
  | "policy_disabled";

export interface SourceReference {
  readonly sourceId: SourceId;
  readonly role: "origin" | "publisher" | "intermediary";
}

export interface ProviderReference {
  readonly providerId: ProviderId;
  readonly product: string;
  readonly accessPath: string;
}

export interface ExternalReference {
  readonly namespace: string;
  readonly externalId: string;
}

export interface SourcePolicyAssessment {
  readonly sourcePolicyId: SourcePolicyId;
  readonly policyVersion: Version;
  readonly commercialUse: CommercialUseClassification;
}

export interface AcquisitionFacts {
  readonly fetchedAt: UtcInstant;
  readonly publishedAt?: UtcInstant;
  readonly observedAt?: UtcInstant;
  readonly effectiveAt?: UtcInstant;
  readonly updatedAt?: UtcInstant;
  readonly ingestionReference?: string;
  readonly environment: "test" | "development" | "production";
  readonly purpose: string;
}

export interface MappingFacts {
  readonly adapter: string;
  readonly adapterVersion: Version;
  readonly providerSchemaVersion?: Version;
  readonly normalizationVersion: Version;
  readonly warnings: readonly string[];
}

export interface ProvenanceLifecycle {
  readonly state: ProvenanceLifecycleState;
  readonly evaluatedAt: UtcInstant;
  readonly ruleVersion: Version;
  readonly effectiveFrom?: UtcInstant;
  readonly effectiveUntil?: UtcInstant;
  readonly supersededBy?: ProvenanceId;
}

export interface ProvenanceRecord {
  readonly provenanceId: ProvenanceId;
  readonly dataCategory: DataCategory;
  readonly sourceChain: readonly SourceReference[];
  readonly provider: ProviderReference;
  readonly acquisition: AcquisitionFacts;
  readonly externalReference?: ExternalReference;
  readonly policyAssessment: SourcePolicyAssessment;
  readonly mapping: MappingFacts;
  readonly lifecycle: ProvenanceLifecycle;
}

export type ProvenanceRecordInput = Omit<
  ProvenanceRecord,
  "policyAssessment" | "sourceChain" | "mapping"
> & {
  readonly sourceChain: readonly SourceReference[];
  readonly policyAssessment: Omit<SourcePolicyAssessment, "commercialUse"> & {
    readonly commercialUse?: CommercialUseClassification;
  };
  readonly mapping: Omit<MappingFacts, "warnings"> & {
    readonly warnings?: readonly string[];
  };
};

export function createProvenanceRecord(
  input: ProvenanceRecordInput,
): ProvenanceRecord {
  if (input.sourceChain.length === 0) {
    throw new RangeError("Provenance must retain at least one source.");
  }

  if (input.provider.product.trim().length === 0) {
    throw new RangeError("Provider product must not be empty.");
  }

  if (input.provider.accessPath.trim().length === 0) {
    throw new RangeError("Provider access path must not be empty.");
  }

  if (input.acquisition.purpose.trim().length === 0) {
    throw new RangeError("Acquisition purpose must not be empty.");
  }

  return Object.freeze({
    ...input,
    sourceChain: Object.freeze([...input.sourceChain]),
    policyAssessment: Object.freeze({
      ...input.policyAssessment,
      commercialUse: input.policyAssessment.commercialUse ?? "not_reviewed",
    }),
    mapping: Object.freeze({
      ...input.mapping,
      warnings: Object.freeze([...(input.mapping.warnings ?? [])]),
    }),
  });
}

export function isCommercialUseBlocked(
  assessment: SourcePolicyAssessment,
): boolean {
  return (
    assessment.commercialUse !== "permitted" &&
    assessment.commercialUse !== "restricted"
  );
}

export interface BoundaryResult<TNormalized> {
  readonly value: TNormalized;
  readonly provenanceRefs: readonly ProvenanceId[];
  readonly sourcePolicyId: SourcePolicyId;
  readonly freshness: "current" | "stale" | "unknown";
  readonly warnings: readonly string[];
}
