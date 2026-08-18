export const SYNTHETIC_REFERENCE_DATA_PAYLOAD = Object.freeze({
  schema_version: "synthetic-schema-v1",
  snapshot: Object.freeze({
    season: Object.freeze({
      external_id: "season-ext-2026",
      label: "Synthetic 2026",
    }),
    gameweek: Object.freeze({
      number: 1,
      label: "Synthetic Gameweek 1",
      deadline: "2026-08-21T17:30:00Z",
      state: "scheduled",
    }),
    rules: Object.freeze({
      ruleset_external_id: "rules-ext-001",
      version: "1",
      squad_size: 15,
      lineup_size: 11,
      bench_size: 4,
      positions: Object.freeze({
        goalkeeper: Object.freeze({
          squad_count: 2,
          minimum_starters: 1,
          maximum_starters: 1,
        }),
        defender: Object.freeze({
          squad_count: 5,
          minimum_starters: 3,
          maximum_starters: 5,
        }),
        midfielder: Object.freeze({
          squad_count: 5,
          minimum_starters: 2,
          maximum_starters: 5,
        }),
        forward: Object.freeze({
          squad_count: 3,
          minimum_starters: 1,
          maximum_starters: 3,
        }),
      }),
      max_players_per_team: 3,
      captain_must_start: true,
      free_transfers: Object.freeze({ minimum: 0, maximum: 5 }),
      chip_ids: Object.freeze(["synthetic-chip-a", "synthetic-chip-b"]),
    }),
    teams: Object.freeze([
      Object.freeze({
        external_id: "team-ext-001",
        name: "Northbridge FC",
        short_name: "NBR",
      }),
      Object.freeze({
        external_id: "team-ext-002",
        name: "Riverside Athletic",
        short_name: "RIV",
      }),
      Object.freeze({
        external_id: "team-ext-003",
        name: "Meadow Park",
        short_name: "MDW",
      }),
    ]),
    players: Object.freeze([
      Object.freeze({
        external_id: "player-ext-001",
        display_name: "Álex Vale",
        team_external_id: "team-ext-001",
        position: "goalkeeper",
        current_price_tenths: 45,
        availability: "available",
        availability_as_of: "2026-08-18T12:00:00Z",
      }),
      Object.freeze({
        external_id: "player-ext-002",
        display_name: "Alex Vale",
        team_external_id: "team-ext-002",
        position: "defender",
        current_price_tenths: 50,
        availability: "available",
        availability_as_of: "2026-08-18T12:00:00Z",
      }),
      Object.freeze({
        external_id: "player-ext-003",
        display_name: "Sam Quill",
        team_external_id: "team-ext-001",
        position: "defender",
        current_price_tenths: 55,
        availability: "available",
        availability_as_of: "2026-08-18T12:00:00Z",
      }),
      Object.freeze({
        external_id: "player-ext-004",
        display_name: "Jordan Reed",
        team_external_id: "team-ext-002",
        position: "midfielder",
        current_price_tenths: 65,
        availability: "unknown",
        availability_as_of: "2026-08-18T12:00:00Z",
      }),
      Object.freeze({
        external_id: "player-ext-005",
        display_name: "Riley Stone",
        team_external_id: "team-ext-003",
        position: "midfielder",
        current_price_tenths: null,
        availability: "available",
        availability_as_of: "2026-08-18T12:00:00Z",
      }),
      Object.freeze({
        external_id: "player-ext-006",
        display_name: "Casey Ward",
        team_external_id: "team-ext-003",
        position: "forward",
        current_price_tenths: 70,
        availability: "available",
        availability_as_of: "2026-08-18T12:00:00Z",
      }),
    ]),
    fixtures: Object.freeze([
      Object.freeze({
        external_id: "fixture-ext-001",
        gameweek_number: 1,
        home_team_external_id: "team-ext-001",
        away_team_external_id: "team-ext-002",
        kickoff: "2026-08-22T14:00:00Z",
        state: "scheduled",
      }),
      Object.freeze({
        external_id: "fixture-ext-002",
        gameweek_number: null,
        home_team_external_id: "team-ext-003",
        away_team_external_id: "team-ext-001",
        kickoff: null,
        state: "unknown",
      }),
    ]),
  }),
});

export const SYNTHETIC_REFERENCE_DATA_SOURCE_POLICY = Object.freeze({
  sourceId: "project-authored-synthetic-reference-data",
  providerId: "fpl-intelligence-fixtures",
  providerProduct: "Project-authored synthetic fixture",
  accessPath: "static-development-fixture",
  sourcePolicyId: "synthetic-fixture-policy",
  policyVersion: "1",
  commercialUse: "permitted" as const,
  environment: "test" as const,
  freshness: "current" as const,
});

export const SYNTHETIC_REFERENCE_DATA_IDENTITY_MAP = Object.freeze({
  season: Object.freeze({
    externalId: "season-ext-2026",
    internalId: "synthetic-2026",
  }),
  rulesets: Object.freeze({
    "rules-ext-001": "synthetic-rules",
  }),
  teams: Object.freeze({
    "team-ext-001": "northbridge",
    "team-ext-002": "riverside",
    "team-ext-003": "meadow-park",
  }),
  players: Object.freeze({
    "player-ext-001": "northbridge-alex-vale",
    "player-ext-002": "riverside-alex-vale",
    "player-ext-003": "northbridge-sam-quill",
    "player-ext-004": "riverside-jordan-reed",
    "player-ext-005": "meadow-park-riley-stone",
    "player-ext-006": "meadow-park-casey-ward",
  }),
  fixtures: Object.freeze({
    "fixture-ext-001": "northbridge-riverside-gw1",
    "fixture-ext-002": "meadow-park-future",
  }),
});
