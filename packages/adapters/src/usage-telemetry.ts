import type {
  ProvenanceId,
  UtcInstant,
  Version,
} from "@fpl-intelligence/domain";

export type UsageOutcome =
  "cancelled" | "failed" | "quota_rejected" | "rate_limited" | "succeeded";

export interface UsageMeasurement {
  readonly metric: "records_returned" | "request_count";
  readonly quantity: number;
  readonly unit: "record" | "request";
  readonly measurementStatus: "measured";
}

export interface ReferenceDataUsageEvent {
  readonly eventId: string;
  readonly idempotencyKey: string;
  readonly occurredAt: UtcInstant;
  readonly recordedAt: UtcInstant;
  readonly serviceCategory: "football_data";
  readonly providerRef: string;
  readonly operation: "reference_data.load";
  readonly measurements: readonly UsageMeasurement[];
  readonly outcome: UsageOutcome;
  readonly attribution: Readonly<{ scope: "shared_global" }>;
  readonly correlation: Readonly<{ requestId: string }>;
  readonly provenanceRef?: ProvenanceId;
  readonly estimateMetadata: Readonly<{
    status: "not_applicable" | "unknown";
  }>;
  readonly instrumentationVersion: Version;
}

export interface UsageRecorder {
  record(event: ReferenceDataUsageEvent): Promise<void>;
}
