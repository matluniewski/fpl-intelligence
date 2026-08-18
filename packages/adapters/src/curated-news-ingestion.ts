import { createVersion } from "@fpl-intelligence/domain";
import type {
  RawNewsItemId,
  SourcePolicyId,
  UtcInstant,
} from "@fpl-intelligence/domain";
import type {
  CuratedNewsSourceAdapter,
  CuratedNewsSourcePolicy,
  FirstPartyRecordRights,
  NewsIngestionResult,
  NewsIngestionUsageRecorder,
  NewsLifecycleEvent,
  NewsRuntimeEnvironment,
  ProvenanceRecordStore,
  RawNewsItemStore,
  StoredRawNewsItem,
} from "./news-ingestion-contracts";
import {
  RESEARCH_NEWS_POLICY_ID,
  SYNTHETIC_NEWS_POLICY_ID,
} from "./news-ingestion-contracts";
import { NewsIngestionError } from "./news-ingestion-errors";

export interface CuratedNewsIngestionOptions {
  readonly policies: readonly CuratedNewsSourcePolicy[];
  readonly sources: readonly CuratedNewsSourceAdapter[];
  readonly store: RawNewsItemStore;
  readonly provenanceStore: ProvenanceRecordStore;
  readonly usageRecorder: NewsIngestionUsageRecorder;
  readonly eventIdFactory: () => string;
  readonly clock: { now(): UtcInstant };
  readonly researchRights?: readonly FirstPartyRecordRights[];
  readonly cacheTtlMs?: number;
  readonly timeoutMs?: number;
}

export interface CuratedNewsIngestionRequest {
  readonly policyId: SourcePolicyId;
  readonly environment: NewsRuntimeEnvironment;
  readonly requestedAt: UtcInstant;
  readonly ingestionRunId: string;
  readonly cursor?: string;
}

export class CuratedNewsIngestion {
  readonly #policies = new Map<SourcePolicyId, CuratedNewsSourcePolicy>();
  readonly #sources = new Map<SourcePolicyId, CuratedNewsSourceAdapter>();
  readonly #rights = new Map<RawNewsItemId, FirstPartyRecordRights>();
  readonly #options: CuratedNewsIngestionOptions;
  readonly #cache = new Map<
    string,
    Readonly<{ cachedAt: UtcInstant; result: NewsIngestionResult }>
  >();
  readonly #cacheTtlMs: number;
  readonly #timeoutMs: number;

