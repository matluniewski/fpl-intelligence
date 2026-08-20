import {
  createRecommendation,
  createRecommendationId,
  createUtcInstant,
  createVersion,
  type CreateRecommendationInput,
  type Recommendation,
} from "@fpl-intelligence/domain";
import { createSyntheticRecommendationInput } from "@fpl-intelligence/domain/testing/recommendation";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabaseClient, type DatabaseClient } from "./client";
import { readDatabaseConfig } from "./config";
import {
  createRecommendationHistoryRepository,
  RecommendationSnapshotConflictError,
  type RecommendationHistoryRepository,
} from "./recommendation-history-repository";
import type { RecommendationSnapshotContext } from "./recommendation-history";
import { recommendationSnapshots } from "./schema";

function recommendation(id: string, generatedAt: string): Recommendation {
  const input = createSyntheticRecommendationInput();
  const time = createUtcInstant(generatedAt);
  const next: CreateRecommendationInput = {
    ...input,
    recommendationId: createRecommendationId(id),
    generatedAt: time,
    confidence: Object.freeze({ ...input.confidence, evaluatedAt: time }),
  };
  return createRecommendation(next);
}

function context(
  input: {
    readonly currentVersion?: string;
    readonly retainUntil?: string | null;
  } = {},
): RecommendationSnapshotContext {
  return Object.freeze({
    teamStateVersion: createVersion("team-state-1"),
    projection: Object.freeze({
      baselineVersion: createVersion("projection-baseline-1"),
      currentVersion: createVersion(
        input.currentVersion ?? "projection-current-1",
      ),
      inputVersion: createVersion("projection-input-1"),
    }),
    news: Object.freeze({
      signalRefs: Object.freeze([]),
      availabilityStateRefs: Object.freeze([]),
      claimRefs: Object.freeze([]),
      evidenceRefs: Object.freeze([]),
    }),
    retention: Object.freeze({
      policyVersion: createVersion("retention-1"),
      retainUntil:
        input.retainUntil === undefined || input.retainUntil === null
          ? null
          : createUtcInstant(input.retainUntil),
    }),
  });
}

describe("recommendation history repository", () => {
  let client: DatabaseClient;
  let repository: RecommendationHistoryRepository;

  beforeAll(() => {
    client = createDatabaseClient(readDatabaseConfig());
    repository = createRecommendationHistoryRepository(client.db);
  });

  beforeEach(async () => {
    await client.db.delete(recommendationSnapshots);
  });

  afterAll(async () => {
    await client.close();
  });

  it("creates, orders and compares reproducible snapshots", async () => {
    const first = recommendation("recommendation-1", "2026-08-18T12:05:00Z");
    const equivalent = recommendation(
      "recommendation-2",
      "2026-08-18T12:10:00Z",
    );
    const material = recommendation("recommendation-3", "2026-08-18T12:15:00Z");

    await repository.append({
      recommendation: first,
      context: context(),
      recordedAt: createUtcInstant("2026-08-18T12:06:00Z"),
    });
    await repository.append({
      recommendation: equivalent,
      context: context(),
      recordedAt: createUtcInstant("2026-08-18T12:11:00Z"),
    });
    await repository.append({
      recommendation: material,
      context: context({ currentVersion: "projection-current-2" }),
      recordedAt: createUtcInstant("2026-08-18T12:16:00Z"),
    });

    const key = {
      teamStateId: material.teamStateId,
      kind: material.kind,
      contractVersion: material.contractVersion,
      horizon: material.primary.horizon,
    } as const;
    const history = await repository.listHistory(key);

    expect(
      history.map((entry) => [
        entry.recommendation.recommendationId,
        entry.change,
      ]),
    ).toEqual([
      ["recommendation-3", "material_change"],
      ["recommendation-2", "equivalent_recalculation"],
      ["recommendation-1", "initial"],
    ]);
    await expect(repository.getLatestAndPrior(key)).resolves.toHaveLength(2);
    await expect(
      repository.getById(createRecommendationId("recommendation-2")),
    ).resolves.toMatchObject({ change: "equivalent_recalculation" });
  });

  it("is idempotent for identical content and rejects conflicting identity reuse", async () => {
    const persisted = recommendation(
      "recommendation-idempotent",
      "2026-08-18T12:05:00Z",
    );
    const input = {
      recommendation: persisted,
      context: context(),
      recordedAt: createUtcInstant("2026-08-18T12:06:00Z"),
    } as const;

    await repository.append(input);
    await expect(repository.append(input)).resolves.toMatchObject({
      recommendation: { recommendationId: "recommendation-idempotent" },
    });
    await expect(
      repository.append({
        ...input,
        context: context({ currentVersion: "projection-current-2" }),
      }),
    ).rejects.toBeInstanceOf(RecommendationSnapshotConflictError);
  });

  it("uses recommendation identity as a deterministic tie-breaker", async () => {
    const generatedAt = "2026-08-18T12:05:00Z";
    const first = recommendation("recommendation-1", generatedAt);
    const second = recommendation("recommendation-2", generatedAt);

    await repository.append({
      recommendation: first,
      context: context(),
      recordedAt: createUtcInstant("2026-08-18T12:06:00Z"),
    });
    await repository.append({
      recommendation: second,
      context: context(),
      recordedAt: createUtcInstant("2026-08-18T12:06:00Z"),
    });

    await expect(
      repository.getById(second.recommendationId),
    ).resolves.toMatchObject({
      change: "equivalent_recalculation",
      priorRecommendationId: first.recommendationId,
    });
  });

  it("deletes only snapshots whose explicit retention deadline has passed", async () => {
    const expired = recommendation(
      "recommendation-expired",
      "2026-08-18T12:05:00Z",
    );
    const retained = recommendation(
      "recommendation-retained",
      "2026-08-18T12:10:00Z",
    );
    await repository.append({
      recommendation: expired,
      context: context({ retainUntil: "2026-08-18T13:00:00Z" }),
      recordedAt: createUtcInstant("2026-08-18T12:06:00Z"),
    });
    await repository.append({
      recommendation: retained,
      context: context({ retainUntil: "2026-08-18T15:00:00Z" }),
      recordedAt: createUtcInstant("2026-08-18T12:11:00Z"),
    });

    await expect(
      repository.deleteExpired(createUtcInstant("2026-08-18T14:00:00Z")),
    ).resolves.toEqual(["recommendation-expired"]);
    await expect(
      repository.getById(createRecommendationId("recommendation-expired")),
    ).resolves.toBeNull();
    await expect(
      repository.getById(createRecommendationId("recommendation-retained")),
    ).resolves.not.toBeNull();
  });
});
