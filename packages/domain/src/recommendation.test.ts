import { describe, expect, it } from "vitest";

import {
  createRecommendationEvidenceId,
  createRecommendationId,
} from "./identifiers";
import { createUtcInstant } from "./primitives";
import {
  createRecommendation,
  validateRecommendationInput,
} from "./recommendation-factory";
import type {
  CreateRecommendationInput,
  RecommendationContractError,
  RecommendationOptionInput,
} from "./recommendation";
import { createGameweekId } from "./reference-data";
import {
  createSyntheticRecommendationInput,
  SYNTHETIC_NEWS_COUNTER_EVIDENCE_ID,
  SYNTHETIC_NEWS_SUPPORT_EVIDENCE_ID,
  SYNTHETIC_ROLL_OPTION,
  SYNTHETIC_TRANSFER_OPTION,
  SYNTHETIC_TRANSFER_OPTION_ID,
} from "./testing/synthetic-recommendation";
import { SYNTHETIC_PLAYERS } from "./testing/synthetic-fixtures";

function expectIssue(
  input: CreateRecommendationInput,
  code: RecommendationContractError["issues"][number]["code"],
  path?: string,
): void {
  expect(() => createRecommendation(input)).toThrowError(
    expect.objectContaining<Partial<RecommendationContractError>>({
      code: "recommendation_contract_invalid",
      issues: expect.arrayContaining([
        expect.objectContaining({
          code,
          ...(path === undefined ? {} : { path }),
        }),
      ]),
    }),
  );
}

function withActions(
  option: RecommendationOptionInput,
  actions: RecommendationOptionInput["actions"],
): RecommendationOptionInput {
  return {
    ...option,
    actions,
    expectedImpact: {
      ...option.expectedImpact,
      pointCost: 0,
      netExpectedPoints: option.expectedImpact.grossExpectedPoints,
      deltaVsBaseline:
        option.expectedImpact.grossExpectedPoints -
        option.expectedImpact.baselineExpectedPoints,
    },
  };
}

