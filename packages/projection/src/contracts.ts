import type {
  FixtureId,
  GameweekId,
  PlayerId,
  Position,
  ProvenanceId,
  RulesIdentity,
  TeamId,
  UtcInstant,
  Version,
} from "@fpl-intelligence/domain";

export interface ProjectionScoringRules {
  readonly identity: RulesIdentity;
  readonly provenanceRefs: readonly ProvenanceId[];
  readonly appearance: {
    readonly upTo59Minutes: number;
    readonly atLeast60Minutes: number;
  };
  readonly goal: Readonly<Record<Position, number>>;
  readonly assist: number;
  readonly cleanSheet: Readonly<Record<Position, number>>;
  readonly goalsConceded: {
    readonly perPenaltyUnit: number;
    readonly goalsPerPenaltyUnit: number;
    readonly positions: readonly Position[];
  };
  readonly save: {
    readonly pointsPerUnit: number;
    readonly savesPerUnit: number;
  };
  readonly penaltySave: number;
  readonly penaltyMiss: number;
  readonly ownGoal: number;
  readonly yellowCard: number;
  readonly redCard: number;
}

export interface PlayerPerformanceRates {
  readonly goals: number;
  readonly assists: number;
  readonly saves: number;
  readonly penaltySaves: number;
  readonly penaltyMisses: number;
  readonly ownGoals: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly bonusPoints: number;
  readonly defensiveContributionPoints: number;
}

export type ProjectionSignalKind = "recent" | "season" | "other_reviewed";

export interface ProjectionRateSignal {
  readonly signalId: string;
  readonly kind: ProjectionSignalKind;
  readonly weight: number;
  readonly observedAt: UtcInstant;
  readonly sampleSize: number;
  readonly ratesPer90: PlayerPerformanceRates;
  readonly provenanceRefs: readonly ProvenanceId[];
}

export interface ProjectionFixtureInput {
  readonly fixtureId: FixtureId;
  readonly opponentTeamId: TeamId;
  readonly venue: "home" | "away" | "neutral";
  readonly expectedMinutes: number;
  readonly appearanceProbability: number;
  readonly startProbability: number;
  readonly sixtyMinuteProbability: number;
  readonly attackingMultiplier: number;
  readonly cleanSheetProbability: number;
  readonly expectedGoalsConceded: number;
  readonly observedAt: UtcInstant;
  readonly provenanceRefs: readonly ProvenanceId[];
}

export interface PlayerGameweekProjectionInput {
  readonly playerId: PlayerId;
  readonly position: Position;
  readonly gameweekId: GameweekId;
  readonly rules: ProjectionScoringRules;
  readonly evaluatedAt: UtcInstant;
  readonly modelVersion: Version;
  readonly freshness: {
    readonly maximumInputAgeHours: number;
  };
  readonly rateSignals: readonly ProjectionRateSignal[];
  readonly fixtures: readonly ProjectionFixtureInput[];
}

export type ProjectionComponentCode =
  | "appearance"
  | "goals"
  | "assists"
  | "clean_sheet"
  | "goals_conceded"
  | "saves"
  | "penalty_saves"
  | "penalty_misses"
  | "own_goals"
  | "yellow_cards"
  | "red_cards"
  | "bonus"
  | "defensive_contributions";

export interface ProjectionComponent {
  readonly code: ProjectionComponentCode;
  readonly expectedPoints: number;
  readonly formula: string;
}

export interface FixtureProjectionBreakdown {
  readonly fixtureId: FixtureId;
  readonly opponentTeamId: TeamId;
  readonly venue: ProjectionFixtureInput["venue"];
  readonly expectedPoints: number;
  readonly expectedMinutes: number;
  readonly appearanceProbability: number;
  readonly startProbability: number;
  readonly sixtyMinuteProbability: number;
  readonly attackingMultiplier: number;
  readonly cleanSheetProbability: number;
  readonly expectedGoalsConceded: number;
  readonly observedAt: UtcInstant;
  readonly components: readonly ProjectionComponent[];
}

export interface ProjectionInputSummary {
  readonly evaluatedAt: UtcInstant;
  readonly sourceObservedAt: readonly UtcInstant[];
  readonly signalWeights: readonly {
    readonly signalId: string;
    readonly kind: ProjectionSignalKind;
    readonly weight: number;
    readonly sampleSize: number;
    readonly observedAt: UtcInstant;
    readonly ratesPer90: PlayerPerformanceRates;
  }[];
  readonly blendedRatesPer90: PlayerPerformanceRates;
  readonly fixtureCount: number;
}

export interface ProjectionExplanation {
  readonly modelVersion: Version;
  readonly rulesIdentity: RulesIdentity;
  readonly assumptions: readonly string[];
  readonly inputSummary: ProjectionInputSummary;
  readonly fixtureBreakdowns: readonly FixtureProjectionBreakdown[];
  readonly provenanceRefs: readonly ProvenanceId[];
  readonly warnings: readonly string[];
}

export interface PlayerGameweekProjection {
  readonly playerId: PlayerId;
  readonly position: Position;
  readonly gameweekId: GameweekId;
  readonly expectedPoints: number;
  readonly explanation: ProjectionExplanation;
}
