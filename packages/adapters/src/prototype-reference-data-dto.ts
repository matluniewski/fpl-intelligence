import type { Position } from "@fpl-intelligence/domain";
import { POSITIONS } from "@fpl-intelligence/domain";
import { ReferenceDataAdapterError } from "./reference-data-errors";

const GAMEWEEK_STATES = ["scheduled", "active", "complete", "unknown"] as const;
const AVAILABILITY_STATES = [
  "available",
  "doubtful",
  "unavailable",
  "suspended",
  "unknown",
] as const;
const FIXTURE_STATES = [
  "scheduled",
  "started",
  "finished",
  "postponed",
  "unknown",
] as const;
type GameweekState = (typeof GAMEWEEK_STATES)[number];
type AvailabilityState = (typeof AVAILABILITY_STATES)[number];
type FixtureState = (typeof FIXTURE_STATES)[number];

interface PositionRuleDto {
  readonly squad_count: number;
  readonly minimum_starters: number;
  readonly maximum_starters: number;
}

interface PrototypeRulesDto {
  readonly ruleset_external_id: string;
  readonly version: string;
  readonly squad_size: number;
  readonly lineup_size: number;
  readonly bench_size: number;
  readonly positions: Readonly<Record<Position, PositionRuleDto>>;
  readonly max_players_per_team: number;
  readonly captain_must_start: boolean;
  readonly free_transfers: Readonly<{
    minimum: number;
    maximum: number;
  }>;
  readonly chip_ids: readonly string[];
}

interface PrototypeTeamDto {
  readonly external_id: string;
  readonly name: string;
  readonly short_name: string;
}

interface PrototypePlayerDto {
  readonly external_id: string;
  readonly display_name: string;
  readonly team_external_id: string;
  readonly position: Position;
  readonly current_price_tenths: number | null;
  readonly availability: AvailabilityState;
  readonly availability_as_of: string;
}

interface PrototypeFixtureDto {
  readonly external_id: string;
  readonly gameweek_number: number | null;
  readonly home_team_external_id: string;
  readonly away_team_external_id: string;
  readonly kickoff: string | null;
  readonly state: FixtureState;
}

export interface PrototypeReferenceDataDto {
  readonly schema_version: string;
  readonly snapshot: Readonly<{
    season: Readonly<{ external_id: string; label: string }>;
    gameweek: Readonly<{
      number: number;
      label: string;
      deadline: string | null;
      state: GameweekState;
    }>;
    rules: PrototypeRulesDto;
    teams: readonly PrototypeTeamDto[];
    players: readonly PrototypePlayerDto[];
    fixtures: readonly PrototypeFixtureDto[];
  }>;
}

function invalid(path: string): never {
  throw new ReferenceDataAdapterError(
    "invalid_payload",
    `Reference-data payload is invalid at ${path}.`,
    { path },
  );
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalid(path);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return invalid(path);
  }
  return value.trim();
}

function integer(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value)) {
    return invalid(path);
  }
  return value as number;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    return invalid(path);
  }
  return value;
}

function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : string(value, path);
}

function nullableInteger(value: unknown, path: string): number | null {
  return value === null ? null : integer(value, path);
}

function enumeration<const TValue extends readonly string[]>(
  value: unknown,
  allowed: TValue,
  path: string,
): TValue[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    return invalid(path);
  }
  return value as TValue[number];
}

function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    return invalid(path);
  }
  return value;
}

function stringArray(value: unknown, path: string): readonly string[] {
  return Object.freeze(
    array(value, path).map((item, index) => string(item, `${path}[${index}]`)),
  );
}

function parsePositionRule(value: unknown, path: string): PositionRuleDto {
  const input = record(value, path);
  return Object.freeze({
    squad_count: integer(input["squad_count"], `${path}.squad_count`),
    minimum_starters: integer(
      input["minimum_starters"],
      `${path}.minimum_starters`,
    ),
    maximum_starters: integer(
      input["maximum_starters"],
      `${path}.maximum_starters`,
    ),
  });
}

