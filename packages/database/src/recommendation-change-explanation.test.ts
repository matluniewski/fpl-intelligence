import {
  createRecommendation,
  createRecommendationId,
  createUtcInstant,
  createVersion,
  type CreateRecommendationInput,
} from "@fpl-intelligence/domain";
import { createSyntheticRecommendationInput } from "@fpl-intelligence/domain/testing/recommendation";
import { describe, expect, it } from "vitest";
import { explainRecommendationChange } from "./recommendation-change-explanation";
import {
  createRecommendationSnapshot,
  type RecommendationSnapshotContext,
} from "./recommendation-history";

const firstTime = createUtcInstant("2026-08-18T12:05:00Z");
const secondTime = createUtcInstant("2026-08-18T12:10:00Z");

function snapshot(
  id: string,
  time: string,
  context: RecommendationSnapshotContext,
) {
  const input = createSyntheticRecommendationInput();
  const generatedAt = createUtcInstant(time);
  const recommendation = createRecommendation({
    ...input,
    recommendationId: createRecommendationId(id),
    generatedAt,
    confidence: { ...input.confidence, evaluatedAt: generatedAt },
  } satisfies CreateRecommendationInput);
  return createRecommendationSnapshot({
    recommendation,
    context,
    recordedAt: generatedAt,
  });
}

function context(
  overrides: Partial<RecommendationSnapshotContext> = {},
): RecommendationSnapshotContext {
  return Object.freeze({
    teamStateVersion: createVersion("team-1"),
    projection: Object.freeze({
      baselineVersion: createVersion("base-1"),
      currentVersion: createVersion("current-1"),
      inputVersion: createVersion("input-1"),
    }),
    news: Object.freeze({
      signalRefs: Object.freeze([]),
      availabilityStateRefs: Object.freeze([]),
      claimRefs: Object.freeze([]),
      evidenceRefs: Object.freeze([]),
    }),
    retention: Object.freeze({
      policyVersion: createVersion("retention-1"),
      retainUntil: null,
    }),
    ...overrides,
  });
}

describe("recommendation change explanation", () => {
  it("returns initial without inventing causes", () => {
    const current = snapshot("current", firstTime, context());
    expect(
      explainRecommendationChange({
        current,
        prior: null,
        evaluatedAt: firstTime,
      }),
    ).toMatchObject({ outcome: "initial", causes: [] });
  });
  it("states new information while the recommendation remains unchanged", () => {
    const prior = snapshot("prior", firstTime, context());
    const current = snapshot(
      "current",
      secondTime,
      context({
        news: Object.freeze({
          signalRefs: Object.freeze(["signal-1" as never]),
          availabilityStateRefs: Object.freeze(["availability-1" as never]),
          claimRefs: Object.freeze(["claim-1" as never]),
          evidenceRefs: Object.freeze(["evidence-1" as never]),
        }),
      }),
    );
    const result = explainRecommendationChange({
      current,
      prior,
      evaluatedAt: secondTime,
    });
    expect(result).toMatchObject({ outcome: "changed" });
    expect(result.causes.map((cause) => cause.code)).toContain(
      "news_signal_added",
    );
    expect(result.causes.map((cause) => cause.code)).not.toContain(
      "recommendation_output_changed",
    );
  });
  it("reports team correction, projection, confidence and output changes from snapshots", () => {
    const prior = snapshot("prior", firstTime, context());
    const changedInput = createSyntheticRecommendationInput();
    const current = createRecommendationSnapshot({
      recommendation: createRecommendation({
        ...changedInput,
        recommendationId: createRecommendationId("current"),
        generatedAt: secondTime,
        confidence: {
          ...changedInput.confidence,
          evaluatedAt: secondTime,
          factors: changedInput.confidence.factors.map((factor, index) =>
            index === 0
              ? { ...factor, confidenceBand: "medium" as const }
              : factor,
          ),
        },
        options: changedInput.options.map((option, index) =>
          index === 0
            ? { ...option, ranking: { ...option.ranking, value: 9 } }
            : option,
        ),
      }),
      context: context({
        teamStateVersion: createVersion("team-2"),
        projection: Object.freeze({
          baselineVersion: createVersion("base-1"),
          currentVersion: createVersion("current-2"),
          inputVersion: createVersion("input-1"),
        }),
      }),
      recordedAt: secondTime,
    });
    const codes = explainRecommendationChange({
      current,
      prior,
      evaluatedAt: secondTime,
    }).causes.map((cause) => cause.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "team_state_changed",
        "projection_input_changed",
        "confidence_changed",
        "recommendation_output_changed",
      ]),
    );
  });
  it("reports an expired or removed signal as removed rather than fabricating a cause", () => {
    const prior = snapshot(
      "prior",
      firstTime,
      context({
        news: Object.freeze({
          signalRefs: Object.freeze(["signal-expired" as never]),
          availabilityStateRefs: Object.freeze([]),
          claimRefs: Object.freeze([]),
          evidenceRefs: Object.freeze([]),
        }),
      }),
    );
    const current = snapshot("current", secondTime, context());
    expect(
      explainRecommendationChange({ current, prior, evaluatedAt: secondTime })
        .causes,
    ).toContainEqual(
      expect.objectContaining({
        code: "news_signal_removed",
        priorRefs: ["signal-expired"],
      }),
    );
  });
  it("rejects snapshots with different comparison horizons", () => {
    const current = snapshot("current", secondTime, context());
    const prior = snapshot("prior", firstTime, context());
    const invalid = {
      ...prior,
      recommendation: { ...prior.recommendation, kind: "lineup" as const },
    };
    expect(() =>
      explainRecommendationChange({
        current,
        prior: invalid,
        evaluatedAt: secondTime,
      }),
    ).toThrow("comparable");
  });
});
