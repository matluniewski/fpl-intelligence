import {
  createRawNewsItemId,
  createSourcePolicyId,
  createUtcInstant,
  createVersion,
} from "@fpl-intelligence/domain";
import { describe, expect, it } from "vitest";
import { CuratedNewsIngestion } from "./curated-news-ingestion";
import { FirstPartyResearchNewsSourceAdapter } from "./first-party-research-news-source-adapter";
import {
  InMemoryProvenanceRecordStore,
  InMemoryRawNewsItemStore,
} from "./in-memory-news-store";
import type {
  CuratedNewsSourcePolicy,
  NewsIngestionUsageEvent,
  NewsIngestionUsageRecorder,
  CuratedNewsSourceAdapter,
} from "./news-ingestion-contracts";
import { NewsIngestionError } from "./news-ingestion-errors";
import { SyntheticNewsSourceAdapter } from "./synthetic-news-source-adapter";

const NOW = createUtcInstant("2026-08-18T20:00:00Z");
const POLICY_ID = createSourcePolicyId("news.synthetic.fixture.v1");
const CONTENT_POLICY = Object.freeze({
  sourcePolicyId: POLICY_ID,
  policyVersion: createVersion("1"),
  commercialUse: "permitted" as const,
  retention: "permitted" as const,
  display: "permitted" as const,
  externalProcessing: "permitted" as const,
});
const POLICY: CuratedNewsSourcePolicy = Object.freeze({
  policyId: POLICY_ID,
  decision: "permitted",
  enabled: true,
  killSwitchActive: false,
  allowedEnvironments: Object.freeze(["test", "development"] as const),
  reviewedAt: NOW,
  expiresAt: createUtcInstant("2027-01-01T00:00:00Z"),
  termsVersion: createVersion("1"),
  maximumItemAgeMs: 86_400_000,
  contentPolicy: CONTENT_POLICY,
  liveThirdPartySource: false,
});
const PAYLOAD = Object.freeze({
  schema_version: "synthetic-news-v1",
  items: Object.freeze([
    Object.freeze({
      external_id: "fixture-1",
      published_at: "2026-08-18T19:00:00Z",
      synthetic_summary_code: "synthetic_player_training_update",
    }),
  ]),
});

class Recorder implements NewsIngestionUsageRecorder {
  readonly events: NewsIngestionUsageEvent[] = [];
  async record(event: NewsIngestionUsageEvent): Promise<void> {
    this.events.push(event);
  }
}

function setup(policy: CuratedNewsSourcePolicy = POLICY) {
  const recorder = new Recorder();
  const store = new InMemoryRawNewsItemStore();
  const provenanceStore = new InMemoryProvenanceRecordStore();
  const ingestion = new CuratedNewsIngestion({
    policies: [policy],
    sources: [new SyntheticNewsSourceAdapter(PAYLOAD, CONTENT_POLICY)],
    store,
    provenanceStore,
    usageRecorder: recorder,
    eventIdFactory: () => "synthetic-usage-event",
    clock: { now: () => NOW },
  });
  return { ingestion, provenanceStore, recorder, store };
}

const REQUEST = Object.freeze({
  policyId: POLICY_ID,
  environment: "test" as const,
  requestedAt: NOW,
  ingestionRunId: "synthetic-run",
});

