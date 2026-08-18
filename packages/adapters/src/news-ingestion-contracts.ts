import type {
  CommercialUseClassification,
  NewsContentPolicy,
  PermissionDecision,
  ProvenanceId,
  ProvenanceRecord,
  ProvenanceLifecycleState,
  RawNewsItem,
  RawNewsItemId,
  SourcePolicyId,
  UtcInstant,
  Version,
} from "@fpl-intelligence/domain";

export const SYNTHETIC_NEWS_POLICY_ID = "news.synthetic.fixture.v1";
export const RESEARCH_NEWS_POLICY_ID = "news.first-party.research.v1";

export type NewsRuntimeEnvironment =
  | "test"
  | "development"
  | "internal_research"
  | "consented_pilot"
  | "production";

export interface CuratedNewsSourcePolicy {
  readonly policyId: SourcePolicyId;
  readonly decision: "permitted" | "restricted";
  readonly enabled: boolean;
  readonly killSwitchActive: boolean;
  readonly allowedEnvironments: readonly NewsRuntimeEnvironment[];
  readonly reviewedAt: UtcInstant;
  readonly expiresAt: UtcInstant;
  readonly termsVersion: Version;
  readonly maximumItemAgeMs: number;
  readonly contentPolicy: NewsContentPolicy;
  readonly liveThirdPartySource: false;
}

export interface FirstPartyRecordRights {
  readonly rawNewsItemId: RawNewsItemId;
  readonly rightsReference: string;
  readonly environment: "internal_research" | "consented_pilot";
  readonly expiresAt: UtcInstant;
  readonly commercialUse: CommercialUseClassification;
  readonly retention: PermissionDecision;
  readonly display: PermissionDecision;
  readonly externalProcessing: PermissionDecision;
}

export interface NewsSourceReadRequest {
  readonly requestedAt: UtcInstant;
  readonly environment: NewsRuntimeEnvironment;
  readonly cursor?: string;
  readonly signal: AbortSignal;
}

export interface NewsSourceReadResult {
  readonly items: readonly Readonly<{
    item: RawNewsItem;
    provenance: ProvenanceRecord;
  }>[];
  readonly nextCursor?: string;
  readonly complete: boolean;
}

export interface CuratedNewsSourceAdapter {
  readonly policyId: SourcePolicyId;
  read(request: NewsSourceReadRequest): Promise<NewsSourceReadResult>;
}

export interface StoredRawNewsItem {
  readonly item: RawNewsItem;
  readonly lifecycleState: ProvenanceLifecycleState;
  readonly lifecycleEvaluatedAt: UtcInstant;
  readonly correctionReference?: string;
}

export interface RawNewsItemStore {
  getByIngestionKey(key: string): Promise<StoredRawNewsItem | null>;
  getById(id: RawNewsItemId): Promise<StoredRawNewsItem | null>;
  save(record: StoredRawNewsItem): Promise<void>;
}

export interface ProvenanceRecordStore {
  getById(id: ProvenanceId): Promise<ProvenanceRecord | null>;
  save(record: ProvenanceRecord): Promise<void>;
}

export interface NewsIngestionUsageEvent {
  readonly eventId: string;
  readonly idempotencyKey: string;
  readonly occurredAt: UtcInstant;
  readonly recordedAt: UtcInstant;
  readonly serviceCategory: "news";
  readonly operation: "news.ingest" | "news.ingest.avoided";
  readonly providerRef: string;
  readonly outcome:
    "cancelled" | "failed" | "quota_rejected" | "rate_limited" | "succeeded";
  readonly requestCount: 0 | 1;
  readonly avoidedRequestCount: 0 | 1;
  readonly avoidanceReason?: "cache_hit";
  readonly recordsReturned: number;
  readonly recordsStored: number;
  readonly recordsReused: number;
  readonly attribution: Readonly<{ scope: "shared_global" }>;
  readonly correlation: Readonly<{ ingestionRunId: string }>;
  readonly estimateStatus: "not_applicable" | "unknown";
  readonly instrumentationVersion: Version;
}

export interface NewsIngestionUsageRecorder {
  record(event: NewsIngestionUsageEvent): Promise<void>;
}

export interface NewsIngestionResult {
  readonly items: readonly StoredRawNewsItem[];
  readonly storedCount: number;
  readonly reusedCount: number;
  readonly liveCoverage: false;
  readonly nextCursor?: string;
  readonly warnings: readonly string[];
}

export type NewsLifecycleEvent =
  | {
      readonly kind: "corrected";
      readonly rawNewsItemId: RawNewsItemId;
      readonly occurredAt: UtcInstant;
      readonly correctionReference: string;
    }
  | {
      readonly kind: "deleted" | "expired" | "withdrawn" | "policy_disabled";
      readonly rawNewsItemId: RawNewsItemId;
      readonly occurredAt: UtcInstant;
    };
