import {
  createPlayerAvailabilityState,
  createRecommendationOptionId,
  createUtcInstant,
  createVersion,
} from "./index";
import { describe, expect, it } from "vitest";
import { evaluateNewsRecommendationImpact } from "./news-recommendation-impact";
import type { NewsRecommendationDecisionInput } from "./news-recommendation-impact";
import { SYNTHETIC_SIGNAL } from "./testing/synthetic-news-intelligence";
import { SYNTHETIC_PLAYERS } from "./testing/synthetic-fixtures";

const playerId = SYNTHETIC_PLAYERS[0]!.id;
const evaluatedAt = createUtcInstant("2026-08-18T12:00:00Z");
const rules = Object.freeze({
  version: createVersion("impact-v0"),
  expectedMinutesDelta: 15,
  startProbabilityDelta: 0.15,
  projectedPointsDelta: 1,
});
const before: NewsRecommendationDecisionInput = Object.freeze({
  expectedMinutes: 80,
  startProbability: 0.9,
  projectedPoints: 6,
  status: "hold" as const,
  captaincySuitability: "supported" as const,
  confidenceBand: "high" as const,
});

function availability(overrides: Record<string, unknown> = {}) {
  return createPlayerAvailabilityState({
    availabilityStateId: "synthetic-impact-state" as never,
    playerId,
    availability: "doubtful",
    expectedStartProbability: 0.5,
    expectedMinutes: 45,
    evaluatedAt,
    effectiveFrom: evaluatedAt,
    confidenceBand: "high",
    freshness: "current",
    conflictState: "no_conflict",
    assumptionCodes: ["synthetic_assumption"],
    signalRefs: [SYNTHETIC_SIGNAL.newsSignalId],
    evidenceRefs: SYNTHETIC_SIGNAL.evidenceRefs,
    provenanceRefs: SYNTHETIC_SIGNAL.provenanceRefs,
    ruleName: "synthetic",
    ruleVersion: createVersion("1"),
    ...overrides,
  });
}

function evaluate(
  after: Partial<NewsRecommendationDecisionInput> = {},
  state = availability(),
) {
  const signal = Object.freeze({
    ...SYNTHETIC_SIGNAL,
    playerId,
    evaluatedAt,
    effectiveFrom: evaluatedAt,
    conflictState: "no_conflict" as const,
    freshness: "current" as const,
  });
  return evaluateNewsRecommendationImpact({
    playerId,
    evaluatedAt,
    rules,
    horizon: {
      from: { seasonId: "synthetic" as never, number: 1 },
      to: { seasonId: "synthetic" as never, number: 1 },
    },
    before,
    after: { ...before, ...after },
    causalChain: {
      signal,
      availabilityState: state,
      claimRefs: signal.claimRefs,
      evidenceRefs: signal.evidenceRefs,
      provenanceRefs: signal.provenanceRefs,
    },
  });
}

describe("news-driven recommendation impact", () => {
  it("reports explicit unchanged news", () => {
    expect(evaluate()).toMatchObject({
      outcome: "unchanged",
      materialityReasons: [],
      currentStatus: "hold",
    });
  });
  it("reports confidence-only changes without invented precision", () => {
    expect(evaluate({ confidenceBand: "medium" })).toMatchObject({
      outcome: "changed",
      materialityReasons: ["confidence_band_changed"],
    });
  });
  it("records HOLD to WAIT and a minutes change", () => {
    expect(evaluate({ status: "wait", expectedMinutes: 54 })).toMatchObject({
      outcome: "changed",
      materialityReasons: expect.arrayContaining([
        "recommendation_status_changed",
        "expected_minutes_changed",
      ]),
    });
  });
  it("preserves one evaluated alternative without generating an FPL action", () => {
    expect(evaluate({ status: "wait" }, availability()).alternative).toBeNull();
    const result = evaluateNewsRecommendationImpact({
      playerId,
      evaluatedAt,
      rules,
      horizon: {
        from: { seasonId: "synthetic" as never, number: 1 },
        to: { seasonId: "synthetic" as never, number: 1 },
      },
      before,
      after: { ...before, status: "wait" },
      causalChain: {
        signal: Object.freeze({
          ...SYNTHETIC_SIGNAL,
          playerId,
          evaluatedAt,
          effectiveFrom: evaluatedAt,
          conflictState: "no_conflict" as const,
          freshness: "current" as const,
        }),
        availabilityState: availability(),
        claimRefs: SYNTHETIC_SIGNAL.claimRefs,
        evidenceRefs: SYNTHETIC_SIGNAL.evidenceRefs,
        provenanceRefs: SYNTHETIC_SIGNAL.provenanceRefs,
      },
      alternative: {
        optionId: createRecommendationOptionId("synthetic-fallback"),
        expectedPointsDelta: -0.4,
        rationaleCode: "conservative_fallback",
      },
    });
    expect(result.alternative).toMatchObject({
      rationaleCode: "conservative_fallback",
    });
  });
  it("records WAIT to SELL", () => {
    expect(
      evaluate({ status: "sell", expectedMinutes: 20 }, availability())
        .currentStatus,
    ).toBe("sell");
  });
  it("records a captaincy downgrade", () => {
    expect(
      evaluate({ captaincySuitability: "downgraded" }).materialityReasons,
    ).toContain("captaincy_suitability_changed");
  });
  it("withholds a conclusion for conflicting evidence", () => {
    expect(
      evaluate(
        { status: "sell" },
        availability({ conflictState: "unresolved_conflict" }),
      ),
    ).toMatchObject({ outcome: "withheld", currentStatus: "withheld" });
  });
  it("withholds a conclusion for expired evidence", () => {
    expect(
      evaluate({ status: "sell" }, availability({ freshness: "expired" })),
    ).toMatchObject({ outcome: "withheld", currentStatus: "withheld" });
  });
});
