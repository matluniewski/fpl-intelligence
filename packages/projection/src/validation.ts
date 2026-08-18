import type { Position, UtcInstant } from "@fpl-intelligence/domain";

import type {
  PlayerGameweekProjectionInput,
  PlayerPerformanceRates,
  ProjectionScoringRules,
} from "./contracts";
import type { ProjectionInputIssue } from "./errors";

const POSITION_KEYS: readonly Position[] = [
  "goalkeeper",
  "defender",
  "midfielder",
  "forward",
];

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

function addFiniteIssue(
  issues: ProjectionInputIssue[],
  value: number,
  path: string,
  options: { readonly minimum?: number; readonly maximum?: number } = {},
): void {
  const minimum = options.minimum ?? Number.NEGATIVE_INFINITY;
  const maximum = options.maximum ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    issues.push({
      code: "invalid_value",
      path,
      message: `Value must be finite and between ${minimum} and ${maximum}.`,
    });
  }
}

function validateRules(
  rules: ProjectionScoringRules,
  issues: ProjectionInputIssue[],
): void {
  if (rules.provenanceRefs.length === 0) {
    issues.push({
      code: "missing_provenance",
      path: "rules.provenanceRefs",
      message: "Projection scoring rules must retain provenance.",
    });
  }
  addFiniteIssue(
    issues,
    rules.appearance.upTo59Minutes,
    "rules.appearance.upTo59Minutes",
    { minimum: 0 },
  );
  addFiniteIssue(
    issues,
    rules.appearance.atLeast60Minutes,
    "rules.appearance.atLeast60Minutes",
    { minimum: 0 },
  );
  addFiniteIssue(issues, rules.assist, "rules.assist", { minimum: 0 });
  addFiniteIssue(
    issues,
    rules.goalsConceded.goalsPerPenaltyUnit,
    "rules.goalsConceded.goalsPerPenaltyUnit",
    { minimum: Number.EPSILON },
  );
  addFiniteIssue(
    issues,
    rules.goalsConceded.perPenaltyUnit,
    "rules.goalsConceded.perPenaltyUnit",
    { maximum: 0 },
  );
  addFiniteIssue(issues, rules.save.savesPerUnit, "rules.save.savesPerUnit", {
    minimum: Number.EPSILON,
  });
  addFiniteIssue(issues, rules.save.pointsPerUnit, "rules.save.pointsPerUnit", {
    minimum: 0,
  });
  addFiniteIssue(issues, rules.penaltySave, "rules.penaltySave", {
    minimum: 0,
  });
  addFiniteIssue(issues, rules.penaltyMiss, "rules.penaltyMiss", {
    maximum: 0,
  });
  addFiniteIssue(issues, rules.ownGoal, "rules.ownGoal", { maximum: 0 });
  addFiniteIssue(issues, rules.yellowCard, "rules.yellowCard", { maximum: 0 });
  addFiniteIssue(issues, rules.redCard, "rules.redCard", { maximum: 0 });

  const penaltyPositions = new Set(rules.goalsConceded.positions);
  if (penaltyPositions.size !== rules.goalsConceded.positions.length) {
    issues.push({
      code: "duplicate_identity",
      path: "rules.goalsConceded.positions",
      message: "Goals-conceded positions must be unique.",
    });
  }
  if (
    rules.goalsConceded.positions.some(
      (position) => !POSITION_KEYS.includes(position),
    )
  ) {
    issues.push({
      code: "invalid_value",
      path: "rules.goalsConceded.positions",
      message: "Goals-conceded positions must be recognized positions.",
    });
  }

  for (const position of POSITION_KEYS) {
    addFiniteIssue(issues, rules.goal[position], `rules.goal.${position}`, {
      minimum: 0,
    });
    addFiniteIssue(
      issues,
      rules.cleanSheet[position],
      `rules.cleanSheet.${position}`,
      { minimum: 0 },
    );
  }
}

function validateObservation(
  observedAt: UtcInstant,
  evaluatedAt: UtcInstant,
  maximumInputAgeHours: number,
  path: string,
  issues: ProjectionInputIssue[],
): void {
  const observedMilliseconds = Date.parse(observedAt);
  const evaluatedMilliseconds = Date.parse(evaluatedAt);
  const ageHours =
    (evaluatedMilliseconds - observedMilliseconds) / (60 * 60 * 1000);

  if (ageHours < 0) {
    issues.push({
      code: "future_observation",
      path,
      message: "Observation time cannot be later than evaluation time.",
    });
  } else if (ageHours > maximumInputAgeHours) {
    issues.push({
      code: "stale_input",
      path,
      message: `Observation is ${ageHours} hours old; maximum is ${maximumInputAgeHours}.`,
    });
  }
}

