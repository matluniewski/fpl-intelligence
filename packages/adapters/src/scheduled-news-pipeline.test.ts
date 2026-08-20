import {
  createSourcePolicyId,
  createUtcInstant,
} from "@fpl-intelligence/domain";
import { describe, expect, it } from "vitest";
import { NewsIngestionError } from "./news-ingestion-errors";
import { ScheduledNewsPipeline } from "./scheduled-news-pipeline";

const policyId = createSourcePolicyId("news.synthetic.fixture.v1");
const now = createUtcInstant("2026-08-20T12:00:00Z");

describe("scheduled news pipeline", () => {
  it("records shared success and makes completed scheduled runs idempotent", async () => {
    let calls = 0;
    const runner = new ScheduledNewsPipeline({
      pipeline: {
        run: async () => ({
          recordsStored: ++calls,
          recordsReused: 2,
          quarantinedCount: 0,
        }),
      },
      clock: { now: () => now },
      baseBackoffMs: 1_000,
      maximumBackoffMs: 8_000,
    });
    const request = {
      policyId,
      environment: "test" as const,
      scheduledAt: now,
      runId: "run-1",
    };
    await expect(runner.run(request)).resolves.toMatchObject({
      recordsStored: 1,
      consecutiveFailures: 0,
    });
    expect(runner.snapshot(policyId)?.recordsReused).toBe(2);
    await runner.run(request);
    expect(calls).toBe(1);
  });

  it("uses exponential backoff and does not retry before a transient failure is eligible", async () => {
    const transient = new ScheduledNewsPipeline({
      pipeline: {
        run: async () => {
          throw new NewsIngestionError("timeout", "synthetic");
        },
      },
      clock: { now: () => now },
      baseBackoffMs: 1_000,
      maximumBackoffMs: 8_000,
    });
    const request = {
      policyId,
      environment: "test" as const,
      scheduledAt: now,
      runId: "run-2",
    };
    await expect(transient.run(request)).rejects.toBeInstanceOf(
      NewsIngestionError,
    );
    expect(transient.snapshot(policyId)).toMatchObject({
      consecutiveFailures: 1,
      lastFailureKind: "transient",
      nextEligibleAt: "2026-08-20T12:00:01.000Z",
    });
    await expect(
      transient.run({ ...request, runId: "run-3" }),
    ).resolves.toMatchObject({
      consecutiveFailures: 1,
    });
  });

  it("applies the bounded delay to permanent failures", async () => {
    const runner = new ScheduledNewsPipeline({
      pipeline: {
        run: async () => {
          throw new NewsIngestionError("quota_rejected", "synthetic");
        },
      },
      clock: { now: () => now },
      baseBackoffMs: 1_000,
      maximumBackoffMs: 8_000,
    });
    await expect(
      runner.run({
        policyId,
        environment: "test",
        scheduledAt: now,
        runId: "run-4",
      }),
    ).rejects.toMatchObject({ code: "quota_rejected" });
    expect(runner.snapshot(policyId)).toMatchObject({
      lastFailureKind: "permanent",
      nextEligibleAt: "2026-08-20T12:00:08.000Z",
    });
  });
});
