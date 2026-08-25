import { describe, expect, it } from "vitest";

import { createActionPlan } from "./action-plan";
import {
  createActionPlanId,
  createRecommendationId,
  createRecommendationOptionId,
  createTeamStateId,
} from "./identifiers";
import {
  OFFICIAL_FPL_URL,
  StaticManualFplActionProvider,
} from "./manual-fpl-action-provider";
import { createUtcInstant } from "./primitives";
import { createGameweekId } from "./reference-data";
import {
  SYNTHETIC_PLAYERS,
  SYNTHETIC_SEASON_ID,
} from "./testing/synthetic-fixtures";

function createSyntheticActionPlan() {
  const gameweekId = createGameweekId(SYNTHETIC_SEASON_ID, 1);

  return createActionPlan({
    actionPlanId: createActionPlanId("synthetic-action-plan"),
    recommendationId: createRecommendationId("synthetic-recommendation"),
    recommendationOptionId: createRecommendationOptionId("synthetic-option"),
    teamStateId: createTeamStateId("synthetic-team-state"),
    approvedAt: createUtcInstant("2026-08-25T12:00:00Z"),
    instructions: [
      {
        kind: "transfer",
        outPlayerId: SYNTHETIC_PLAYERS[0]!.id,
        inPlayerId: SYNTHETIC_PLAYERS[1]!.id,
        gameweekId,
      },
      {
        kind: "set_captain",
        playerId: SYNTHETIC_PLAYERS[2]!.id,
        gameweekId,
      },
      {
        kind: "set_bench_order",
        playerId: SYNTHETIC_PLAYERS[3]!.id,
        order: 1,
        gameweekId,
      },
      {
        kind: "hold",
        scope: "transfer",
        gameweekId,
        reasonCode: "synthetic_hold_remaining_transfer",
      },
      {
        kind: "wait",
        scope: "lineup",
        gameweekId,
        reasonCode: "synthetic_wait_for_team_news",
      },
    ],
  });
}

describe("manual action plans", () => {
  it("records supported actions and explicit non-actions as an immutable approval", () => {
    const plan = createSyntheticActionPlan();

    expect(plan.instructions.map((instruction) => instruction.kind)).toEqual([
      "transfer",
      "set_captain",
      "set_bench_order",
      "hold",
      "wait",
    ]);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.instructions)).toBe(true);
    expect(Object.isFrozen(plan.instructions[0]!)).toBe(true);
  });

  it("rejects empty, duplicate, and unexplained non-action instructions", () => {
    const plan = createSyntheticActionPlan();

    expect(() => createActionPlan({ ...plan, instructions: [] })).toThrow(
      "requires at least one instruction",
    );
    expect(() =>
      createActionPlan({
        ...plan,
        instructions: [plan.instructions[0]!, plan.instructions[0]!],
      }),
    ).toThrow("must be unique");
    expect(() =>
      createActionPlan({
        ...plan,
        instructions: [
          {
            kind: "wait",
            scope: "captaincy",
            gameweekId: createGameweekId(SYNTHETIC_SEASON_ID, 1),
            reasonCode: " ",
          },
        ],
      }),
    ).toThrow("require a reason code");
  });

  it("produces deterministic manual instructions without remote mutation", async () => {
    const provider = new StaticManualFplActionProvider();
    const plan = createSyntheticActionPlan();

    const first = await provider.prepareHandoff(plan);
    const second = await provider.prepareHandoff(plan);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      kind: "manual_fpl_handoff",
      actionPlanId: plan.actionPlanId,
      officialFplUrl: OFFICIAL_FPL_URL,
      approvalScope: "internal_only",
    });
    expect(first.steps.map((step) => step.instruction.kind)).toEqual(
      plan.instructions.map((instruction) => instruction.kind),
    );
    expect("execute" in provider).toBe(false);
    expect("authenticate" in provider).toBe(false);
  });
});
