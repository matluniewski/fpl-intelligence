import type { ProvenanceId } from "@fpl-intelligence/domain";

import type {
  FixtureProjectionBreakdown,
  PlayerGameweekProjection,
  PlayerGameweekProjectionInput,
  PlayerPerformanceRates,
  ProjectionComponent,
  ProjectionComponentCode,
} from "./contracts";
import { ProjectionInputError } from "./errors";
import { validateProjectionInput } from "./validation";

const RATE_KEYS: readonly (keyof PlayerPerformanceRates)[] = [
  "goals",
  "assists",
  "saves",
  "penaltySaves",
  "penaltyMisses",
  "ownGoals",
  "yellowCards",
  "redCards",
  "bonusPoints",
  "defensiveContributionPoints",
];

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function blendRates(
  input: PlayerGameweekProjectionInput,
): PlayerPerformanceRates {
  const rates = Object.fromEntries(RATE_KEYS.map((key) => [key, 0])) as {
    -readonly [Key in keyof PlayerPerformanceRates]: number;
  };

  for (const signal of input.rateSignals) {
    for (const key of RATE_KEYS) {
      rates[key] += signal.ratesPer90[key] * signal.weight;
    }
  }

  return Object.freeze(
    Object.fromEntries(RATE_KEYS.map((key) => [key, round(rates[key])])),
  ) as unknown as PlayerPerformanceRates;
}

function component(
  code: ProjectionComponentCode,
  expectedPoints: number,
  formula: string,
): ProjectionComponent {
  return Object.freeze({
    code,
    expectedPoints: round(expectedPoints),
    formula,
  });
}

function uniqueSortedProvenanceRefs(
  input: PlayerGameweekProjectionInput,
): readonly ProvenanceId[] {
  return Object.freeze(
    [
      ...new Set([
        ...input.rules.provenanceRefs,
        ...input.rateSignals.flatMap((signal) => signal.provenanceRefs),
        ...input.fixtures.flatMap((fixture) => fixture.provenanceRefs),
      ]),
    ].sort(),
  );
}