function parseRules(value: unknown, path: string): PrototypeRulesDto {
  const input = record(value, path);
  const positionsInput = record(input["positions"], `${path}.positions`);
  const transfersInput = record(
    input["free_transfers"],
    `${path}.free_transfers`,
  );

  return Object.freeze({
    ruleset_external_id: string(
      input["ruleset_external_id"],
      `${path}.ruleset_external_id`,
    ),
    version: string(input["version"], `${path}.version`),
    squad_size: integer(input["squad_size"], `${path}.squad_size`),
    lineup_size: integer(input["lineup_size"], `${path}.lineup_size`),
    bench_size: integer(input["bench_size"], `${path}.bench_size`),
    positions: Object.freeze({
      goalkeeper: parsePositionRule(
        positionsInput["goalkeeper"],
        `${path}.positions.goalkeeper`,
      ),
      defender: parsePositionRule(
        positionsInput["defender"],
        `${path}.positions.defender`,
      ),
      midfielder: parsePositionRule(
        positionsInput["midfielder"],
        `${path}.positions.midfielder`,
      ),
      forward: parsePositionRule(
        positionsInput["forward"],
        `${path}.positions.forward`,
      ),
    }),
    max_players_per_team: integer(
      input["max_players_per_team"],
      `${path}.max_players_per_team`,
    ),
    captain_must_start: boolean(
      input["captain_must_start"],
      `${path}.captain_must_start`,
    ),
    free_transfers: Object.freeze({
      minimum: integer(
        transfersInput["minimum"],
        `${path}.free_transfers.minimum`,
      ),
      maximum: integer(
        transfersInput["maximum"],
        `${path}.free_transfers.maximum`,
      ),
    }),
    chip_ids: stringArray(input["chip_ids"], `${path}.chip_ids`),
  });
}

function parseTeam(value: unknown, path: string): PrototypeTeamDto {
  const input = record(value, path);
  return Object.freeze({
    external_id: string(input["external_id"], `${path}.external_id`),
    name: string(input["name"], `${path}.name`),
    short_name: string(input["short_name"], `${path}.short_name`),
  });
}

function parsePlayer(value: unknown, path: string): PrototypePlayerDto {
  const input = record(value, path);
  return Object.freeze({
    external_id: string(input["external_id"], `${path}.external_id`),
    display_name: string(input["display_name"], `${path}.display_name`),
    team_external_id: string(
      input["team_external_id"],
      `${path}.team_external_id`,
    ),
    position: enumeration(input["position"], POSITIONS, `${path}.position`),
    current_price_tenths: nullableInteger(
      input["current_price_tenths"],
      `${path}.current_price_tenths`,
    ),
    availability: enumeration(
      input["availability"],
      AVAILABILITY_STATES,
      `${path}.availability`,
    ),
    availability_as_of: string(
      input["availability_as_of"],
      `${path}.availability_as_of`,
    ),
  });
}

function parseFixture(value: unknown, path: string): PrototypeFixtureDto {
  const input = record(value, path);
  return Object.freeze({
    external_id: string(input["external_id"], `${path}.external_id`),
    gameweek_number: nullableInteger(
      input["gameweek_number"],
      `${path}.gameweek_number`,
    ),
    home_team_external_id: string(
      input["home_team_external_id"],
      `${path}.home_team_external_id`,
    ),
    away_team_external_id: string(
      input["away_team_external_id"],
      `${path}.away_team_external_id`,
    ),
    kickoff: nullableString(input["kickoff"], `${path}.kickoff`),
    state: enumeration(input["state"], FIXTURE_STATES, `${path}.state`),
  });
}

export function parsePrototypeReferenceDataDto(
  value: unknown,
): PrototypeReferenceDataDto {
  const root = record(value, "$payload");
  const snapshot = record(root["snapshot"], "$payload.snapshot");
  const season = record(snapshot["season"], "$payload.snapshot.season");
  const gameweek = record(snapshot["gameweek"], "$payload.snapshot.gameweek");

  return Object.freeze({
    schema_version: string(root["schema_version"], "$payload.schema_version"),
    snapshot: Object.freeze({
      season: Object.freeze({
        external_id: string(
          season["external_id"],
          "$payload.snapshot.season.external_id",
        ),
        label: string(season["label"], "$payload.snapshot.season.label"),
      }),
      gameweek: Object.freeze({
        number: integer(
          gameweek["number"],
          "$payload.snapshot.gameweek.number",
        ),
        label: string(gameweek["label"], "$payload.snapshot.gameweek.label"),
        deadline: nullableString(
          gameweek["deadline"],
          "$payload.snapshot.gameweek.deadline",
        ),
        state: enumeration(
          gameweek["state"],
          GAMEWEEK_STATES,
          "$payload.snapshot.gameweek.state",
        ),
      }),
      rules: parseRules(snapshot["rules"], "$payload.snapshot.rules"),
      teams: Object.freeze(
        array(snapshot["teams"], "$payload.snapshot.teams").map((item, index) =>
          parseTeam(item, `$payload.snapshot.teams[${index}]`),
        ),
      ),
      players: Object.freeze(
        array(snapshot["players"], "$payload.snapshot.players").map(
          (item, index) =>
            parsePlayer(item, `$payload.snapshot.players[${index}]`),
        ),
      ),
      fixtures: Object.freeze(
        array(snapshot["fixtures"], "$payload.snapshot.fixtures").map(
          (item, index) =>
            parseFixture(item, `$payload.snapshot.fixtures[${index}]`),
        ),
      ),
    }),
  });
}
