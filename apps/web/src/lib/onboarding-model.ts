import { createManualTeamStateCandidate } from "@fpl-intelligence/application";
import type { ManualTeamStateEntry } from "@fpl-intelligence/application";
import {
  confirmTeamState,
  createFplMoney,
  createGameweekId,
  createPlayerId,
  createRulesetId,
  createSeasonId,
  createSquadSlotId,
  createTeamId,
  createTeamStateCandidateId,
  createTeamStateId,
  createUtcInstant,
  createVersion,
} from "@fpl-intelligence/domain";
import type {
  ChipState,
  Player,
  Position,
  SquadRules,
  TeamState,
  TeamStateCandidate,
  TeamStateValidationContext,
} from "@fpl-intelligence/domain";

export interface OnboardingSlot {
  readonly label: string;
  readonly position: Position;
}

export interface OnboardingPlayerOption {
  readonly id: string;
  readonly label: string;
  readonly position: Position;
  readonly priceTenths: number;
  readonly teamId: string;
}

export const ONBOARDING_SLOTS: readonly OnboardingSlot[] = Object.freeze([
  { label: "Goalkeeper 1", position: "goalkeeper" },
  { label: "Goalkeeper 2", position: "goalkeeper" },
  { label: "Defender 1", position: "defender" },
  { label: "Defender 2", position: "defender" },
  { label: "Defender 3", position: "defender" },
  { label: "Defender 4", position: "defender" },
  { label: "Defender 5", position: "defender" },
  { label: "Midfielder 1", position: "midfielder" },
  { label: "Midfielder 2", position: "midfielder" },
  { label: "Midfielder 3", position: "midfielder" },
  { label: "Midfielder 4", position: "midfielder" },
  { label: "Midfielder 5", position: "midfielder" },
  { label: "Forward 1", position: "forward" },
  { label: "Forward 2", position: "forward" },
  { label: "Forward 3", position: "forward" },
]);

const teamIds = Array.from({ length: 5 }, (_, index) =>
  createTeamId(`onboarding-demo-team-${index + 1}`),
);

export const ONBOARDING_PLAYER_OPTIONS: readonly OnboardingPlayerOption[] =
  Object.freeze(
    ONBOARDING_SLOTS.map((slot, index) => ({
      id: `onboarding-demo-player-${index + 1}`,
      label: `Illustrative ${slot.label}`,
      position: slot.position,
      priceTenths: 45 + index,
      teamId: teamIds[index % teamIds.length]!,
    })),
  );

const seasonId = createSeasonId("onboarding-demo-season");
const gameweekId = createGameweekId(seasonId, 1);
const rules: SquadRules = Object.freeze({
  identity: Object.freeze({
    rulesetId: createRulesetId("onboarding-demo-rules"),
    version: createVersion("1"),
    seasonId,
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
  chipIds: Object.freeze(["wildcard", "free-hit", "bench-boost"]),
});

const players: readonly Player[] = Object.freeze(
  ONBOARDING_PLAYER_OPTIONS.map((option) => ({
    id: createPlayerId(option.id),
    displayName: option.label,
    teamId: createTeamId(option.teamId),
    position: option.position,
    currentPrice: createFplMoney(option.priceTenths),
    availability: Object.freeze({
      status: "available" as const,
      asOf: createUtcInstant("2026-08-26T08:00:00Z"),
      provenanceRefs: Object.freeze([]),
    }),
    provenanceRefs: Object.freeze([]),
  })),
);

const validationContext: TeamStateValidationContext = Object.freeze({
  rules,
  players,
  provenanceRecords: Object.freeze([]),
});

const benchOrderByIndex = new Map<number, number>([
  [1, 1],
  [6, 2],
  [11, 3],
  [14, 4],
]);

export function illustrativeSelections(): readonly string[] {
  return Object.freeze(ONBOARDING_PLAYER_OPTIONS.map((player) => player.id));
}

export function screenshotCandidateSelections(): readonly string[] {
  const selections = [...illustrativeSelections()];
  selections[3] = "";
  selections[13] = "";
  return Object.freeze(selections);
}

export function selectionIssue(selections: readonly string[]): string | null {
  if (
    selections.length !== ONBOARDING_SLOTS.length ||
    selections.some((selection) => selection.length === 0)
  ) {
    return "Select all 15 players before continuing.";
  }
  if (new Set(selections).size !== selections.length) {
    return "Each player can appear only once in the squad.";
  }
  return null;
}

function selectionForIndex(index: number) {
  const benchOrder = benchOrderByIndex.get(index);
  return benchOrder === undefined
    ? ({ kind: "starter" } as const)
    : ({ kind: "bench", order: benchOrder } as const);
}

export function createOnboardingCandidate(input: {
  readonly selections: readonly string[];
  readonly bankTenths: number;
  readonly freeTransfers: number;
  readonly activeChip: string | null;
  readonly candidateId: string;
  readonly enteredAt: string;
}): TeamStateCandidate {
  const issue = selectionIssue(input.selections);
  if (issue !== null) throw new Error(issue);

  const playerById = new Map(
    ONBOARDING_PLAYER_OPTIONS.map((player) => [player.id, player]),
  );
  const entry: ManualTeamStateEntry = {
    candidateId: createTeamStateCandidateId(input.candidateId),
    gameweekId,
    rulesIdentity: rules.identity,
    squad: input.selections.map((playerId, index) => {
      const player = playerById.get(playerId);
      if (player === undefined) throw new Error("Unknown illustrative player.");
      return {
        slotId: createSquadSlotId(`onboarding-slot-${index + 1}`),
        playerId: createPlayerId(player.id),
        teamId: createTeamId(player.teamId),
        position: player.position,
        purchasePrice: createFplMoney(player.priceTenths),
        sellingPrice: createFplMoney(player.priceTenths),
        selection: selectionForIndex(index),
        captaincy:
          index === 7 ? "captain" : index === 12 ? "vice_captain" : "none",
      };
    }),
    bank: createFplMoney(input.bankTenths),
    freeTransfers: input.freeTransfers,
    chips: Object.freeze(
      rules.chipIds.map((chipId): ChipState =>
        Object.freeze({
          chipId,
          status: chipId === input.activeChip ? "active" : "available",
        }),
      ),
    ),
    enteredAt: createUtcInstant(input.enteredAt),
  };
  return createManualTeamStateCandidate(entry);
}

export function confirmOnboardingCandidate(input: {
  readonly candidate: TeamStateCandidate;
  readonly teamStateId: string;
  readonly confirmedAt: string;
}):
  | { readonly ok: true; readonly teamState: TeamState }
  | { readonly ok: false; readonly messages: readonly string[] } {
  const result = confirmTeamState({
    candidate: input.candidate,
    teamStateId: createTeamStateId(input.teamStateId),
    confirmedAt: createUtcInstant(input.confirmedAt),
    context: validationContext,
  });
  return result.ok
    ? result
    : Object.freeze({
        ok: false as const,
        messages: Object.freeze(result.issues.map((issue) => issue.message)),
      });
}