export function projectPlayerGameweek(
  input: PlayerGameweekProjectionInput,
): PlayerGameweekProjection {
  const issues = validateProjectionInput(input);
  if (issues.length > 0) {
    throw new ProjectionInputError(issues);
  }

  const rates = blendRates(input);
  const rules = input.rules;
  const fixtureBreakdowns: FixtureProjectionBreakdown[] = input.fixtures.map(
    (fixture) => {
      const minutesScale = fixture.expectedMinutes / 90;
      const appearance =
        fixture.appearanceProbability * rules.appearance.upTo59Minutes +
        fixture.sixtyMinuteProbability *
          (rules.appearance.atLeast60Minutes - rules.appearance.upTo59Minutes);
      const goals =
        rates.goals *
        minutesScale *
        fixture.attackingMultiplier *
        rules.goal[input.position];
      const assists =
        rates.assists *
        minutesScale *
        fixture.attackingMultiplier *
        rules.assist;
      const cleanSheet =
        fixture.cleanSheetProbability *
        fixture.sixtyMinuteProbability *
        rules.cleanSheet[input.position];
      const goalsConceded = rules.goalsConceded.positions.includes(
        input.position,
      )
        ? (fixture.expectedGoalsConceded /
            rules.goalsConceded.goalsPerPenaltyUnit) *
          fixture.sixtyMinuteProbability *
          rules.goalsConceded.perPenaltyUnit
        : 0;
      const saves =
        input.position === "goalkeeper"
          ? (rates.saves * minutesScale * rules.save.pointsPerUnit) /
            rules.save.savesPerUnit
          : 0;
      const penaltySaves =
        input.position === "goalkeeper"
          ? rates.penaltySaves * minutesScale * rules.penaltySave
          : 0;
      const components: readonly ProjectionComponent[] = Object.freeze([
        component(
          "appearance",
          appearance,
          "appearanceProbability × upTo59Points + sixtyMinuteProbability × (atLeast60Points − upTo59Points)",
        ),
        component(
          "goals",
          goals,
          "blendedGoalsPer90 × expectedMinutes/90 × attackingMultiplier × positionalGoalPoints",
        ),
        component(
          "assists",
          assists,
          "blendedAssistsPer90 × expectedMinutes/90 × attackingMultiplier × assistPoints",
        ),
        component(
          "clean_sheet",
          cleanSheet,
          "cleanSheetProbability × sixtyMinuteProbability × positionalCleanSheetPoints",
        ),
        component(
          "goals_conceded",
          goalsConceded,
          "expectedGoalsConceded ÷ goalsPerPenaltyUnit × sixtyMinuteProbability × penaltyPoints",
        ),
        component(
          "saves",
          saves,
          "blendedSavesPer90 × expectedMinutes/90 ÷ savesPerUnit × pointsPerUnit",
        ),
        component(
          "penalty_saves",
          penaltySaves,
          "blendedPenaltySavesPer90 × expectedMinutes/90 × penaltySavePoints",
        ),
        component(
          "penalty_misses",
          rates.penaltyMisses * minutesScale * rules.penaltyMiss,
          "blendedPenaltyMissesPer90 × expectedMinutes/90 × penaltyMissPoints",
        ),
        component(
          "own_goals",
          rates.ownGoals * minutesScale * rules.ownGoal,
          "blendedOwnGoalsPer90 × expectedMinutes/90 × ownGoalPoints",
        ),
        component(
          "yellow_cards",
          rates.yellowCards * minutesScale * rules.yellowCard,
          "blendedYellowCardsPer90 × expectedMinutes/90 × yellowCardPoints",
        ),
        component(
          "red_cards",
          rates.redCards * minutesScale * rules.redCard,
          "blendedRedCardsPer90 × expectedMinutes/90 × redCardPoints",
        ),
        component(
          "bonus",
          rates.bonusPoints * minutesScale,
          "blendedExpectedBonusPointsPer90 × expectedMinutes/90",
        ),
        component(
          "defensive_contributions",
          rates.defensiveContributionPoints * minutesScale,
          "blendedExpectedDefensiveContributionPointsPer90 × expectedMinutes/90",
        ),
      ]);
      const expectedPoints = round(
        components.reduce((total, item) => total + item.expectedPoints, 0),
      );

      return Object.freeze({
        fixtureId: fixture.fixtureId,
        opponentTeamId: fixture.opponentTeamId,
        venue: fixture.venue,
        expectedPoints,
        expectedMinutes: fixture.expectedMinutes,
        appearanceProbability: fixture.appearanceProbability,
        startProbability: fixture.startProbability,
        sixtyMinuteProbability: fixture.sixtyMinuteProbability,
        attackingMultiplier: fixture.attackingMultiplier,
        cleanSheetProbability: fixture.cleanSheetProbability,
        expectedGoalsConceded: fixture.expectedGoalsConceded,
        observedAt: fixture.observedAt,
        components,
      });
    },
  );

  const expectedPoints = round(
    fixtureBreakdowns.reduce(
      (total, fixture) => total + fixture.expectedPoints,
      0,
    ),
  );
  const sourceObservedAt = Object.freeze(
    [
      ...input.rateSignals.map((signal) => signal.observedAt),
      ...input.fixtures.map((fixture) => fixture.observedAt),
    ].sort(),
  );

  return Object.freeze({
    projectionKey: `${input.playerId}:${input.gameweekId.seasonId}:${input.gameweekId.number}:${input.modelVersion}:${input.rules.identity.rulesetId}:${input.rules.identity.version}`,
    playerId: input.playerId,
    position: input.position,
    gameweekId: input.gameweekId,
    expectedPoints,
    explanation: Object.freeze({
      modelVersion: input.modelVersion,
      rulesIdentity: input.rules.identity,
      assumptions: Object.freeze([
        "baseline_projection_only",
        "news_adjustments_excluded",
        "rates_blended_by_explicit_weights",
        "per90_rates_scaled_by_unconditional_expected_minutes",
        "start_probability_is_reported_and_used_as_a_consistency_bound",
        "goals_conceded_penalty_uses_continuous_expectation_approximation",
        "unrepresented_scoring_components_are_assumed_zero",
      ]),
      inputSummary: Object.freeze({
        evaluatedAt: input.evaluatedAt,
        sourceObservedAt,
        signalWeights: Object.freeze(
          input.rateSignals.map((signal) =>
            Object.freeze({
              signalId: signal.signalId,
              kind: signal.kind,
              weight: signal.weight,
              sampleSize: signal.sampleSize,
              observedAt: signal.observedAt,
              ratesPer90: signal.ratesPer90,
            }),
          ),
        ),
        blendedRatesPer90: rates,
        fixtureCount: input.fixtures.length,
      }),
      fixtureBreakdowns: Object.freeze(fixtureBreakdowns),
      provenanceRefs: uniqueSortedProvenanceRefs(input),
      warnings: Object.freeze(
        input.fixtures.length === 0
          ? ["blank_gameweek_no_scheduled_fixture"]
          : [],
      ),
    }),
  });
}
