import {
  createPlayerAvailabilityState,
  createUtcInstant,
  createVersion,
} from "@fpl-intelligence/domain";
import { SYNTHETIC_AVAILABILITY_STATE } from "@fpl-intelligence/domain/testing/news-intelligence";
import { describe, expect, it } from "vitest";
import { applyAvailabilityToProjection } from "./availability-adjustment";
import { createSyntheticProjectionInput } from "./testing/synthetic-projection";

const rules = Object.freeze({
  name: "availability-adjustment-v0",
  version: createVersion("1"),
});
const projectionPlayerId = createSyntheticProjectionInput().playerId;
const eligibleOverrides = Object.freeze({
  confidenceBand: "medium" as const,
  conflictState: "no_conflict" as const,
});

function availability(
  overrides: Partial<typeof SYNTHETIC_AVAILABILITY_STATE> = {},
) {
  return createPlayerAvailabilityState({
    ...SYNTHETIC_AVAILABILITY_STATE,
    playerId: projectionPlayerId,
    ...overrides,
  });
}

function apply(state = availability()) {
  const projection = createSyntheticProjectionInput();
  return applyAvailabilityToProjection({
    projection,
    availabilityState: state,
    claimRefs: [],
    rules,
  });
}

describe("availability projection adjustment", () => {
  it("preserves the baseline and creates a separately inspectable adjusted projection", () => {
    const result = apply(
      availability({
        expectedStartProbability: 0.5,
        expectedMinutes: 45,
        confidenceBand: "medium",
        conflictState: "no_conflict",
      }),
    );
    expect(result.applied).toBe(true);
    expect(result.adjusted.expectedPoints).toBeLessThan(
      result.baseline.expectedPoints,
    );
    expect(result.baseline.explanation.assumptions).toContain(
      "news_adjustments_excluded",
    );
    expect(result.trace).toMatchObject({
      ruleName: rules.name,
      evaluatedAt: SYNTHETIC_AVAILABILITY_STATE.evaluatedAt,
    });
  });

  it.each([
    [null, "availability_state_not_supplied"],
    [
      availability({ ...eligibleOverrides, confidenceBand: "low" }),
      "availability_state_low_confidence",
    ],
    [
      availability({
        ...eligibleOverrides,
        conflictState: "unresolved_conflict",
      }),
      "availability_state_conflicted",
    ],
    [
      availability({ ...eligibleOverrides, freshness: "expired" }),
      "availability_state_not_current",
    ],
    [
      availability({ ...eligibleOverrides, expectedMinutes: null }),
      "availability_state_insufficient_for_adjustment",
    ],
  ] as const)(
    "keeps the baseline for conservative case %s",
    (state, reasonCode) => {
      const projection = createSyntheticProjectionInput();
      const result = applyAvailabilityToProjection({
        projection,
        availabilityState: state,
        claimRefs: [],
        rules,
      });
      expect(result).toMatchObject({
        applied: false,
        reasonCodes: [reasonCode],
      });
      expect(result.adjusted).toEqual(result.baseline);
    },
  );

  it("rejects availability evaluated after the projection cutoff", () => {
    const result = apply(
      availability({
        ...eligibleOverrides,
        evaluatedAt: createUtcInstant("2026-08-18T12:01:00Z"),
      }),
    );
    expect(result.reasonCodes).toEqual([
      "availability_state_after_projection_evaluation",
    ]);
  });
});