describe("shared recommendation contract", () => {
  it("creates a primary transfer recommendation and ranked roll alternative", () => {
    const recommendation = createRecommendation(
      createSyntheticRecommendationInput(),
    );

    expect(recommendation.kind).toBe("transfer_plan");
    expect(recommendation.primary.optionId).toBe(SYNTHETIC_TRANSFER_OPTION_ID);
    expect(recommendation.primary.rank).toBe(1);
    expect(recommendation.primary.actions[0]!.kind).toBe("transfer");
    expect(recommendation.primary.expectedImpact.deltaVsBaseline).toBe(4);
    expect(recommendation.alternatives).toHaveLength(1);
    expect(recommendation.alternatives[0]!.actions[0]!.kind).toBe(
      "roll_transfer",
    );
    expect(recommendation.alternatives[0]!.rank).toBe(2);
  });

  it("derives conservative confidence from explicit dimensions", () => {
    const recommendation = createRecommendation(
      createSyntheticRecommendationInput(),
    );

    expect(recommendation.confidence.overallBand).toBe("low");
    expect(
      recommendation.confidence.factors.map((factor) => factor.dimension),
    ).toEqual([
      "projection_uncertainty",
      "data_freshness",
      "news_signal",
      "scenario_sensitivity",
    ]);
    expect(
      recommendation.confidence.factors.every((factor) =>
        factor.rationaleCode.startsWith("synthetic_"),
      ),
    ).toBe(true);
  });

  it("retains conflicting evidence without silently selecting truth", () => {
    const recommendation = createRecommendation(
      createSyntheticRecommendationInput(),
    );
    const conflicting = recommendation.evidence.filter(
      (evidence) => evidence.conflictGroup === "synthetic-player-availability",
    );

    expect(conflicting.map((evidence) => evidence.stance)).toEqual([
      "supports",
      "contradicts",
    ]);
    expect(recommendation.primary.explanation.supportingEvidenceRefs).toContain(
      SYNTHETIC_NEWS_SUPPORT_EVIDENCE_ID,
    );
    expect(recommendation.primary.explanation.counterEvidenceRefs).toContain(
      SYNTHETIC_NEWS_COUNTER_EVIDENCE_ID,
    );
    expect(
      recommendation.primary.explanation.materialChangeTriggers,
    ).not.toHaveLength(0);
  });

  it("uses stable code-unit tie-breaking independent of candidate order", () => {
    const input = createSyntheticRecommendationInput();
    const transfer = {
      ...SYNTHETIC_TRANSFER_OPTION,
      ranking: {
        ...SYNTHETIC_TRANSFER_OPTION.ranking,
        value: 1,
        tieBreakKey: "b-transfer",
      },
    };
    const roll = {
      ...SYNTHETIC_ROLL_OPTION,
      ranking: {
        ...SYNTHETIC_ROLL_OPTION.ranking,
        value: 1,
        tieBreakKey: "a-roll",
      },
    };

    const forward = createRecommendation({
      ...input,
      options: [transfer, roll],
    });
    const reversed = createRecommendation({
      ...input,
      options: [roll, transfer],
    });

    expect(forward.primary.optionId).toBe(SYNTHETIC_ROLL_OPTION.optionId);
    expect(reversed.primary.optionId).toBe(forward.primary.optionId);
    expect(reversed.alternatives.map((option) => option.optionId)).toEqual(
      forward.alternatives.map((option) => option.optionId),
    );
  });

  it("supports lineup and bench proposal contracts", () => {
    const input = createSyntheticRecommendationInput();
    const gameweekId = SYNTHETIC_TRANSFER_OPTION.horizon.from;
    const recommendation = createRecommendation({
      ...input,
      kind: "lineup",
      options: [
        withActions(SYNTHETIC_TRANSFER_OPTION, [
          {
            kind: "select_starter",
            playerId: SYNTHETIC_PLAYERS[0]!.id,
            gameweekId,
          },
          {
            kind: "set_bench_order",
            playerId: SYNTHETIC_PLAYERS[1]!.id,
            order: 1,
            gameweekId,
          },
        ]),
        withActions(SYNTHETIC_ROLL_OPTION, [
          {
            kind: "select_starter",
            playerId: SYNTHETIC_PLAYERS[1]!.id,
            gameweekId,
          },
        ]),
      ],
    });

    expect(recommendation.kind).toBe("lineup");
    expect(recommendation.primary.actions.map((action) => action.kind)).toEqual(
      ["select_starter", "set_bench_order"],
    );
  });

  it("supports captain and vice-captain proposal contracts", () => {
    const input = createSyntheticRecommendationInput();
    const gameweekId = SYNTHETIC_TRANSFER_OPTION.horizon.from;
    const captaincyActions = [
      {
        kind: "set_captain" as const,
        playerId: SYNTHETIC_PLAYERS[7]!.id,
        gameweekId,
      },
      {
        kind: "set_vice_captain" as const,
        playerId: SYNTHETIC_PLAYERS[8]!.id,
        gameweekId,
      },
    ];
    const recommendation = createRecommendation({
      ...input,
      kind: "captaincy",
      options: [
        withActions(SYNTHETIC_TRANSFER_OPTION, captaincyActions),
        withActions(SYNTHETIC_ROLL_OPTION, [...captaincyActions].reverse()),
      ],
    });

    expect(recommendation.primary.actions.map((action) => action.kind)).toEqual(
      ["set_captain", "set_vice_captain"],
    );
  });

  it("retains explicit contract identity and supersession", () => {
    const input = createSyntheticRecommendationInput();
    const previousId = createRecommendationId(
      "previous-synthetic-recommendation",
    );
    const recommendation = createRecommendation({
      ...input,
      supersedesRecommendationId: previousId,
    });

    expect(recommendation.contractVersion).toBe(input.contractVersion);
    expect(recommendation.algorithm).toEqual(input.algorithm);
    expect(recommendation.supersedesRecommendationId).toBe(previousId);
  });

  it("rejects recommendations without an alternative", () => {
    const input = createSyntheticRecommendationInput();
    expectIssue(
      { ...input, options: [SYNTHETIC_TRANSFER_OPTION] },
      "options_missing",
    );
  });

  it("rejects inconsistent expected-impact arithmetic", () => {
    const input = createSyntheticRecommendationInput();
    expectIssue(
      {
        ...input,
        options: [
          {
            ...SYNTHETIC_TRANSFER_OPTION,
            expectedImpact: {
              ...SYNTHETIC_TRANSFER_OPTION.expectedImpact,
              netExpectedPoints: 108,
            },
          },
          SYNTHETIC_ROLL_OPTION,
        ],
      },
      "impact_invalid",
      "options[0].expectedImpact",
    );
  });

  it("rejects a points cost that does not match proposed hit actions", () => {
    const input = createSyntheticRecommendationInput();
    expectIssue(
      {
        ...input,
        options: [
          {
            ...SYNTHETIC_TRANSFER_OPTION,
            expectedImpact: {
              ...SYNTHETIC_TRANSFER_OPTION.expectedImpact,
              pointCost: 0,
              netExpectedPoints: 108,
              deltaVsBaseline: 8,
            },
          },
          SYNTHETIC_ROLL_OPTION,
        ],
      },
      "impact_invalid",
      "options[0].expectedImpact",
    );
  });

  it("fails closed for unreviewed evidence licensing", () => {
    const input = createSyntheticRecommendationInput();
    expectIssue(
      {
        ...input,
        evidence: input.evidence.map((evidence, index) =>
          index === 0
            ? { ...evidence, commercialUse: "not_reviewed" as const }
            : evidence,
        ),
      },
      "commercial_use_blocked",
      "evidence[0].commercialUse",
    );
  });

  it("rejects explanation references to missing evidence", () => {
    const input = createSyntheticRecommendationInput();
    const missing = createRecommendationEvidenceId("missing-evidence");
    expectIssue(
      {
        ...input,
        options: [
          {
            ...SYNTHETIC_TRANSFER_OPTION,
            explanation: {
              ...SYNTHETIC_TRANSFER_OPTION.explanation,
              supportingEvidenceRefs: [missing],
            },
          },
          SYNTHETIC_ROLL_OPTION,
        ],
      },
      "reference_missing",
      "options[0].explanation.supportingEvidenceRefs[0]",
    );
  });

  it("rejects actions outside the declared planning horizon", () => {
    const input = createSyntheticRecommendationInput();
    expectIssue(
      {
        ...input,
        options: [
          {
            ...SYNTHETIC_TRANSFER_OPTION,
            actions: [
              {
                kind: "transfer",
                outPlayerId: SYNTHETIC_PLAYERS[12]!.id,
                inPlayerId: SYNTHETIC_PLAYERS[13]!.id,
                gameweekId: createGameweekId(input.rulesIdentity.seasonId, 4),
              },
            ],
          },
          SYNTHETIC_ROLL_OPTION,
        ],
      },
      "horizon_invalid",
      "options[0].actions[0].gameweekId",
    );
  });

  it("rejects a roll-transfer option combined with another action", () => {
    const input = createSyntheticRecommendationInput();
    expectIssue(
      {
        ...input,
        options: [
          SYNTHETIC_TRANSFER_OPTION,
          {
            ...SYNTHETIC_ROLL_OPTION,
            actions: [
              ...SYNTHETIC_ROLL_OPTION.actions,
              {
                kind: "activate_chip",
                chipId: "synthetic-chip-a",
                gameweekId: SYNTHETIC_ROLL_OPTION.horizon.from,
              },
            ],
          },
        ],
      },
      "action_invalid",
      "options[1].actions",
    );
  });

  it("rejects a player proposed for both lineup and bench", () => {
    const input = createSyntheticRecommendationInput();
    const gameweekId = SYNTHETIC_TRANSFER_OPTION.horizon.from;
    const playerId = SYNTHETIC_PLAYERS[0]!.id;
    expectIssue(
      {
        ...input,
        kind: "lineup",
        options: [
          withActions(SYNTHETIC_TRANSFER_OPTION, [
            { kind: "select_starter", playerId, gameweekId },
            {
              kind: "set_bench_order",
              playerId,
              order: 1,
              gameweekId,
            },
          ]),
          withActions(SYNTHETIC_ROLL_OPTION, [
            {
              kind: "select_starter",
              playerId: SYNTHETIC_PLAYERS[1]!.id,
              gameweekId,
            },
          ]),
        ],
      },
      "action_invalid",
      "options[0].actions",
    );
  });

  it("rejects captaincy options without exactly one captain and vice-captain", () => {
    const input = createSyntheticRecommendationInput();
    const gameweekId = SYNTHETIC_TRANSFER_OPTION.horizon.from;
    expectIssue(
      {
        ...input,
        kind: "captaincy",
        options: [
          withActions(SYNTHETIC_TRANSFER_OPTION, [
            {
              kind: "set_captain",
              playerId: SYNTHETIC_PLAYERS[7]!.id,
              gameweekId,
            },
          ]),
          withActions(SYNTHETIC_ROLL_OPTION, [
            {
              kind: "set_captain",
              playerId: SYNTHETIC_PLAYERS[8]!.id,
              gameweekId,
            },
            {
              kind: "set_vice_captain",
              playerId: SYNTHETIC_PLAYERS[9]!.id,
              gameweekId,
            },
          ]),
        ],
      },
      "action_invalid",
      "options[0].actions",
    );
  });

  it("rejects unsatisfied constraints from ranked options", () => {
    const input = createSyntheticRecommendationInput();
    expectIssue(
      {
        ...input,
        options: [
          {
            ...SYNTHETIC_TRANSFER_OPTION,
            constraints: SYNTHETIC_TRANSFER_OPTION.constraints.map(
              (constraint) => ({ ...constraint, satisfied: false }),
            ),
          },
          SYNTHETIC_ROLL_OPTION,
        ],
      },
      "constraint_unsatisfied",
      "options[0].constraints[0]",
    );
  });

  it("rejects evidence ingested after recommendation generation", () => {
    const input = createSyntheticRecommendationInput();
    expectIssue(
      {
        ...input,
        evidence: input.evidence.map((evidence, index) =>
          index === 0
            ? {
                ...evidence,
                ingestedAt: createUtcInstant("2026-08-18T13:00:00Z"),
              }
            : evidence,
        ),
      },
      "time_invalid",
      "evidence[0]",
    );
  });

  it("returns all contract issues without reading a machine clock", () => {
    const input = createSyntheticRecommendationInput();
    const issues = validateRecommendationInput({
      ...input,
      algorithm: { ...input.algorithm, name: " " },
      options: [],
    });

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["options_missing", "empty_value"]),
    );
  });

  it("fails closed for recommendation kinds unknown to the contract version", () => {
    const input = createSyntheticRecommendationInput();
    expectIssue(
      {
        ...input,
        kind: "unknown" as unknown as CreateRecommendationInput["kind"],
      },
      "invalid_value",
      "kind",
    );
  });
});
