import {
  createGameweekId,
  createSeasonId,
  createUtcInstant,
} from "@fpl-intelligence/domain";
import type { ReferenceDataQuery, UtcInstant } from "@fpl-intelligence/domain";
import { describe, expect, it } from "vitest";
import { resolvePlayerIdentity } from "./player-identity";
import { PrototypeReferenceDataAdapter } from "./prototype-reference-data-adapter";
import { ReferenceDataSourceError } from "./reference-data-errors";
import {
  JsonTextReferenceDataSource,
  StaticReferenceDataSource,
} from "./reference-data-source";
import type { ReferenceDataUsageEvent, UsageRecorder } from "./usage-telemetry";
import {
  SYNTHETIC_REFERENCE_DATA_IDENTITY_MAP,
  SYNTHETIC_REFERENCE_DATA_PAYLOAD,
  SYNTHETIC_REFERENCE_DATA_SOURCE_POLICY,
} from "./testing/synthetic-reference-data";
import type { ReferenceDataSourcePolicy } from "./reference-data-contracts";

const NOW = createUtcInstant("2026-08-18T12:00:00Z");
const QUERY: ReferenceDataQuery = Object.freeze({
  seasonId: createSeasonId("synthetic-2026"),
  gameweekId: createGameweekId(createSeasonId("synthetic-2026"), 1),
  asOf: NOW,
});

class FixedClock {
  now(): UtcInstant {
    return NOW;
  }
}

class CapturingUsageRecorder implements UsageRecorder {
  readonly events: ReferenceDataUsageEvent[] = [];

  async record(event: ReferenceDataUsageEvent): Promise<void> {
    this.events.push(event);
  }
}

function createAdapter(
  options: {
    readonly payload?: unknown;
    readonly source?: StaticReferenceDataSource;
    readonly sourcePolicy?: ReferenceDataSourcePolicy;
    readonly usageRecorder?: UsageRecorder;
  } = {},
): PrototypeReferenceDataAdapter {
  return new PrototypeReferenceDataAdapter({
    adapterVersion: "1",
    clock: new FixedClock(),
    costEstimationStatus: "not_applicable",
    eventIdFactory: () => "reference-load-1",
    identityMap: SYNTHETIC_REFERENCE_DATA_IDENTITY_MAP,
    normalizationVersion: "1",
    providerRef: "synthetic-static-reference-data",
    purpose: "deterministic adapter verification",
    source:
      options.source ??
      new StaticReferenceDataSource(
        options.payload ?? SYNTHETIC_REFERENCE_DATA_PAYLOAD,
      ),
    sourcePolicy:
      options.sourcePolicy ?? SYNTHETIC_REFERENCE_DATA_SOURCE_POLICY,
    supportedSchemaVersion: "synthetic-schema-v1",
    timeoutMs: 100,
    ...(options.usageRecorder === undefined
      ? {}
      : { usageRecorder: options.usageRecorder }),
  });
}

function mutablePayload(): {
  snapshot: {
    fixtures: Array<Record<string, unknown>>;
    players: Array<Record<string, unknown>>;
  };
} {
  return structuredClone(SYNTHETIC_REFERENCE_DATA_PAYLOAD) as unknown as {
    snapshot: {
      fixtures: Array<Record<string, unknown>>;
      players: Array<Record<string, unknown>>;
    };
  };
}

