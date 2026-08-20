import {
  createRecommendation,
  createRecommendationId,
  createUtcInstant,
  createVersion,
  type CreateRecommendationInput,
  type Recommendation,
} from "@fpl-intelligence/domain";
import { createSyntheticRecommendationInput } from "@fpl-intelligence/domain/testing/recommendation";
import { describe, expect, it } from "vitest";
import {
  classifyRecommendationSnapshot,
  createRecommendationSnapshot,
  type RecommendationSnapshotContext,
} from "./recommendation-history";

const FIRST_GENERATED_AT = createUtcInstant("2026-08-18T12:05:00Z");
const SECOND_GENERATED_AT = createUtcInstant("2026-08-18T12:10:00Z");

function recommendation(
  id: string,
  generatedAt = FIRST_GENERATED_AT,
): Recommendation {
  const input = createSyntheticRecommendationInput();
  const next: CreateRecommendationInput = {
    ...input,
    recommendationId: createRecommendationId(id),
    generatedAt,
    confidence: Object.freeze({
      ...input.confidence,
      evaluatedAt: generatedAt,
    }),
  };
  return createRecommendation(next);
}

function context(
  currentVersion = "projection-current-1",
  retainUntil: RecommendationSnapshotContext["retention"]["retainUntil"] = null,
): RecommendationSnapshotContext {
  return Object.freeze({
    teamStateVersion: createVersion("team-state-1"),
    projection: Object.freeze({
      baselineVersion: createVersion("projection-baseline-1"),
      currentVersion: createVersion(currentVersion),
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
      retainUntil,
    }),
  });
}

describe("recommendation snapshot", () => {
  it("classifies time-only recomputation as equivalent", () => {
    const first = createRecommendationSnapshot({
      recommendation: recommendation("recommendation-1"),
      context: context(),
      recordedAt: createUtcInstant("2026-08-18T12:06:00Z"),
    });
    const second = createRecommendationSnapshot({
      recommendation: recommendation("recommendation-2", SECOND_GENERATED_AT),
      context: context(),
      recordedAt: createUtcInstant("2026-08-18T12:11:00Z"),
    });

    expect(second.materialFingerprint).toBe(first.materialFingerprint);
    expect(second.payloadFingerprint).not.toBe(first.payloadFingerprint);
    expect(classifyRecommendationSnapshot(second, first)).toEqual({
      change: "equivalent_recalculation",
      priorRecommendationId: "recommendation-1",
    });
  });

  it("classifies a versioned input change as material", () => {
    const first = createRecommendationSnapshot({
      recommendation: recommendation("recommendation-1"),
      context: context(),
      recordedAt: createUtcInstant("2026-08-18T12:06:00Z"),
    });
    const second = createRecommendationSnapshot({
      recommendation: recommendation("recommendation-2", SECOND_GENERATED_AT),
      context: context("projection-current-2"),
      recordedAt: createUtcInstant("2026-08-18T12:11:00Z"),
    });

    expect(classifyRecommendationSnapshot(second, first)).toEqual({
      change: "material_change",
      priorRecommendationId: "recommendation-1",
    });
  });

  it("rejects invalid recording and retention times", () => {
    expect(() =>
      createRecommendationSnapshot({
        recommendation: recommendation("recommendation-1"),
        context: context(),
        recordedAt: createUtcInstant("2026-08-18T12:04:00Z"),
      }),
    ).toThrow("before generation");

    expect(() =>
      createRecommendationSnapshot({
        recommendation: recommendation("recommendation-1"),
        context: context(
          "projection-current-1",
          createUtcInstant("2026-08-18T12:06:00Z"),
        ),
        recordedAt: createUtcInstant("2026-08-18T12:06:00Z"),
      }),
    ).toThrow("retention");
  });
});
