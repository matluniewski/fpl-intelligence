import {
  createFixtureId,
  createPlayerId,
  createProviderId,
  createProvenanceId,
  createRulesetId,
  createSeasonId,
  createSourceId,
  createSourcePolicyId,
  createSquadSlotId,
  createTeamId,
  createTeamStateCandidateId,
} from "../identifiers";
import { createFplMoney, createUtcInstant, createVersion } from "../primitives";
import { createProvenanceRecord } from "../provenance";
import type { ProvenanceRecord } from "../provenance";
import { createGameweekId } from "../reference-data";
import type {
  Player,
  Position,
  ReferenceDataSnapshot,
  SquadRules,
  Team,
} from "../reference-data";
import {
  createManualFieldOrigin,
  createTeamStateCandidate,
  resolvedField,
} from "../team-state";
import type {
  CandidateSquadSlot,
  FieldOrigin,
  SquadSelection,
  TeamStateCandidate,
  TeamStateValidationContext,
} from "../team-state";

export const SYNTHETIC_NOW = createUtcInstant("2026-08-18T12:00:00Z");
export const SYNTHETIC_SEASON_ID = createSeasonId("synthetic-season");
export const SYNTHETIC_GAMEWEEK_ID = createGameweekId(SYNTHETIC_SEASON_ID, 1);

export const SYNTHETIC_PROVENANCE: ProvenanceRecord = createProvenanceRecord({
  provenanceId: createProvenanceId("synthetic-provenance"),
  dataCategory: "other_reviewed_external_data",
  sourceChain: [
    {
      sourceId: createSourceId("synthetic-source"),
      role: "origin",
    },
  ],
  provider: {
    providerId: createProviderId("synthetic-provider"),
    product: "Synthetic test fixture",
    accessPath: "in-memory",
  },
  acquisition: {
    fetchedAt: SYNTHETIC_NOW,
    environment: "test",
    purpose: "deterministic contract verification",
  },
  policyAssessment: {
    sourcePolicyId: createSourcePolicyId("synthetic-policy"),
    policyVersion: createVersion("1"),
    commercialUse: "permitted",
  },
  mapping: {
    adapter: "synthetic-fixture",
    adapterVersion: createVersion("1"),
    normalizationVersion: createVersion("1"),
  },
  lifecycle: {
    state: "active",
    evaluatedAt: SYNTHETIC_NOW,
    ruleVersion: createVersion("1"),
  },
});

const syntheticProvenanceRefs = [SYNTHETIC_PROVENANCE.provenanceId] as const;

export const SYNTHETIC_RULES: SquadRules = Object.freeze({
  identity: Object.freeze({
    rulesetId: createRulesetId("synthetic-rules"),
    version: createVersion("1"),
    seasonId: SYNTHETIC_SEASON_ID,
  }),
  squadSize: 15,
  lineupSize: 11,
  benchSize: 4,
  positions: Object.freeze({
    goalkeeper: Object.freeze({
      squadCount: 2,
      minimumStarters: 1,
      maximumStarters: 1,
    }),
    defender: Object.freeze({
      squadCount: 5,
      minimumStarters: 3,
      maximumStarters: 5,
    }),
    midfielder: Object.freeze({
      squadCount: 5,
      minimumStarters: 2,
      maximumStarters: 5,
    }),
    forward: Object.freeze({
      squadCount: 3,
      minimumStarters: 1,
      maximumStarters: 3,
    }),
  }),
  maxPlayersPerTeam: 3,
  captainMustStart: true,
  freeTransfers: Object.freeze({ minimum: 0, maximum: 5 }),
  chipIds: Object.freeze(["synthetic-chip-a", "synthetic-chip-b"]),
});

export const SYNTHETIC_TEAMS: readonly Team[] = Object.freeze(
  Array.from({ length: 5 }, (_, index): Team => ({
    id: createTeamId(`synthetic-team-${index + 1}`),
    name: `Synthetic Team ${index + 1}`,
    shortName: `ST${index + 1}`,
    provenanceRefs: syntheticProvenanceRefs,
  })),
);

const positions: readonly Position[] = [
  "goalkeeper",
  "goalkeeper",
  "defender",
  "defender",
  "defender",
  "defender",
  "defender",
  "midfielder",
  "midfielder",
  "midfielder",
  "midfielder",
  "midfielder",
  "forward",
  "forward",
  "forward",
];

export const SYNTHETIC_PLAYERS: readonly Player[] = Object.freeze(
  positions.map((position, index): Player => ({
    id: createPlayerId(`synthetic-player-${index + 1}`),
    displayName: `Synthetic Player ${index + 1}`,
    teamId: SYNTHETIC_TEAMS[index % SYNTHETIC_TEAMS.length]!.id,
    position,
    currentPrice: createFplMoney(45 + index),
    availability: Object.freeze({
      status: "available",
      asOf: SYNTHETIC_NOW,
      provenanceRefs: syntheticProvenanceRefs,
    }),
    provenanceRefs: syntheticProvenanceRefs,
  })),
);

