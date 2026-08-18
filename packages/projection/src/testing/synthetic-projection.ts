import {
  SYNTHETIC_GAMEWEEK_ID,
  SYNTHETIC_PLAYERS,
  SYNTHETIC_PROVENANCE,
  SYNTHETIC_RULES,
  SYNTHETIC_TEAMS,
} from "@fpl-intelligence/domain/testing";
import {
  createFixtureId,
  createUtcInstant,
  createVersion,
} from "@fpl-intelligence/domain";
import type { Position } from "@fpl-intelligence/domain";

import type {
  PlayerGameweekProjectionInput,
  PlayerPerformanceRates,
  ProjectionFixtureInput,
  ProjectionRateSignal,
  ProjectionScoringRules,
} from "../contracts";

export const SYNTHETIC_PROJECTION_EVALUATED_AT = createUtcInstant(
  "2026-08-18T12:00:00Z",
);

export const SYNTHETIC_PROJECTION_RULES: ProjectionScoringRules = Object.freeze(
  {
    identity: SYNTHETIC_RULES.identity,
    provenanceRefs: Object.freeze([SYNTHETIC_PROVENANCE.provenanceId]),
    appearance: Object.freeze({
      upTo59Minutes: 1,
      atLeast60Minutes: 2,
    }),
    goal: Object.freeze({
      goalkeeper: 6,
      defender: 6,
      midfielder: 5,
      forward: 4,
    }),
    assist: 3,
    cleanSheet: Object.freeze({
      goalkeeper: 4,
      defender: 4,
      midfielder: 1,
      forward: 0,
    }),
    goalsConceded: Object.freeze({
      perPenaltyUnit: -1,
      goalsPerPenaltyUnit: 2,
      positions: Object.freeze(["goalkeeper", "defender"] as const),
    }),
    save: Object.freeze({ pointsPerUnit: 1, savesPerUnit: 3 }),
    penaltySave: 5,
    penaltyMiss: -2,
    ownGoal: -2,
    yellowCard: -1,
    redCard: -3,
  },
);

export const SYNTHETIC_PERFORMANCE_RATES: PlayerPerformanceRates =
  Object.freeze({
    goals: 0.3,
    assists: 0.2,
    saves: 3,
    penaltySaves: 0.01,
    penaltyMisses: 0.01,
    ownGoals: 0.01,
    yellowCards: 0.1,
    redCards: 0.01,
    bonusPoints: 0.4,
    defensiveContributionPoints: 0.2,
  });

const provenanceRefs = Object.freeze([SYNTHETIC_PROVENANCE.provenanceId]);

export const SYNTHETIC_RATE_SIGNALS: readonly ProjectionRateSignal[] =
  Object.freeze([
    Object.freeze({
      signalId: "synthetic-season-signal",
      kind: "season" as const,
      weight: 0.7,
      observedAt: SYNTHETIC_PROJECTION_EVALUATED_AT,
      sampleSize: 12,
      ratesPer90: SYNTHETIC_PERFORMANCE_RATES,
      provenanceRefs,
    }),
    Object.freeze({
      signalId: "synthetic-recent-signal",
      kind: "recent" as const,
      weight: 0.3,
      observedAt: SYNTHETIC_PROJECTION_EVALUATED_AT,
      sampleSize: 4,
      ratesPer90: Object.freeze({
        ...SYNTHETIC_PERFORMANCE_RATES,
        goals: 0.4,
        assists: 0.25,
      }),
      provenanceRefs,
    }),
  ]);

export const SYNTHETIC_PROJECTION_FIXTURE: ProjectionFixtureInput =
  Object.freeze({
    fixtureId: createFixtureId("synthetic-projection-fixture"),
    opponentTeamId: SYNTHETIC_TEAMS[1]!.id,
    venue: "home",
    expectedMinutes: 70,
    appearanceProbability: 0.9,
    startProbability: 0.8,
    sixtyMinuteProbability: 0.7,
    attackingMultiplier: 1.1,
    cleanSheetProbability: 0.4,
    expectedGoalsConceded: 1.2,
    observedAt: SYNTHETIC_PROJECTION_EVALUATED_AT,
    provenanceRefs,
  });

const playerIndexByPosition: Readonly<Record<Position, number>> = Object.freeze(
  {
    goalkeeper: 0,
    defender: 2,
    midfielder: 7,
    forward: 12,
  },
);

export function createSyntheticProjectionInput(
  position: Position = "midfielder",
): PlayerGameweekProjectionInput {
  const player = SYNTHETIC_PLAYERS[playerIndexByPosition[position]]!;
  return Object.freeze({
    playerId: player.id,
    position,
    gameweekId: SYNTHETIC_GAMEWEEK_ID,
    rules: SYNTHETIC_PROJECTION_RULES,
    evaluatedAt: SYNTHETIC_PROJECTION_EVALUATED_AT,
    modelVersion: createVersion("projection-v0-synthetic"),
    freshness: Object.freeze({ maximumInputAgeHours: 48 }),
    rateSignals: SYNTHETIC_RATE_SIGNALS,
    fixtures: Object.freeze([SYNTHETIC_PROJECTION_FIXTURE]),
  });
}
