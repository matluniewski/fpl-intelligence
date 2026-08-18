import type {
  FixtureId,
  PlayerId,
  ProvenanceId,
  RulesetId,
  SeasonId,
  TeamId,
} from "./identifiers";
import type { FplMoney, UtcInstant, Version } from "./primitives";

export const POSITIONS = [
  "goalkeeper",
  "defender",
  "midfielder",
  "forward",
] as const;

export type Position = (typeof POSITIONS)[number];

export interface GameweekId {
  readonly seasonId: SeasonId;
  readonly number: number;
}

export interface RulesIdentity {
  readonly rulesetId: RulesetId;
  readonly version: Version;
  readonly seasonId: SeasonId;
}

export interface Season {
  readonly id: SeasonId;
  readonly label: string;
  readonly provenanceRefs: readonly ProvenanceId[];
}

export interface Gameweek {
  readonly id: GameweekId;
  readonly label: string;
  readonly deadline: UtcInstant | null;
  readonly state: "scheduled" | "active" | "complete" | "unknown";
  readonly provenanceRefs: readonly ProvenanceId[];
}

export interface Team {
  readonly id: TeamId;
  readonly name: string;
  readonly shortName: string;
  readonly provenanceRefs: readonly ProvenanceId[];
}

export interface PlayerAvailability {
  readonly status:
    "available" | "doubtful" | "unavailable" | "suspended" | "unknown";
  readonly asOf: UtcInstant;
  readonly provenanceRefs: readonly ProvenanceId[];
}

export interface Player {
  readonly id: PlayerId;
  readonly displayName: string;
  readonly teamId: TeamId;
  readonly position: Position;
  readonly currentPrice: FplMoney | null;
  readonly availability: PlayerAvailability;
  readonly provenanceRefs: readonly ProvenanceId[];
}

export interface Fixture {
  readonly id: FixtureId;
  readonly gameweekId: GameweekId | null;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly kickoff: UtcInstant | null;
  readonly state:
    "scheduled" | "started" | "finished" | "postponed" | "unknown";
  readonly provenanceRefs: readonly ProvenanceId[];
}

export interface PositionRule {
  readonly squadCount: number;
  readonly minimumStarters: number;
  readonly maximumStarters: number;
}

export interface SquadRules {
  readonly identity: RulesIdentity;
  readonly squadSize: number;
  readonly lineupSize: number;
  readonly benchSize: number;
  readonly positions: Readonly<Record<Position, PositionRule>>;
  readonly maxPlayersPerTeam: number;
  readonly captainMustStart: boolean;
  readonly freeTransfers: {
    readonly minimum: number;
    readonly maximum: number;
  };
  readonly chipIds: readonly string[];
}

export interface ReferenceDataSnapshot {
  readonly season: Season;
  readonly gameweek: Gameweek;
  readonly rules: SquadRules;
  readonly teams: readonly Team[];
  readonly players: readonly Player[];
  readonly fixtures: readonly Fixture[];
  readonly provenanceRefs: readonly ProvenanceId[];
}

export type ReferenceDataValidationCode =
  | "rules_invalid"
  | "season_mismatch"
  | "duplicate_identity"
  | "team_unknown"
  | "fixture_invalid"
  | "price_invalid"
  | "provenance_missing";

export interface ReferenceDataValidationIssue {
  readonly code: ReferenceDataValidationCode;
  readonly path: string;
  readonly message: string;
}

export function createGameweekId(
  seasonId: SeasonId,
  number: number,
): GameweekId {
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new RangeError("Gameweek number must be a positive integer.");
  }

  return Object.freeze({ seasonId, number });
}

export function gameweekIdsEqual(left: GameweekId, right: GameweekId): boolean {
  return left.seasonId === right.seasonId && left.number === right.number;
}

export function rulesIdentitiesEqual(
  left: RulesIdentity,
  right: RulesIdentity,
): boolean {
  return (
    left.rulesetId === right.rulesetId &&
    left.version === right.version &&
    left.seasonId === right.seasonId
  );
}

export function validateSquadRules(rules: SquadRules): void {
  const integerFields = [
    rules.squadSize,
    rules.lineupSize,
    rules.benchSize,
    rules.maxPlayersPerTeam,
    rules.freeTransfers.minimum,
    rules.freeTransfers.maximum,
  ];

  if (
    integerFields.some((value) => !Number.isSafeInteger(value) || value < 0)
  ) {
    throw new RangeError("Squad rule counts must be non-negative integers.");
  }

  if (rules.squadSize !== rules.lineupSize + rules.benchSize) {
    throw new RangeError("Squad size must equal lineup size plus bench size.");
  }

  if (rules.lineupSize <= 0 || rules.maxPlayersPerTeam <= 0) {
    throw new RangeError("Lineup and per-team limits must be positive.");
  }

  if (rules.freeTransfers.minimum > rules.freeTransfers.maximum) {
    throw new RangeError("Free-transfer bounds are inverted.");
  }

  let requiredSquadSize = 0;
  let minimumLineupSize = 0;
  let maximumLineupSize = 0;

  for (const position of POSITIONS) {
    const rule = rules.positions[position];
    const values = [
      rule.squadCount,
      rule.minimumStarters,
      rule.maximumStarters,
    ];

    if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
      throw new RangeError(`Invalid ${position} position rule.`);
    }

    if (
      rule.minimumStarters > rule.maximumStarters ||
      rule.maximumStarters > rule.squadCount
    ) {
      throw new RangeError(`Inconsistent ${position} position rule.`);
    }

    requiredSquadSize += rule.squadCount;
    minimumLineupSize += rule.minimumStarters;
    maximumLineupSize += rule.maximumStarters;
  }

  if (requiredSquadSize !== rules.squadSize) {
    throw new RangeError("Position counts must add up to the squad size.");
  }

  if (
    minimumLineupSize > rules.lineupSize ||
    maximumLineupSize < rules.lineupSize
  ) {
    throw new RangeError(
      "Position rules cannot produce the required lineup size.",
    );
  }

  const uniqueChipIds = new Set(rules.chipIds);
  if (
    uniqueChipIds.size !== rules.chipIds.length ||
    rules.chipIds.some((chipId) => chipId.trim().length === 0)
  ) {
    throw new RangeError("Chip identifiers must be non-empty and unique.");
  }
}