  constructor(options: CuratedNewsIngestionOptions) {
    this.#options = options;
    this.#cacheTtlMs = options.cacheTtlMs ?? 60_000;
    this.#timeoutMs = options.timeoutMs ?? 10_000;
    if (!Number.isSafeInteger(this.#cacheTtlMs) || this.#cacheTtlMs <= 0)
      throw new RangeError("News ingestion cache TTL must be positive.");
    if (!Number.isSafeInteger(this.#timeoutMs) || this.#timeoutMs <= 0)
      throw new RangeError("News ingestion timeout must be positive.");
    for (const policy of options.policies) {
      if (
        policy.policyId !== SYNTHETIC_NEWS_POLICY_ID &&
        policy.policyId !== RESEARCH_NEWS_POLICY_ID
      )
        throw new RangeError("News source policy is not allowlisted.");
      if (this.#policies.has(policy.policyId))
        throw new RangeError("News source policy identifiers must be unique.");
      if (
        !Number.isSafeInteger(policy.maximumItemAgeMs) ||
        policy.maximumItemAgeMs <= 0 ||
        policy.reviewedAt > policy.expiresAt ||
        policy.contentPolicy.sourcePolicyId !== policy.policyId
      )
        throw new RangeError("News source policy configuration is invalid.");
      if (policy.contentPolicy.commercialUse !== policy.decision)
        throw new RangeError(
          "News policy decision must match its content policy.",
        );
      if (
        policy.policyId === SYNTHETIC_NEWS_POLICY_ID &&
        (policy.decision !== "permitted" ||
          policy.allowedEnvironments.some(
            (environment) =>
              environment !== "test" && environment !== "development",
          ))
      )
        throw new RangeError(
          "Synthetic news is limited to test and development.",
        );
      if (
        policy.policyId === RESEARCH_NEWS_POLICY_ID &&
        (policy.decision !== "restricted" ||
          policy.allowedEnvironments.some(
            (environment) =>
              environment !== "internal_research" &&
              environment !== "consented_pilot",
          ))
      )
        throw new RangeError(
          "Research news requires restricted research or pilot policy.",
        );
      this.#policies.set(
        policy.policyId,
        Object.freeze({
          ...policy,
          allowedEnvironments: Object.freeze([...policy.allowedEnvironments]),
        }),
      );
    }
    for (const source of options.sources) {
      if (!this.#policies.has(source.policyId))
        throw new RangeError("News source has no reviewed policy.");
      if (this.#sources.has(source.policyId))
        throw new RangeError("News source adapters must be unique per policy.");
      this.#sources.set(source.policyId, source);
    }
    for (const rights of options.researchRights ?? []) {
      if (this.#rights.has(rights.rawNewsItemId))
        throw new RangeError(
          "Research rights records must be unique per item.",
        );
      if (
        rights.rightsReference.trim().length === 0 ||
        rights.commercialUse === "unclear" ||
        rights.commercialUse === "not_reviewed" ||
        rights.retention === "not_reviewed" ||
        rights.display === "not_reviewed" ||
        rights.externalProcessing === "not_reviewed"
      )
        throw new RangeError(
          "Research rights record is not operationally complete.",
        );
      this.#rights.set(rights.rawNewsItemId, Object.freeze({ ...rights }));
    }
  }

  async ingest(
    request: CuratedNewsIngestionRequest,
  ): Promise<NewsIngestionResult> {
    const eventId = this.#nonEmpty(
      this.#options.eventIdFactory(),
      "Usage event identifier",
    );
    const runId = this.#nonEmpty(
      request.ingestionRunId,
      "Ingestion run identifier",
    );
    const policy = this.#authorize(request);
    const cacheKey = `${request.policyId}:${request.environment}:${request.cursor ?? "start"}`;
    const cached = this.#cache.get(cacheKey);
    const cacheAgeMs =
      cached === undefined
        ? Number.POSITIVE_INFINITY
        : Date.parse(request.requestedAt) - Date.parse(cached.cachedAt);
    if (
      cached !== undefined &&
      cacheAgeMs >= 0 &&
      cacheAgeMs <= this.#cacheTtlMs
    ) {
      const telemetryRecorded = await this.#recordUsage(
        eventId,
        runId,
        request.requestedAt,
        policy.policyId,
        "succeeded",
        0,
        0,
        cached.result.items.length,
        true,
      );
      return Object.freeze({
        ...cached.result,
        storedCount: 0,
        reusedCount: cached.result.items.length,
        warnings: Object.freeze(
          telemetryRecorded ? [] : ["usage_telemetry_unavailable"],
        ),
      });
    }
    const source = this.#sources.get(request.policyId);
    if (source === undefined)
      throw new NewsIngestionError(
        "source_disabled",
        "Approved source adapter is unavailable.",
        { policyId: request.policyId },
      );

    try {
      const batch = await this.#readWithTimeout(source, request);
      const records: StoredRawNewsItem[] = [];
      let storedCount = 0;
      let reusedCount = 0;
      for (const sourceRecord of batch.items) {
        const { item, provenance } = sourceRecord;
        this.#assertItemPolicy(
          item.contentPolicy?.sourcePolicyId,
          policy.policyId,
        );
        if (policy.policyId === RESEARCH_NEWS_POLICY_ID)
          this.#authorizeResearchItem(
            item.rawNewsItemId,
            request.environment,
            request.requestedAt,
            provenance.acquisition.ingestionReference,
          );
        const existing = await this.#options.store.getByIngestionKey(
          item.ingestionKey,
        );
        if (existing !== null) {
          records.push(existing);
          reusedCount += 1;
          continue;
        }
        const isStale =
          item.publishedAt !== undefined &&
          Date.parse(request.requestedAt) - Date.parse(item.publishedAt) >
            policy.maximumItemAgeMs;
        const record = Object.freeze({
          item,
          lifecycleState: isStale ? ("stale" as const) : ("active" as const),
          lifecycleEvaluatedAt: request.requestedAt,
        });
        await this.#options.provenanceStore.save(provenance);
        await this.#options.store.save(record);
        records.push(record);
        storedCount += 1;
      }
      const telemetryRecorded = await this.#recordUsage(
        eventId,
        runId,
        request.requestedAt,
        policy.policyId,
        "succeeded",
        batch.items.length,
        storedCount,
        reusedCount,
        false,
      );
      const result = Object.freeze({
        items: Object.freeze(records),
        storedCount,
        reusedCount,
        liveCoverage: false,
        ...(batch.nextCursor === undefined
          ? {}
          : { nextCursor: batch.nextCursor }),
        warnings: Object.freeze(
          telemetryRecorded ? [] : ["usage_telemetry_unavailable"],
        ),
      });
      this.#cache.set(
        cacheKey,
        Object.freeze({ cachedAt: request.requestedAt, result }),
      );
      return result;
    } catch (error) {
      const normalized =
        error instanceof NewsIngestionError
          ? error
          : new NewsIngestionError(
              "source_failure",
              "Curated news source failed.",
              {},
              { cause: error },
            );
      const telemetryRecorded = await this.#recordUsage(
        eventId,
        runId,
        request.requestedAt,
        policy.policyId,
        normalized.code === "rate_limited"
          ? "rate_limited"
          : normalized.code === "quota_rejected"
            ? "quota_rejected"
            : normalized.code === "timeout"
              ? "cancelled"
              : "failed",
        0,
        0,
        0,
        false,
      );
      if (!telemetryRecorded) {
        throw new NewsIngestionError(
          normalized.code,
          normalized.message,
          { ...normalized.details, usageTelemetry: "unavailable" },
          { cause: normalized },
        );
      }
      throw normalized;
    }
  }

  async applyLifecycle(event: NewsLifecycleEvent): Promise<StoredRawNewsItem> {
    const current = await this.#options.store.getById(event.rawNewsItemId);
    if (current === null)
      throw new NewsIngestionError(
        "source_failure",
        "Lifecycle target is unavailable.",
      );
    const updated = Object.freeze({
      ...current,
      lifecycleState: event.kind,
      lifecycleEvaluatedAt: event.occurredAt,
      ...(event.kind === "corrected"
        ? {
            correctionReference: this.#nonEmpty(
              event.correctionReference,
              "Correction reference",
            ),
          }
        : {}),
    });
    await this.#options.store.save(updated);
    this.#cache.clear();
    return updated;
  }

  authorizeExternalProcessing(
    id: RawNewsItemId,
    at: UtcInstant,
  ): Promise<boolean> {
    return this.#options.store.getById(id).then((record) => {
      if (record === null || record.lifecycleState !== "active") return false;
      const decision = record.item.contentPolicy?.externalProcessing;
      if (decision !== "permitted" && decision !== "restricted") return false;
      const rights = this.#rights.get(id);
      return (
        record.item.contentPolicy?.sourcePolicyId !== RESEARCH_NEWS_POLICY_ID ||
        (rights !== undefined &&
          rights.expiresAt >= at &&
          (rights.externalProcessing === "permitted" ||
            rights.externalProcessing === "restricted"))
      );
    });
  }

  setKillSwitch(policyId: SourcePolicyId, active: boolean): void {
    const policy = this.#policies.get(policyId);
    if (policy === undefined)
      throw new NewsIngestionError(
        "policy_unknown",
        "Cannot update an unknown news policy.",
      );
    this.#policies.set(
      policyId,
      Object.freeze({ ...policy, killSwitchActive: active }),
    );
    this.#cache.clear();
  }

  async #readWithTimeout(
    source: CuratedNewsSourceAdapter,
    request: CuratedNewsIngestionRequest,
  ) {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(
          new NewsIngestionError("timeout", "Curated news source timed out."),
        );
      }, this.#timeoutMs);
    });
    try {
      return await Promise.race([
        source.read({
          requestedAt: request.requestedAt,
          environment: request.environment,
          signal: controller.signal,
          ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
        }),
        timeoutPromise,
      ]);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  #authorize(request: CuratedNewsIngestionRequest): CuratedNewsSourcePolicy {
    if (
      request.policyId !== SYNTHETIC_NEWS_POLICY_ID &&
      request.policyId !== RESEARCH_NEWS_POLICY_ID
    )
      throw new NewsIngestionError(
        "policy_unknown",
        "News source policy is not allowlisted.",
      );
    const policy = this.#policies.get(request.policyId);
    if (policy === undefined)
      throw new NewsIngestionError(
        "policy_unknown",
        "News source policy is unavailable.",
      );
    if (!policy.enabled)
      throw new NewsIngestionError(
        "source_disabled",
        "News source is disabled.",
      );
    if (policy.killSwitchActive)
      throw new NewsIngestionError(
        "kill_switch_active",
        "News source kill switch is active.",
      );
    if (policy.expiresAt < request.requestedAt)
      throw new NewsIngestionError(
        "policy_expired",
        "News source policy has expired.",
      );
    if (policy.reviewedAt > request.requestedAt)
      throw new NewsIngestionError(
        "policy_unknown",
        "News source policy is not yet effective.",
      );
    if (!policy.allowedEnvironments.includes(request.environment))
      throw new NewsIngestionError(
        "environment_denied",
        "News source is not approved for this environment.",
      );
    return policy;
  }

  #authorizeResearchItem(
    id: RawNewsItemId,
    environment: NewsRuntimeEnvironment,
    at: UtcInstant,
    sourceRightsReference: string | undefined,
  ): void {
    const rights = this.#rights.get(id);
    if (
      rights === undefined ||
      rights.environment !== environment ||
      rights.expiresAt < at ||
      rights.rightsReference !== sourceRightsReference
    )
      throw new NewsIngestionError(
        "rights_missing",
        "Research item lacks current per-record rights.",
      );
  }

  #assertItemPolicy(
    actual: SourcePolicyId | undefined,
    expected: SourcePolicyId,
  ): void {
    if (actual !== expected)
      throw new NewsIngestionError(
        "policy_unknown",
        "Normalized item policy does not match the enabled source.",
      );
  }

  #nonEmpty(value: string, label: string): string {
    const normalized = value.trim();
    if (normalized.length === 0)
      throw new RangeError(`${label} must not be empty.`);
    return normalized;
  }

  async #recordUsage(
    eventId: string,
    runId: string,
    occurredAt: UtcInstant,
    providerRef: string,
    outcome:
      "cancelled" | "failed" | "quota_rejected" | "rate_limited" | "succeeded",
    returned: number,
    stored: number,
    reused: number,
    avoided: boolean,
  ): Promise<boolean> {
    try {
      await this.#options.usageRecorder.record(
        Object.freeze({
          eventId,
          idempotencyKey: eventId,
          occurredAt,
          recordedAt: this.#options.clock.now(),
          serviceCategory: "news",
          operation: avoided ? "news.ingest.avoided" : "news.ingest",
          providerRef,
          outcome,
          requestCount: avoided ? 0 : 1,
          avoidedRequestCount: avoided ? 1 : 0,
          ...(avoided ? { avoidanceReason: "cache_hit" as const } : {}),
          recordsReturned: returned,
          recordsStored: stored,
          recordsReused: reused,
          attribution: Object.freeze({ scope: "shared_global" }),
          correlation: Object.freeze({ ingestionRunId: runId }),
          estimateStatus: "unknown",
          instrumentationVersion: createVersion("news-ingestion-usage-v1"),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
