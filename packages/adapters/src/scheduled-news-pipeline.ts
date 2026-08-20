import type { SourcePolicyId, UtcInstant } from "@fpl-intelligence/domain";
import type { NewsRuntimeEnvironment } from "./news-ingestion-contracts";
import { NewsIngestionError } from "./news-ingestion-errors";

export type ScheduledNewsFailureKind = "transient" | "permanent";

export interface ScheduledNewsPipelineRequest {
  readonly policyId: SourcePolicyId;
  readonly environment: NewsRuntimeEnvironment;
  readonly scheduledAt: UtcInstant;
  readonly runId: string;
}

export interface ScheduledNewsPipelineResult {
  readonly recordsStored: number;
  readonly recordsReused: number;
  readonly quarantinedCount: number;
  readonly nextCursor?: string;
}

export interface ScheduledNewsPipelinePort {
  run(
    request: ScheduledNewsPipelineRequest,
  ): Promise<ScheduledNewsPipelineResult>;
}

export interface ScheduledNewsPipelineSnapshot {
  readonly policyId: SourcePolicyId;
  readonly lastSuccessAt: UtcInstant | null;
  readonly lastFailureAt: UtcInstant | null;
  readonly nextEligibleAt: UtcInstant | null;
  readonly consecutiveFailures: number;
  readonly lastFailureKind: ScheduledNewsFailureKind | null;
  readonly recordsStored: number;
  readonly recordsReused: number;
  readonly quarantinedCount: number;
}

export interface ScheduledNewsPipelineOptions {
  readonly pipeline: ScheduledNewsPipelinePort;
  readonly clock: { now(): UtcInstant };
  readonly baseBackoffMs: number;
  readonly maximumBackoffMs: number;
}

function at(base: UtcInstant, offsetMs: number): UtcInstant {
  return new Date(Date.parse(base) + offsetMs).toISOString() as UtcInstant;
}

function classify(error: unknown): ScheduledNewsFailureKind {
  if (!(error instanceof NewsIngestionError)) return "transient";
  return error.code === "source_failure" ||
    error.code === "timeout" ||
    error.code === "rate_limited"
    ? "transient"
    : "permanent";
}

/** Provider-neutral orchestration state; a job runtime invokes `run` externally. */
export class ScheduledNewsPipeline {
  readonly #states = new Map<SourcePolicyId, ScheduledNewsPipelineSnapshot>();
  readonly #options: ScheduledNewsPipelineOptions;

  constructor(options: ScheduledNewsPipelineOptions) {
    if (
      !Number.isSafeInteger(options.baseBackoffMs) ||
      options.baseBackoffMs <= 0
    )
      throw new RangeError("Scheduled news base backoff must be positive.");
    if (
      !Number.isSafeInteger(options.maximumBackoffMs) ||
      options.maximumBackoffMs < options.baseBackoffMs
    )
      throw new RangeError(
        "Scheduled news maximum backoff must be at least the base backoff.",
      );
    this.#options = options;
  }

  snapshot(policyId: SourcePolicyId): ScheduledNewsPipelineSnapshot | null {
    return this.#states.get(policyId) ?? null;
  }

  async run(
    request: ScheduledNewsPipelineRequest,
  ): Promise<ScheduledNewsPipelineSnapshot> {
    const prior = this.#states.get(request.policyId);
    if (
      prior?.nextEligibleAt !== null &&
      prior?.nextEligibleAt !== undefined &&
      request.scheduledAt < prior.nextEligibleAt
    )
      return prior;
    try {
      const result = await this.#options.pipeline.run(request);
      const snapshot = Object.freeze({
        policyId: request.policyId,
        lastSuccessAt: this.#options.clock.now(),
        lastFailureAt: prior?.lastFailureAt ?? null,
        nextEligibleAt: null,
        consecutiveFailures: 0,
        lastFailureKind: null,
        recordsStored: result.recordsStored,
        recordsReused: result.recordsReused,
        quarantinedCount: result.quarantinedCount,
      });
      this.#states.set(request.policyId, snapshot);
      return snapshot;
    } catch (error) {
      const kind = classify(error);
      const failures = (prior?.consecutiveFailures ?? 0) + 1;
      const delay =
        kind === "transient"
          ? Math.min(
              this.#options.baseBackoffMs * 2 ** (failures - 1),
              this.#options.maximumBackoffMs,
            )
          : this.#options.maximumBackoffMs;
      const now = this.#options.clock.now();
      const snapshot = Object.freeze({
        policyId: request.policyId,
        lastSuccessAt: prior?.lastSuccessAt ?? null,
        lastFailureAt: now,
        nextEligibleAt: at(now, delay),
        consecutiveFailures: failures,
        lastFailureKind: kind,
        recordsStored: prior?.recordsStored ?? 0,
        recordsReused: prior?.recordsReused ?? 0,
        quarantinedCount: prior?.quarantinedCount ?? 0,
      });
      this.#states.set(request.policyId, snapshot);
      throw error;
    }
  }
}
