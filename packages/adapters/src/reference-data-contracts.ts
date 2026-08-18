import type {
  BoundaryResult,
  CommercialUseClassification,
  ProvenanceRecord,
  ReferenceDataSnapshot,
} from "@fpl-intelligence/domain";

export interface ReferenceDataAdapterResult extends BoundaryResult<ReferenceDataSnapshot> {
  readonly provenanceRecords: readonly ProvenanceRecord[];
}

export interface ReferenceDataSourcePolicy {
  readonly accessPath: string;
  readonly commercialUse: CommercialUseClassification;
  readonly environment: "development" | "production" | "test";
  readonly freshness: "current" | "stale" | "unknown";
  readonly policyVersion: string;
  readonly providerId: string;
  readonly providerProduct: string;
  readonly sourceId: string;
  readonly sourcePolicyId: string;
}

export interface ReferenceDataIdentityMap {
  readonly fixtures: Readonly<Record<string, string>>;
  readonly players: Readonly<Record<string, string>>;
  readonly rulesets: Readonly<Record<string, string>>;
  readonly season: Readonly<{
    externalId: string;
    internalId: string;
  }>;
  readonly teams: Readonly<Record<string, string>>;
}