describe("PrototypeReferenceDataAdapter", () => {
  it("validates and maps provider-shaped data into domain contracts", async () => {
    const result = await createAdapter().loadReferenceDataWithContext(QUERY);

    expect(result.value.season.id).toBe("synthetic-2026");
    expect(result.value.gameweek.id.number).toBe(1);
    expect(result.value.rules.identity.version).toBe("1");
    expect(result.value.teams).toHaveLength(3);
    expect(result.value.players).toHaveLength(6);
    expect(result.value.fixtures).toHaveLength(2);
    expect(result.value.teams[0]!.id).toBe("northbridge");
    expect(result.value.players[0]!.id).toBe("northbridge-alex-vale");
    expect("short_name" in result.value.teams[0]!).toBe(false);
    expect(result.provenanceRecords).toHaveLength(1);
    expect(result.provenanceRecords[0]!.policyAssessment.commercialUse).toBe(
      "permitted",
    );
    expect(result.sourcePolicyId).toBe("synthetic-fixture-policy");
  });

  it("preserves a restricted commercial-use classification", async () => {
    const result = await createAdapter({
      sourcePolicy: {
        ...SYNTHETIC_REFERENCE_DATA_SOURCE_POLICY,
        commercialUse: "restricted",
      },
    }).loadReferenceDataWithContext(QUERY);

    expect(result.provenanceRecords[0]!.policyAssessment.commercialUse).toBe(
      "restricted",
    );
  });

  it("fails closed when commercial use is unclear or not reviewed", async () => {
    await expect(
      createAdapter({
        sourcePolicy: {
          ...SYNTHETIC_REFERENCE_DATA_SOURCE_POLICY,
          commercialUse: "not_reviewed",
        },
      }).loadReferenceData(QUERY),
    ).rejects.toMatchObject({
      code: "policy_blocked",
    });
  });

  it("rejects invalid DTO fields before mapping", async () => {
    const payload = mutablePayload();
    payload.snapshot.players[0]!["position"] = "winger";

    await expect(
      createAdapter({ payload }).loadReferenceData(QUERY),
    ).rejects.toMatchObject({
      code: "invalid_payload",
      details: {
        path: "$payload.snapshot.players[0].position",
      },
    });
  });

  it("rejects unsupported source schema versions", async () => {
    const payload = mutablePayload() as ReturnType<typeof mutablePayload> & {
      schema_version: string;
    };
    payload.schema_version = "synthetic-schema-v2";

    await expect(
      createAdapter({ payload }).loadReferenceData(QUERY),
    ).rejects.toMatchObject({ code: "unsupported_schema" });
  });

  it("rejects mapped data that violates domain invariants", async () => {
    const payload = mutablePayload();
    payload.snapshot.fixtures[0]!["away_team_external_id"] = "team-ext-001";

    await expect(
      createAdapter({ payload }).loadReferenceData(QUERY),
    ).rejects.toMatchObject({
      code: "mapping_invalid",
    });
  });

  it("fails explicitly when an external identity alias is unresolved", async () => {
    const payload = mutablePayload();
    payload.snapshot.players[0]!["external_id"] = "player-ext-unknown";

    await expect(
      createAdapter({ payload }).loadReferenceData(QUERY),
    ).rejects.toMatchObject({ code: "identity_unresolved" });
  });

  it("rejects a season or gameweek that the source does not contain", async () => {
    await expect(
      createAdapter().loadReferenceData({
        seasonId: createSeasonId("another-season"),
        asOf: NOW,
      }),
    ).rejects.toMatchObject({
      code: "query_unsupported",
    });
  });

  it.each([
    ["rate_limited" as const, 429, 5_000],
    ["non_success_response" as const, 503, undefined],
  ])(
    "preserves typed %s source failures",
    async (code, statusCode, retryAfterMs) => {
      const source = {
        async read(): Promise<unknown> {
          throw new ReferenceDataSourceError(code, {
            statusCode,
            ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
          });
        },
      };
      const adapter = new PrototypeReferenceDataAdapter({
        adapterVersion: "1",
        clock: new FixedClock(),
        eventIdFactory: () => "failed-load",
        identityMap: SYNTHETIC_REFERENCE_DATA_IDENTITY_MAP,
        normalizationVersion: "1",
        providerRef: "synthetic-static-reference-data",
        purpose: "failure verification",
        source,
        sourcePolicy: SYNTHETIC_REFERENCE_DATA_SOURCE_POLICY,
        supportedSchemaVersion: "synthetic-schema-v1",
        timeoutMs: 100,
      });

      await expect(adapter.loadReferenceData(QUERY)).rejects.toMatchObject({
        code,
        details: {
          statusCode,
          ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
        },
      });
    },
  );

  it("turns source latency into a typed timeout", async () => {
    const adapter = new PrototypeReferenceDataAdapter({
      adapterVersion: "1",
      clock: new FixedClock(),
      eventIdFactory: () => "timeout-load",
      identityMap: SYNTHETIC_REFERENCE_DATA_IDENTITY_MAP,
      normalizationVersion: "1",
      providerRef: "synthetic-static-reference-data",
      purpose: "timeout verification",
      source: {
        async read(): Promise<unknown> {
          return new Promise(() => {});
        },
      },
      sourcePolicy: SYNTHETIC_REFERENCE_DATA_SOURCE_POLICY,
      supportedSchemaVersion: "synthetic-schema-v1",
      timeoutMs: 5,
    });

    await expect(adapter.loadReferenceData(QUERY)).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("emits content-free shared usage telemetry", async () => {
    const usageRecorder = new CapturingUsageRecorder();
    await createAdapter({ usageRecorder }).loadReferenceData(QUERY);

    expect(usageRecorder.events).toHaveLength(1);
    expect(usageRecorder.events[0]).toMatchObject({
      eventId: "reference-load-1",
      idempotencyKey: "reference-load-1",
      serviceCategory: "football_data",
      operation: "reference_data.load",
      outcome: "succeeded",
      attribution: { scope: "shared_global" },
      estimateMetadata: { status: "not_applicable" },
    });
    expect(usageRecorder.events[0]!.measurements).toEqual([
      {
        metric: "request_count",
        quantity: 1,
        unit: "request",
        measurementStatus: "measured",
      },
      {
        metric: "records_returned",
        quantity: 11,
        unit: "record",
        measurementStatus: "measured",
      },
    ]);
    expect(JSON.stringify(usageRecorder.events[0])).not.toContain("Alex Vale");
  });

  it("does not hide a successful load when telemetry is unavailable", async () => {
    const usageRecorder: UsageRecorder = {
      async record(): Promise<void> {
        throw new Error("synthetic recorder failure");
      },
    };

    const result = await createAdapter({
      usageRecorder,
    }).loadReferenceDataWithContext(QUERY);

    expect(result.warnings).toContain("usage_telemetry_unavailable");
    expect(result.value.players).toHaveLength(6);
  });

  it("categorizes malformed JSON without exposing parser output", async () => {
    const source = new JsonTextReferenceDataSource(async () => "{not-json");
    const adapter = new PrototypeReferenceDataAdapter({
      adapterVersion: "1",
      clock: new FixedClock(),
      eventIdFactory: () => "json-load",
      identityMap: SYNTHETIC_REFERENCE_DATA_IDENTITY_MAP,
      normalizationVersion: "1",
      providerRef: "synthetic-static-reference-data",
      purpose: "JSON source verification",
      source,
      sourcePolicy: SYNTHETIC_REFERENCE_DATA_SOURCE_POLICY,
      supportedSchemaVersion: "synthetic-schema-v1",
      timeoutMs: 100,
    });

    await expect(adapter.loadReferenceData(QUERY)).rejects.toMatchObject({
      code: "invalid_payload",
      message:
        "Reference-data acquisition failed with category: invalid_payload.",
    });
  });
});

describe("resolvePlayerIdentity", () => {
  it("keeps ambiguous normalized name matches visible", async () => {
    const snapshot = await createAdapter().loadReferenceData(QUERY);

    expect(
      resolvePlayerIdentity(snapshot, { displayName: "alex vale" }),
    ).toEqual({
      kind: "ambiguous",
      candidatePlayerIds: ["northbridge-alex-vale", "riverside-alex-vale"],
    });
  });

  it("uses team and position context without fuzzy guessing", async () => {
    const snapshot = await createAdapter().loadReferenceData(QUERY);

    expect(
      resolvePlayerIdentity(snapshot, {
        displayName: "ALEX VALE",
        teamHint: "NBR",
        position: "goalkeeper",
      }),
    ).toMatchObject({
      kind: "matched",
      match: { id: "northbridge-alex-vale" },
      strategy: "normalized_name_and_context",
    });
    expect(
      resolvePlayerIdentity(snapshot, { displayName: "Alex Val" }),
    ).toEqual({ kind: "not_found" });
  });
});