describe("curated news ingestion", () => {
  it("ingests project-authored synthetic data without a live call", async () => {
    const { ingestion, provenanceStore, recorder } = setup();
    const result = await ingestion.ingest(REQUEST);
    expect(result).toMatchObject({
      storedCount: 1,
      reusedCount: 0,
      liveCoverage: false,
    });
    expect(result.items[0]!.item.policyState).toBe("permitted");
    expect(
      await provenanceStore.getById(result.items[0]!.item.provenanceRefs[0]!),
    ).not.toBeNull();
    expect(recorder.events[0]).toMatchObject({
      serviceCategory: "news",
      recordsStored: 1,
      attribution: { scope: "shared_global" },
    });
    expect(JSON.stringify(recorder.events[0])).not.toContain(
      "synthetic_player_training_update",
    );
  });

  it("reuses central ingestion results deterministically", async () => {
    const { ingestion, recorder } = setup();
    await ingestion.ingest(REQUEST);
    const repeated = await ingestion.ingest(REQUEST);
    expect(repeated).toMatchObject({ storedCount: 0, reusedCount: 1 });
    expect(recorder.events[1]).toMatchObject({
      operation: "news.ingest.avoided",
      requestCount: 0,
      avoidedRequestCount: 1,
      avoidanceReason: "cache_hit",
    });
  });

  it("uses the central cache without reading the source again", async () => {
    let reads = 0;
    const delegate = new SyntheticNewsSourceAdapter(PAYLOAD, CONTENT_POLICY);
    const source: CuratedNewsSourceAdapter = {
      policyId: POLICY_ID,
      read: async (request) => {
        reads += 1;
        return delegate.read(request);
      },
    };
    const recorder = new Recorder();
    const ingestion = new CuratedNewsIngestion({
      policies: [POLICY],
      sources: [source],
      store: new InMemoryRawNewsItemStore(),
      provenanceStore: new InMemoryProvenanceRecordStore(),
      usageRecorder: recorder,
      eventIdFactory: () => `event-${recorder.events.length}`,
      clock: { now: () => NOW },
    });
    await ingestion.ingest(REQUEST);
    await ingestion.ingest(REQUEST);
    expect(reads).toBe(1);
  });

  it("fails closed for unknown policies without fallback", async () => {
    const { ingestion, recorder } = setup();
    await expect(
      ingestion.ingest({
        ...REQUEST,
        policyId: createSourcePolicyId("news.unknown"),
      }),
    ).rejects.toMatchObject({ code: "policy_unknown" });
    expect(recorder.events).toHaveLength(0);
  });

  it("enforces kill switches and approved environments", async () => {
    const { ingestion } = setup({ ...POLICY, killSwitchActive: true });
    await expect(ingestion.ingest(REQUEST)).rejects.toMatchObject({
      code: "kill_switch_active",
    });
    const environment = setup();
    await expect(
      environment.ingestion.ingest({ ...REQUEST, environment: "production" }),
    ).rejects.toMatchObject({ code: "environment_denied" });
  });

  it("rejects expired policies", async () => {
    const { ingestion } = setup({
      ...POLICY,
      reviewedAt: createUtcInstant("2026-08-01T00:00:00Z"),
      expiresAt: createUtcInstant("2026-08-18T19:59:59Z"),
    });
    await expect(ingestion.ingest(REQUEST)).rejects.toMatchObject({
      code: "policy_expired",
    });
  });

  it("marks over-age records stale", async () => {
    const { ingestion } = setup({ ...POLICY, maximumItemAgeMs: 1_000 });
    const result = await ingestion.ingest(REQUEST);
    expect(result.items[0]!.lifecycleState).toBe("stale");
    expect(
      await ingestion.authorizeExternalProcessing(
        result.items[0]!.item.rawNewsItemId,
        NOW,
      ),
    ).toBe(false);
  });

  it("propagates lifecycle changes and blocks later processing", async () => {
    const { ingestion } = setup();
    const result = await ingestion.ingest(REQUEST);
    const id = result.items[0]!.item.rawNewsItemId;
    expect(await ingestion.authorizeExternalProcessing(id, NOW)).toBe(true);
    const updated = await ingestion.applyLifecycle({
      kind: "deleted",
      rawNewsItemId: id,
      occurredAt: NOW,
    });
    expect(updated.lifecycleState).toBe("deleted");
    expect(await ingestion.authorizeExternalProcessing(id, NOW)).toBe(false);
  });

  it("runtime-validates provider-private synthetic DTOs", async () => {
    const invalid = new SyntheticNewsSourceAdapter(
      { schema_version: "unknown", items: [] },
      CONTENT_POLICY,
    );
    const source = setup();
    const ingestion = new CuratedNewsIngestion({
      policies: [POLICY],
      sources: [invalid],
      store: source.store,
      provenanceStore: source.provenanceStore,
      usageRecorder: source.recorder,
      eventIdFactory: () => "event",
      clock: { now: () => NOW },
    });
    await expect(ingestion.ingest(REQUEST)).rejects.toBeInstanceOf(
      NewsIngestionError,
    );
    expect(source.recorder.events[0]!.outcome).toBe("failed");
  });

  it("preserves rate-limit outcomes and never falls back", async () => {
    const base = setup();
    const failing: CuratedNewsSourceAdapter = {
      policyId: POLICY_ID,
      read: async () => {
        throw new NewsIngestionError("rate_limited", "Synthetic limit.");
      },
    };
    const ingestion = new CuratedNewsIngestion({
      policies: [POLICY],
      sources: [failing],
      store: base.store,
      provenanceStore: base.provenanceStore,
      usageRecorder: base.recorder,
      eventIdFactory: () => "rate-event",
      clock: { now: () => NOW },
    });
    await expect(ingestion.ingest(REQUEST)).rejects.toMatchObject({
      code: "rate_limited",
    });
    expect(base.recorder.events).toHaveLength(1);
    expect(base.recorder.events[0]!.outcome).toBe("rate_limited");
  });

  it("keeps first-party research disabled by default", async () => {
    const researchPolicyId = createSourcePolicyId(
      "news.first-party.research.v1",
    );
    const researchContentPolicy = {
      ...CONTENT_POLICY,
      sourcePolicyId: researchPolicyId,
      commercialUse: "restricted" as const,
      retention: "blocked" as const,
      display: "blocked" as const,
      externalProcessing: "blocked" as const,
    };
    const adapter = new FirstPartyResearchNewsSourceAdapter({
      records: [],
      contentPolicy: researchContentPolicy,
    });
    await expect(
      adapter.read({
        requestedAt: NOW,
        environment: "internal_research",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "source_disabled" });
  });

  it("requires matching per-record rights for enabled research", async () => {
    const researchPolicyId = createSourcePolicyId(
      "news.first-party.research.v1",
    );
    const researchContentPolicy = {
      ...CONTENT_POLICY,
      sourcePolicyId: researchPolicyId,
      commercialUse: "restricted" as const,
      retention: "blocked" as const,
      display: "blocked" as const,
      externalProcessing: "blocked" as const,
    };
    const rawNewsItemId = createRawNewsItemId("research:record-1");
    const adapter = new FirstPartyResearchNewsSourceAdapter({
      enabled: true,
      contentPolicy: researchContentPolicy,
      records: [
        {
          externalId: "record-1",
          publishedAt: NOW,
          summaryCode: "synthetic_research_record",
          rightsReference: "synthetic-rights-1",
          rightsExpiresAt: createUtcInstant("2027-01-01T00:00:00Z"),
          approvedEnvironment: "internal_research",
        },
      ],
    });
    const researchPolicy: CuratedNewsSourcePolicy = {
      ...POLICY,
      policyId: researchPolicyId,
      decision: "restricted",
      allowedEnvironments: ["internal_research"],
      contentPolicy: researchContentPolicy,
    };
    const base = setup();
    const withoutRights = new CuratedNewsIngestion({
      policies: [researchPolicy],
      sources: [adapter],
      store: base.store,
      provenanceStore: base.provenanceStore,
      usageRecorder: base.recorder,
      eventIdFactory: () => "research-event",
      clock: { now: () => NOW },
    });
    const request = {
      ...REQUEST,
      policyId: researchPolicyId,
      environment: "internal_research" as const,
    };
    await expect(withoutRights.ingest(request)).rejects.toMatchObject({
      code: "rights_missing",
    });

    const withRights = new CuratedNewsIngestion({
      policies: [researchPolicy],
      sources: [adapter],
      store: new InMemoryRawNewsItemStore(),
      provenanceStore: new InMemoryProvenanceRecordStore(),
      usageRecorder: new Recorder(),
      eventIdFactory: () => "research-event-2",
      clock: { now: () => NOW },
      researchRights: [
        {
          rawNewsItemId,
          rightsReference: "synthetic-rights-1",
          environment: "internal_research",
          expiresAt: createUtcInstant("2027-01-01T00:00:00Z"),
          commercialUse: "restricted",
          retention: "blocked",
          display: "blocked",
          externalProcessing: "blocked",
        },
      ],
    });
    await expect(withRights.ingest(request)).resolves.toMatchObject({
      storedCount: 1,
      liveCoverage: false,
    });
    expect(
      await withRights.authorizeExternalProcessing(rawNewsItemId, NOW),
    ).toBe(false);
  });

  it("rejects research records whose runtime rights reference does not match the source record", async () => {
    const researchPolicyId = createSourcePolicyId(
      "news.first-party.research.v1",
    );
    const researchContentPolicy = {
      ...CONTENT_POLICY,
      sourcePolicyId: researchPolicyId,
      commercialUse: "restricted" as const,
      retention: "blocked" as const,
      display: "blocked" as const,
      externalProcessing: "blocked" as const,
    };
    const rawNewsItemId = createRawNewsItemId("research:record-1");
    const ingestion = new CuratedNewsIngestion({
      policies: [
        {
          ...POLICY,
          policyId: researchPolicyId,
          decision: "restricted",
          allowedEnvironments: ["internal_research"],
          contentPolicy: researchContentPolicy,
        },
      ],
      sources: [
        new FirstPartyResearchNewsSourceAdapter({
          enabled: true,
          contentPolicy: researchContentPolicy,
          records: [
            {
              externalId: "record-1",
              publishedAt: NOW,
              summaryCode: "synthetic_research_record",
              rightsReference: "source-rights",
              rightsExpiresAt: createUtcInstant("2027-01-01T00:00:00Z"),
              approvedEnvironment: "internal_research",
            },
          ],
        }),
      ],
      store: new InMemoryRawNewsItemStore(),
      provenanceStore: new InMemoryProvenanceRecordStore(),
      usageRecorder: new Recorder(),
      eventIdFactory: () => "mismatched-rights-event",
      clock: { now: () => NOW },
      researchRights: [
        {
          rawNewsItemId,
          rightsReference: "different-rights",
          environment: "internal_research",
          expiresAt: createUtcInstant("2027-01-01T00:00:00Z"),
          commercialUse: "restricted",
          retention: "blocked",
          display: "blocked",
          externalProcessing: "blocked",
        },
      ],
    });
    await expect(
      ingestion.ingest({
        ...REQUEST,
        policyId: researchPolicyId,
        environment: "internal_research",
      }),
    ).rejects.toMatchObject({ code: "rights_missing" });
  });

  it("applies a runtime kill switch before serving cached data", async () => {
    const { ingestion } = setup();
    const result = await ingestion.ingest(REQUEST);
    ingestion.setKillSwitch(POLICY_ID, true);
    expect(
      await ingestion.authorizeExternalProcessing(
        result.items[0]!.item.rawNewsItemId,
        NOW,
      ),
    ).toBe(false);
    await expect(ingestion.ingest(REQUEST)).rejects.toMatchObject({
      code: "kill_switch_active",
    });
  });

  it("rejects policy versions that do not match the reviewed terms version", () => {
    expect(() =>
      setup({
        ...POLICY,
        termsVersion: createVersion("different-terms"),
      }),
    ).toThrow("News source policy configuration is invalid.");
  });

  it("aborts timed-out source reads and records a cancelled request", async () => {
    const base = setup();
    let observedSignal: AbortSignal | undefined;
    const source: CuratedNewsSourceAdapter = {
      policyId: POLICY_ID,
      read: (request) => {
        observedSignal = request.signal;
        return new Promise(() => undefined);
      },
    };
    const ingestion = new CuratedNewsIngestion({
      policies: [POLICY],
      sources: [source],
      store: base.store,
      provenanceStore: base.provenanceStore,
      usageRecorder: base.recorder,
      eventIdFactory: () => "timeout-event",
      clock: { now: () => NOW },
      timeoutMs: 5,
    });
    await expect(ingestion.ingest(REQUEST)).rejects.toMatchObject({
      code: "timeout",
    });
    expect(observedSignal?.aborted).toBe(true);
    expect(base.recorder.events[0]?.outcome).toBe("cancelled");
  });

  it("preserves quota rejection telemetry without attempting a fallback", async () => {
    const base = setup();
    let reads = 0;
    const source: CuratedNewsSourceAdapter = {
      policyId: POLICY_ID,
      read: async () => {
        reads += 1;
        throw new NewsIngestionError("quota_rejected", "Synthetic quota.");
      },
    };
    const ingestion = new CuratedNewsIngestion({
      policies: [POLICY],
      sources: [source],
      store: base.store,
      provenanceStore: base.provenanceStore,
      usageRecorder: base.recorder,
      eventIdFactory: () => "quota-event",
      clock: { now: () => NOW },
    });
    await expect(ingestion.ingest(REQUEST)).rejects.toMatchObject({
      code: "quota_rejected",
    });
    expect(reads).toBe(1);
    expect(base.recorder.events[0]?.outcome).toBe("quota_rejected");
  });

  it("requires correction references and invalidates cached snapshots", async () => {
    const { ingestion } = setup();
    const original = await ingestion.ingest(REQUEST);
    const rawNewsItemId = original.items[0]!.item.rawNewsItemId;
    await expect(
      ingestion.applyLifecycle({
        kind: "corrected",
        rawNewsItemId,
        occurredAt: NOW,
        correctionReference: " ",
      }),
    ).rejects.toThrow(RangeError);
    const corrected = await ingestion.applyLifecycle({
      kind: "corrected",
      rawNewsItemId,
      occurredAt: NOW,
      correctionReference: "synthetic-correction-1",
    });
    expect(corrected).toMatchObject({
      lifecycleState: "corrected",
      correctionReference: "synthetic-correction-1",
    });
    expect(
      await ingestion.authorizeExternalProcessing(rawNewsItemId, NOW),
    ).toBe(false);
  });

  it("surfaces telemetry gaps without discarding valid shared results", async () => {
    const base = setup();
    const ingestion = new CuratedNewsIngestion({
      policies: [POLICY],
      sources: [new SyntheticNewsSourceAdapter(PAYLOAD, CONTENT_POLICY)],
      store: base.store,
      provenanceStore: base.provenanceStore,
      usageRecorder: {
        record: async () =>
          Promise.reject(new Error("synthetic telemetry outage")),
      },
      eventIdFactory: () => "event",
      clock: { now: () => NOW },
    });
    await expect(ingestion.ingest(REQUEST)).resolves.toMatchObject({
      warnings: ["usage_telemetry_unavailable"],
    });
  });
});