export const SYNTHETIC_REFERENCE_DATA: ReferenceDataSnapshot = Object.freeze({
  season: Object.freeze({
    id: SYNTHETIC_SEASON_ID,
    label: "Synthetic Season",
    provenanceRefs: syntheticProvenanceRefs,
  }),
  gameweek: Object.freeze({
    id: SYNTHETIC_GAMEWEEK_ID,
    label: "Synthetic Gameweek 1",
    deadline: createUtcInstant("2026-08-21T17:30:00Z"),
    state: "scheduled",
    provenanceRefs: syntheticProvenanceRefs,
  }),
  rules: SYNTHETIC_RULES,
  teams: SYNTHETIC_TEAMS,
  players: SYNTHETIC_PLAYERS,
  fixtures: Object.freeze([
    Object.freeze({
      id: createFixtureId("synthetic-fixture-1"),
      gameweekId: SYNTHETIC_GAMEWEEK_ID,
      homeTeamId: SYNTHETIC_TEAMS[0]!.id,
      awayTeamId: SYNTHETIC_TEAMS[1]!.id,
      kickoff: createUtcInstant("2026-08-22T14:00:00Z"),
      state: "scheduled" as const,
      provenanceRefs: syntheticProvenanceRefs,
    }),
  ]),
  provenanceRefs: syntheticProvenanceRefs,
});

export const SYNTHETIC_MANUAL_ORIGIN: FieldOrigin =
  createManualFieldOrigin(SYNTHETIC_NOW);

function selectionForIndex(index: number): SquadSelection {
  const benchOrderByIndex = new Map<number, number>([
    [1, 1],
    [6, 2],
    [11, 3],
    [14, 4],
  ]);
  const benchOrder = benchOrderByIndex.get(index);
  return benchOrder === undefined
    ? Object.freeze({ kind: "starter" })
    : Object.freeze({ kind: "bench", order: benchOrder });
}

export function createSyntheticCandidate(): TeamStateCandidate {
  const squad = SYNTHETIC_PLAYERS.map((player, index): CandidateSquadSlot => ({
    slotId: createSquadSlotId(`synthetic-slot-${index + 1}`),
    playerId: resolvedField(player.id, SYNTHETIC_MANUAL_ORIGIN),
    teamId: resolvedField(player.teamId, SYNTHETIC_MANUAL_ORIGIN),
    position: resolvedField(player.position, SYNTHETIC_MANUAL_ORIGIN),
    purchasePrice: resolvedField(
      createFplMoney(45 + index),
      SYNTHETIC_MANUAL_ORIGIN,
    ),
    sellingPrice: resolvedField(
      createFplMoney(45 + index),
      SYNTHETIC_MANUAL_ORIGIN,
    ),
    selection: resolvedField(selectionForIndex(index), SYNTHETIC_MANUAL_ORIGIN),
    captaincy: resolvedField(
      index === 7 ? "captain" : index === 12 ? "vice_captain" : "none",
      SYNTHETIC_MANUAL_ORIGIN,
    ),
  }));

  return createTeamStateCandidate({
    id: createTeamStateCandidateId("synthetic-candidate"),
    gameweekId: resolvedField(SYNTHETIC_GAMEWEEK_ID, SYNTHETIC_MANUAL_ORIGIN),
    rulesIdentity: resolvedField(
      SYNTHETIC_RULES.identity,
      SYNTHETIC_MANUAL_ORIGIN,
    ),
    squad,
    bank: resolvedField(createFplMoney(10), SYNTHETIC_MANUAL_ORIGIN),
    freeTransfers: resolvedField(1, SYNTHETIC_MANUAL_ORIGIN),
    chips: resolvedField(
      Object.freeze([
        Object.freeze({
          chipId: "synthetic-chip-a",
          status: "available" as const,
        }),
        Object.freeze({
          chipId: "synthetic-chip-b",
          status: "available" as const,
        }),
      ]),
      SYNTHETIC_MANUAL_ORIGIN,
    ),
    createdAt: SYNTHETIC_NOW,
    updatedAt: SYNTHETIC_NOW,
  });
}

export function createSyntheticValidationContext(): TeamStateValidationContext {
  return Object.freeze({
    rules: SYNTHETIC_RULES,
    players: SYNTHETIC_PLAYERS,
    provenanceRecords: Object.freeze([SYNTHETIC_PROVENANCE]),
  });
}
