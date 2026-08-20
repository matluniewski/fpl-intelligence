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
  it("records shared success and prevents duplicate execution before eligibility", async () => {
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
  });

  it("uses exponential backoff for transient failures and bounded permanent failure delay", async () => {
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
  });
});