export function validateProjectionInput(
  input: PlayerGameweekProjectionInput,
): readonly ProjectionInputIssue[] {
  const issues: ProjectionInputIssue[] = [];
  validateRules(input.rules, issues);

  if (input.rules.identity.seasonId !== input.gameweekId.seasonId) {
    issues.push({
      code: "season_mismatch",
      path: "rules.identity.seasonId",
      message: "Projection rules and gameweek must belong to the same season.",
    });
  }

  addFiniteIssue(
    issues,
    input.freshness.maximumInputAgeHours,
    "freshness.maximumInputAgeHours",
    { minimum: Number.EPSILON },
  );

  if (input.rateSignals.length === 0) {
    issues.push({
      code: "weights_invalid",
      path: "rateSignals",
      message: "At least one rate signal is required.",
    });
  }

  const signalIds = new Set<string>();
  let totalWeight = 0;
  for (const [index, signal] of input.rateSignals.entries()) {
    const path = `rateSignals[${index}]`;
    if (signal.signalId.trim().length === 0 || signalIds.has(signal.signalId)) {
      issues.push({
        code: "duplicate_identity",
        path: `${path}.signalId`,
        message: "Signal identifiers must be non-empty and unique.",
      });
    }
    signalIds.add(signal.signalId);
    addFiniteIssue(issues, signal.weight, `${path}.weight`, {
      minimum: Number.EPSILON,
      maximum: 1,
    });
    totalWeight += signal.weight;
    if (!Number.isSafeInteger(signal.sampleSize) || signal.sampleSize <= 0) {
      issues.push({
        code: "invalid_value",
        path: `${path}.sampleSize`,
        message: "Signal sample size must be a positive integer.",
      });
    }
    for (const rate of RATE_KEYS) {
      addFiniteIssue(
        issues,
        signal.ratesPer90[rate],
        `${path}.ratesPer90.${rate}`,
        {
          minimum: 0,
        },
      );
    }
    if (signal.provenanceRefs.length === 0) {
      issues.push({
        code: "missing_provenance",
        path: `${path}.provenanceRefs`,
        message: "Every rate signal must retain provenance.",
      });
    }
    validateObservation(
      signal.observedAt,
      input.evaluatedAt,
      input.freshness.maximumInputAgeHours,
      `${path}.observedAt`,
      issues,
    );
  }

  if (Math.abs(totalWeight - 1) > 1e-9) {
    issues.push({
      code: "weights_invalid",
      path: "rateSignals",
      message: "Rate-signal weights must sum to exactly 1.",
    });
  }

  const fixtureIds = new Set<string>();
  for (const [index, fixture] of input.fixtures.entries()) {
    const path = `fixtures[${index}]`;
    if (fixtureIds.has(fixture.fixtureId)) {
      issues.push({
        code: "duplicate_identity",
        path: `${path}.fixtureId`,
        message: "Fixture identifiers must be unique within a projection.",
      });
    }
    fixtureIds.add(fixture.fixtureId);

    addFiniteIssue(issues, fixture.expectedMinutes, `${path}.expectedMinutes`, {
      minimum: 0,
      maximum: 90,
    });
    addFiniteIssue(
      issues,
      fixture.appearanceProbability,
      `${path}.appearanceProbability`,
      { minimum: 0, maximum: 1 },
    );
    addFiniteIssue(
      issues,
      fixture.startProbability,
      `${path}.startProbability`,
      { minimum: 0, maximum: 1 },
    );
    addFiniteIssue(
      issues,
      fixture.sixtyMinuteProbability,
      `${path}.sixtyMinuteProbability`,
      { minimum: 0, maximum: 1 },
    );
    addFiniteIssue(
      issues,
      fixture.attackingMultiplier,
      `${path}.attackingMultiplier`,
      { minimum: 0 },
    );
    addFiniteIssue(
      issues,
      fixture.cleanSheetProbability,
      `${path}.cleanSheetProbability`,
      { minimum: 0, maximum: 1 },
    );
    addFiniteIssue(
      issues,
      fixture.expectedGoalsConceded,
      `${path}.expectedGoalsConceded`,
      { minimum: 0 },
    );

    if (
      fixture.sixtyMinuteProbability > fixture.startProbability ||
      fixture.startProbability > fixture.appearanceProbability ||
      fixture.expectedMinutes > 90 * fixture.appearanceProbability + 1e-9
    ) {
      issues.push({
        code: "probabilities_inconsistent",
        path,
        message:
          "Sixty-minute probability must not exceed start probability, start probability must not exceed appearance probability, and expected minutes must fit the appearance probability.",
      });
    }

    if (fixture.provenanceRefs.length === 0) {
      issues.push({
        code: "missing_provenance",
        path: `${path}.provenanceRefs`,
        message: "Every fixture input must retain provenance.",
      });
    }
    validateObservation(
      fixture.observedAt,
      input.evaluatedAt,
      input.freshness.maximumInputAgeHours,
      `${path}.observedAt`,
      issues,
    );
  }

  return Object.freeze(issues);
}