function hasValidMoney(value: FplMoney): boolean {
  return (
    value.unit === "tenths_of_million" &&
    Number.isSafeInteger(value.tenths) &&
    value.tenths >= 0
  );
}

export function validateReferenceDataSnapshot(
  snapshot: ReferenceDataSnapshot,
): readonly ReferenceDataValidationIssue[] {
  const issues: ReferenceDataValidationIssue[] = [];

  try {
    validateSquadRules(snapshot.rules);
  } catch (error) {
    issues.push({
      code: "rules_invalid",
      path: "rules",
      message: error instanceof Error ? error.message : "Rules are invalid.",
    });
  }

  if (
    snapshot.gameweek.id.seasonId !== snapshot.season.id ||
    snapshot.rules.identity.seasonId !== snapshot.season.id
  ) {
    issues.push({
      code: "season_mismatch",
      path: "season",
      message: "Season, gameweek, and rules identities must agree.",
    });
  }

  if (
    snapshot.provenanceRefs.length === 0 ||
    snapshot.season.provenanceRefs.length === 0 ||
    snapshot.gameweek.provenanceRefs.length === 0
  ) {
    issues.push({
      code: "provenance_missing",
      path: "provenanceRefs",
      message: "Snapshot, season, and gameweek must retain provenance.",
    });
  }

  const teamIds = new Set<TeamId>();
  for (const [index, team] of snapshot.teams.entries()) {
    if (teamIds.has(team.id)) {
      issues.push({
        code: "duplicate_identity",
        path: `teams[${index}].id`,
        message: "Team identifiers must be unique.",
      });
    }
    teamIds.add(team.id);

    if (team.provenanceRefs.length === 0) {
      issues.push({
        code: "provenance_missing",
        path: `teams[${index}].provenanceRefs`,
        message: "Normalized team data must retain provenance.",
      });
    }
  }

  const playerIds = new Set<PlayerId>();
  for (const [index, player] of snapshot.players.entries()) {
    if (playerIds.has(player.id)) {
      issues.push({
        code: "duplicate_identity",
        path: `players[${index}].id`,
        message: "Player identifiers must be unique.",
      });
    }
    playerIds.add(player.id);

    if (!teamIds.has(player.teamId)) {
      issues.push({
        code: "team_unknown",
        path: `players[${index}].teamId`,
        message: "Player references an unknown normalized team.",
      });
    }

    if (player.currentPrice !== null && !hasValidMoney(player.currentPrice)) {
      issues.push({
        code: "price_invalid",
        path: `players[${index}].currentPrice`,
        message: "Player price has invalid FPL money semantics.",
      });
    }

    if (player.provenanceRefs.length === 0) {
      issues.push({
        code: "provenance_missing",
        path: `players[${index}].provenanceRefs`,
        message: "Normalized player data must retain provenance.",
      });
    }

    if (player.availability.provenanceRefs.length === 0) {
      issues.push({
        code: "provenance_missing",
        path: `players[${index}].availability.provenanceRefs`,
        message: "Player availability must retain its own provenance.",
      });
    }
  }

  const fixtureIds = new Set<FixtureId>();
  for (const [index, fixture] of snapshot.fixtures.entries()) {
    if (fixtureIds.has(fixture.id)) {
      issues.push({
        code: "duplicate_identity",
        path: `fixtures[${index}].id`,
        message: "Fixture identifiers must be unique.",
      });
    }
    fixtureIds.add(fixture.id);

    if (
      !teamIds.has(fixture.homeTeamId) ||
      !teamIds.has(fixture.awayTeamId) ||
      fixture.homeTeamId === fixture.awayTeamId
    ) {
      issues.push({
        code: "fixture_invalid",
        path: `fixtures[${index}]`,
        message: "Fixture teams must exist and be distinct.",
      });
    }

    if (
      fixture.gameweekId !== null &&
      fixture.gameweekId.seasonId !== snapshot.season.id
    ) {
      issues.push({
        code: "season_mismatch",
        path: `fixtures[${index}].gameweekId`,
        message: "Fixture gameweek belongs to a different season.",
      });
    }

    if (fixture.provenanceRefs.length === 0) {
      issues.push({
        code: "provenance_missing",
        path: `fixtures[${index}].provenanceRefs`,
        message: "Normalized fixture data must retain provenance.",
      });
    }
  }

  return Object.freeze(issues);
}
