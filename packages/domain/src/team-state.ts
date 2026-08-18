import type {
  PlayerId,
  ProvenanceId,
  SquadSlotId,
  TeamId,
  TeamStateCandidateId,
  TeamStateId,
} from "./identifiers";
import { NOT_ASSESSED_CONFIDENCE } from "./primitives";
import type { Confidence, FplMoney, UtcInstant } from "./primitives";
import type { ProvenanceRecord } from "./provenance";
import { isCommercialUseBlocked } from "./provenance";
import type {
  GameweekId,
  Player,
  Position,
  RulesIdentity,
  SquadRules,
} from "./reference-data";
import {
  POSITIONS,
  rulesIdentitiesEqual,
  validateSquadRules,
} from "./reference-data";

export type CandidateOriginKind =
  "manual_entry" | "screenshot_extraction" | "external_import";

export interface FieldOrigin {
  readonly kind: CandidateOriginKind;
  readonly capturedAt: UtcInstant;
  readonly confidence: Confidence;
  readonly provenanceRefs: readonly ProvenanceId[];
}

export type CandidateField<T> =
  | {
      readonly status: "resolved";
      readonly value: T;
      readonly origin: FieldOrigin;
    }
  | {
      readonly status: "uncertain";
      readonly suggestedValue?: T;
      readonly origin: FieldOrigin;
      readonly reason: string;
    }
  | {
      readonly status: "missing";
      readonly reason: string;
      readonly origin?: FieldOrigin;
    };

export interface StarterSelection {
  readonly kind: "starter";
}

export interface BenchSelection {
  readonly kind: "bench";
  readonly order: number;
}

export type SquadSelection = StarterSelection | BenchSelection;
export type Captaincy = "none" | "captain" | "vice_captain";

export interface ChipState {
  readonly chipId: string;
  readonly status: "available" | "used" | "active" | "unavailable";
  readonly usedInGameweek?: GameweekId;
}

export interface CandidateSquadSlot {
  readonly slotId: SquadSlotId;
  readonly playerId: CandidateField<PlayerId>;
  readonly teamId: CandidateField<TeamId>;
  readonly position: CandidateField<Position>;
  readonly purchasePrice: CandidateField<FplMoney>;
  readonly sellingPrice: CandidateField<FplMoney>;
  readonly selection: CandidateField<SquadSelection>;
  readonly captaincy: CandidateField<Captaincy>;
}

export interface TeamStateCandidate {
  readonly kind: "candidate";
  readonly id: TeamStateCandidateId;
  readonly gameweekId: CandidateField<GameweekId>;
  readonly rulesIdentity: CandidateField<RulesIdentity>;
  readonly squad: readonly CandidateSquadSlot[];
  readonly bank: CandidateField<FplMoney>;
  readonly freeTransfers: CandidateField<number>;
  readonly chips: CandidateField<readonly ChipState[]>;
  readonly createdAt: UtcInstant;
  readonly updatedAt: UtcInstant;
}

export interface SquadPick {
  readonly slotId: SquadSlotId;
  readonly playerId: PlayerId;
  readonly teamId: TeamId;
  readonly position: Position;
  readonly purchasePrice: FplMoney;
  readonly sellingPrice: FplMoney;
  readonly selection: SquadSelection;
  readonly captaincy: Captaincy;
}

export interface ConfirmedFieldOrigin {
  readonly source: FieldOrigin;
  readonly confirmedAt: UtcInstant;
}

export interface ConfirmedSquadSlotOrigins {
  readonly slotId: SquadSlotId;
  readonly playerId: ConfirmedFieldOrigin;
  readonly teamId: ConfirmedFieldOrigin;
  readonly position: ConfirmedFieldOrigin;
  readonly purchasePrice: ConfirmedFieldOrigin;
  readonly sellingPrice: ConfirmedFieldOrigin;
  readonly selection: ConfirmedFieldOrigin;
  readonly captaincy: ConfirmedFieldOrigin;
}

export interface TeamStateOrigins {
  readonly gameweekId: ConfirmedFieldOrigin;
  readonly rulesIdentity: ConfirmedFieldOrigin;
  readonly squad: readonly ConfirmedSquadSlotOrigins[];
  readonly bank: ConfirmedFieldOrigin;
  readonly freeTransfers: ConfirmedFieldOrigin;
  readonly chips: ConfirmedFieldOrigin;
}

export interface TeamState {
  readonly kind: "confirmed";
  readonly id: TeamStateId;
  readonly candidateId: TeamStateCandidateId;
  readonly gameweekId: GameweekId;
  readonly rulesIdentity: RulesIdentity;
  readonly squad: readonly SquadPick[];
  readonly bank: FplMoney;
  readonly freeTransfers: number;
  readonly chips: readonly ChipState[];
  readonly confirmedAt: UtcInstant;
  readonly origins: TeamStateOrigins;
  readonly provenanceRefs: readonly ProvenanceId[];
}

export type TeamStateValidationCode =
  | "field_missing"
  | "field_uncertain"
  | "squad_size_invalid"
  | "duplicate_player"
  | "unknown_player"
  | "player_team_mismatch"
  | "player_position_mismatch"
  | "position_count_invalid"
  | "lineup_size_invalid"
  | "lineup_position_invalid"
  | "bench_size_invalid"
  | "bench_order_invalid"
  | "team_limit_exceeded"
  | "captain_invalid"
  | "vice_captain_invalid"
  | "money_invalid"
  | "free_transfers_invalid"
  | "chip_invalid"
  | "gameweek_mismatch"
  | "rules_mismatch"
  | "confirmation_time_invalid"
  | "provenance_missing"
  | "provenance_unusable"
  | "commercial_use_blocked";

export interface TeamStateValidationIssue {
  readonly code: TeamStateValidationCode;
  readonly path: string;
  readonly message: string;
}

export interface TeamStateValidationContext {
  readonly rules: SquadRules;
  readonly players: readonly Player[];
  readonly provenanceRecords: readonly ProvenanceRecord[];
}

export type CandidateRevision =
  | {
      readonly kind: "set_gameweek";
      readonly value: CandidateField<GameweekId>;
    }
  | {
      readonly kind: "set_rules_identity";
      readonly value: CandidateField<RulesIdentity>;
    }
  | { readonly kind: "set_bank"; readonly value: CandidateField<FplMoney> }
  | {
      readonly kind: "set_free_transfers";
      readonly value: CandidateField<number>;
    }
  | {
      readonly kind: "set_chips";
      readonly value: CandidateField<readonly ChipState[]>;
    }
  | { readonly kind: "upsert_squad_slot"; readonly slot: CandidateSquadSlot }
  | { readonly kind: "remove_squad_slot"; readonly slotId: SquadSlotId };

export function resolvedField<T>(
  value: T,
  origin: FieldOrigin,
): CandidateField<T> {
  return Object.freeze({ status: "resolved", value, origin });
}

export function createManualFieldOrigin(capturedAt: UtcInstant): FieldOrigin {
  return Object.freeze({
    kind: "manual_entry",
    capturedAt,
    confidence: NOT_ASSESSED_CONFIDENCE,
    provenanceRefs: Object.freeze([]),
  });
}

export function uncertainField<T>(input: {
  readonly suggestedValue?: T;
  readonly origin: FieldOrigin;
  readonly reason: string;
}): CandidateField<T> {
  return Object.freeze({ status: "uncertain", ...input });
}

export function missingField<T>(
  reason: string,
  origin?: FieldOrigin,
): CandidateField<T> {
  return origin === undefined
    ? Object.freeze({ status: "missing", reason })
    : Object.freeze({ status: "missing", reason, origin });
}

export function createTeamStateCandidate(
  input: Omit<TeamStateCandidate, "kind">,
) {
  if (input.updatedAt < input.createdAt) {
    throw new RangeError("Candidate updatedAt cannot precede createdAt.");
  }

  return Object.freeze({
    kind: "candidate" as const,
    ...input,
    squad: Object.freeze([...input.squad]),
  });
}

export function reviseTeamStateCandidate(
  candidate: TeamStateCandidate,
  revision: CandidateRevision,
  revisedAt: UtcInstant,
): TeamStateCandidate {
  if (revisedAt < candidate.updatedAt) {
    throw new RangeError("A candidate revision cannot move time backwards.");
  }

  switch (revision.kind) {
    case "set_gameweek":
      return createTeamStateCandidate({
        ...candidate,
        gameweekId: revision.value,
        updatedAt: revisedAt,
      });
    case "set_rules_identity":
      return createTeamStateCandidate({
        ...candidate,
        rulesIdentity: revision.value,
        updatedAt: revisedAt,
      });
    case "set_bank":
      return createTeamStateCandidate({
        ...candidate,
        bank: revision.value,
        updatedAt: revisedAt,
      });
    case "set_free_transfers":
      return createTeamStateCandidate({
        ...candidate,
        freeTransfers: revision.value,
        updatedAt: revisedAt,
      });
    case "set_chips":
      return createTeamStateCandidate({
        ...candidate,
        chips: revision.value,
        updatedAt: revisedAt,
      });
    case "upsert_squad_slot": {
      const existingIndex = candidate.squad.findIndex(
        (slot) => slot.slotId === revision.slot.slotId,
      );
      const squad = [...candidate.squad];

      if (existingIndex === -1) {
        squad.push(revision.slot);
      } else {
        squad[existingIndex] = revision.slot;
      }

      return createTeamStateCandidate({
        ...candidate,
        squad,
        updatedAt: revisedAt,
      });
    }
    case "remove_squad_slot":
      return createTeamStateCandidate({
        ...candidate,
        squad: candidate.squad.filter(
          (slot) => slot.slotId !== revision.slotId,
        ),
        updatedAt: revisedAt,
      });
  }
}

function addUnresolvedIssue<T>(
  field: CandidateField<T>,
  path: string,
  issues: TeamStateValidationIssue[],
): field is Extract<CandidateField<T>, { readonly status: "resolved" }> {
  if (field.status === "missing") {
    issues.push({
      code: "field_missing",
      path,
      message: `Required field is missing: ${field.reason}`,
    });
    return false;
  }

  if (field.status === "uncertain") {
    issues.push({
      code: "field_uncertain",
      path,
      message: `Required field remains uncertain: ${field.reason}`,
    });
    return false;
  }

  return true;
}

interface LocatedOrigin {
  readonly path: string;
  readonly origin: FieldOrigin;
}

function collectOrigins(
  candidate: TeamStateCandidate,
): readonly LocatedOrigin[] {
  const fields: Array<{
    readonly path: string;
    readonly field: CandidateField<unknown>;
  }> = [
    { path: "gameweekId", field: candidate.gameweekId },
    { path: "rulesIdentity", field: candidate.rulesIdentity },
    { path: "bank", field: candidate.bank },
    { path: "freeTransfers", field: candidate.freeTransfers },
    { path: "chips", field: candidate.chips },
  ];

  for (const [index, slot] of candidate.squad.entries()) {
    const path = `squad[${index}]`;
    fields.push(
      { path: `${path}.playerId`, field: slot.playerId },
      { path: `${path}.teamId`, field: slot.teamId },
      { path: `${path}.position`, field: slot.position },
      { path: `${path}.purchasePrice`, field: slot.purchasePrice },
      { path: `${path}.sellingPrice`, field: slot.sellingPrice },
      { path: `${path}.selection`, field: slot.selection },
      { path: `${path}.captaincy`, field: slot.captaincy },
    );
  }

  return fields.flatMap(({ field, path }) =>
    field.origin === undefined ? [] : [{ path, origin: field.origin }],
  );
}

function validateOrigins(
  candidate: TeamStateCandidate,
  context: TeamStateValidationContext,
  issues: TeamStateValidationIssue[],
): void {
  const provenanceById = new Map(
    context.provenanceRecords.map(
      (record) => [record.provenanceId, record] as const,
    ),
  );

  for (const { path, origin } of collectOrigins(candidate)) {
    if (
      origin.kind === "external_import" &&
      origin.provenanceRefs.length === 0
    ) {
      issues.push({
        code: "provenance_missing",
        path,
        message:
          "An external import must carry at least one provenance reference.",
      });
    }

    for (const provenanceId of origin.provenanceRefs) {
      const record = provenanceById.get(provenanceId);

      if (record === undefined) {
        issues.push({
          code: "provenance_missing",
          path,
          message: `Provenance record ${provenanceId} is unavailable.`,
        });
      } else if (isCommercialUseBlocked(record.policyAssessment)) {
        issues.push({
          code: "commercial_use_blocked",
          path,
          message: `Provenance record ${provenanceId} has blocking commercial-use status ${record.policyAssessment.commercialUse}.`,
        });
      } else if (
        record.lifecycle.state !== "active" &&
        record.lifecycle.state !== "stale"
      ) {
        issues.push({
          code: "provenance_unusable",
          path,
          message: `Provenance record ${provenanceId} has unusable lifecycle state ${record.lifecycle.state}.`,
        });
      }
    }
  }
}

function isValidMoney(value: FplMoney): boolean {
  return (
    value.unit === "tenths_of_million" &&
    Number.isSafeInteger(value.tenths) &&
    value.tenths >= 0
  );
}

export function validateTeamStateCandidate(
  candidate: TeamStateCandidate,
  context: TeamStateValidationContext,
): readonly TeamStateValidationIssue[] {
  validateSquadRules(context.rules);

  const issues: TeamStateValidationIssue[] = [];
  const resolvedGameweek = addUnresolvedIssue(
    candidate.gameweekId,
    "gameweekId",
    issues,
  );
  const resolvedRules = addUnresolvedIssue(
    candidate.rulesIdentity,
    "rulesIdentity",
    issues,
  );
  const resolvedBank = addUnresolvedIssue(candidate.bank, "bank", issues);
  const resolvedFreeTransfers = addUnresolvedIssue(
    candidate.freeTransfers,
    "freeTransfers",
    issues,
  );
  const resolvedChips = addUnresolvedIssue(candidate.chips, "chips", issues);

  if (
    resolvedGameweek &&
    candidate.gameweekId.value.seasonId !== context.rules.identity.seasonId
  ) {
    issues.push({
      code: "gameweek_mismatch",
      path: "gameweekId.seasonId",
      message: "Candidate gameweek does not belong to the rules season.",
    });
  }

  if (
    resolvedRules &&
    !rulesIdentitiesEqual(candidate.rulesIdentity.value, context.rules.identity)
  ) {
    issues.push({
      code: "rules_mismatch",
      path: "rulesIdentity",
      message: "Candidate rules identity does not match the validation rules.",
    });
  }

  if (resolvedBank && !isValidMoney(candidate.bank.value)) {
    issues.push({
      code: "money_invalid",
      path: "bank",
      message: "Bank must use non-negative tenths-of-a-million semantics.",
    });
  }

  if (resolvedFreeTransfers) {
    const value = candidate.freeTransfers.value;
    if (
      !Number.isSafeInteger(value) ||
      value < context.rules.freeTransfers.minimum ||
      value > context.rules.freeTransfers.maximum
    ) {
      issues.push({
        code: "free_transfers_invalid",
        path: "freeTransfers",
        message: "Free transfers fall outside the active versioned rules.",
      });
    }
  }

  if (resolvedChips) {
    const seenChipIds = new Set<string>();
    for (const [index, chip] of candidate.chips.value.entries()) {
      if (
        chip.chipId.trim().length === 0 ||
        !context.rules.chipIds.includes(chip.chipId) ||
        seenChipIds.has(chip.chipId)
      ) {
        issues.push({
          code: "chip_invalid",
          path: `chips[${index}]`,
          message:
            "Chip identity is empty, duplicated, or absent from the active rules.",
        });
      }
      seenChipIds.add(chip.chipId);
    }

    for (const chipId of context.rules.chipIds) {
      if (!seenChipIds.has(chipId)) {
        issues.push({
          code: "chip_invalid",
          path: "chips",
          message: `Chip state is missing for ${chipId}.`,
        });
      }
    }
  }

  if (candidate.squad.length !== context.rules.squadSize) {
    issues.push({
      code: "squad_size_invalid",
      path: "squad",
      message: `Expected ${context.rules.squadSize} squad slots, received ${candidate.squad.length}.`,
    });
  }

  const playersById = new Map(
    context.players.map((player) => [player.id, player] as const),
  );
  const playerIds = new Set<PlayerId>();
  const squadPositionCounts = new Map<Position, number>();
  const lineupPositionCounts = new Map<Position, number>();
  const teamCounts = new Map<TeamId, number>();
  const benchOrders = new Set<number>();
  let starters = 0;
  let benchPlayers = 0;
  let captains = 0;
  let viceCaptains = 0;

  for (const [index, slot] of candidate.squad.entries()) {
    const path = `squad[${index}]`;
    const playerResolved = addUnresolvedIssue(
      slot.playerId,
      `${path}.playerId`,
      issues,
    );
    const teamResolved = addUnresolvedIssue(
      slot.teamId,
      `${path}.teamId`,
      issues,
    );
    const positionResolved = addUnresolvedIssue(
      slot.position,
      `${path}.position`,
      issues,
    );
    const purchasePriceResolved = addUnresolvedIssue(
      slot.purchasePrice,
      `${path}.purchasePrice`,
      issues,
    );
    const sellingPriceResolved = addUnresolvedIssue(
      slot.sellingPrice,
      `${path}.sellingPrice`,
      issues,
    );
    const selectionResolved = addUnresolvedIssue(
      slot.selection,
      `${path}.selection`,
      issues,
    );
    const captaincyResolved = addUnresolvedIssue(
      slot.captaincy,
      `${path}.captaincy`,
      issues,
    );

    let referencePlayer: Player | undefined;
    if (playerResolved) {
      const playerId = slot.playerId.value;
      referencePlayer = playersById.get(playerId);

      if (playerIds.has(playerId)) {
        issues.push({
          code: "duplicate_player",
          path: `${path}.playerId`,
          message: "A player may appear only once in a squad.",
        });
      }
      playerIds.add(playerId);

      if (referencePlayer === undefined) {
        issues.push({
          code: "unknown_player",
          path: `${path}.playerId`,
          message: "Player is absent from the normalized reference snapshot.",
        });
      }
    }

    if (teamResolved) {
      const teamId = slot.teamId.value;
      teamCounts.set(teamId, (teamCounts.get(teamId) ?? 0) + 1);

      if (referencePlayer !== undefined && referencePlayer.teamId !== teamId) {
        issues.push({
          code: "player_team_mismatch",
          path: `${path}.teamId`,
          message: "Player team does not match normalized reference data.",
        });
      }
    }

    if (positionResolved) {
      const position = slot.position.value;
      squadPositionCounts.set(
        position,
        (squadPositionCounts.get(position) ?? 0) + 1,
      );

      if (
        referencePlayer !== undefined &&
        referencePlayer.position !== position
      ) {
        issues.push({
          code: "player_position_mismatch",
          path: `${path}.position`,
          message: "Player position does not match normalized reference data.",
        });
      }
    }

    if (purchasePriceResolved && !isValidMoney(slot.purchasePrice.value)) {
      issues.push({
        code: "money_invalid",
        path: `${path}.purchasePrice`,
        message: "Purchase price has invalid FPL money semantics.",
      });
    }

    if (sellingPriceResolved && !isValidMoney(slot.sellingPrice.value)) {
      issues.push({
        code: "money_invalid",
        path: `${path}.sellingPrice`,
        message: "Selling price has invalid FPL money semantics.",
      });
    }

    if (selectionResolved) {
      if (slot.selection.value.kind === "starter") {
        starters += 1;
        if (positionResolved) {
          lineupPositionCounts.set(
            slot.position.value,
            (lineupPositionCounts.get(slot.position.value) ?? 0) + 1,
          );
        }
      } else {
        benchPlayers += 1;
        const order = slot.selection.value.order;
        if (
          !Number.isSafeInteger(order) ||
          order < 1 ||
          order > context.rules.benchSize ||
          benchOrders.has(order)
        ) {
          issues.push({
            code: "bench_order_invalid",
            path: `${path}.selection.order`,
            message: "Bench order must be unique and within the active rules.",
          });
        }
        benchOrders.add(order);
      }
    }

    if (captaincyResolved) {
      if (slot.captaincy.value === "captain") captains += 1;
      if (slot.captaincy.value === "vice_captain") viceCaptains += 1;

      if (
        context.rules.captainMustStart &&
        slot.captaincy.value !== "none" &&
        selectionResolved &&
        slot.selection.value.kind !== "starter"
      ) {
        issues.push({
          code:
            slot.captaincy.value === "captain"
              ? "captain_invalid"
              : "vice_captain_invalid",
          path: `${path}.captaincy`,
          message: "The active rules require captaincy selections to start.",
        });
      }
    }
  }

  if (starters !== context.rules.lineupSize) {
    issues.push({
      code: "lineup_size_invalid",
      path: "squad.selection",
      message: `Expected ${context.rules.lineupSize} starters, received ${starters}.`,
    });
  }

  if (benchPlayers !== context.rules.benchSize) {
    issues.push({
      code: "bench_size_invalid",
      path: "squad.selection",
      message: `Expected ${context.rules.benchSize} bench players, received ${benchPlayers}.`,
    });
  }

  for (const position of POSITIONS) {
    const squadCount = squadPositionCounts.get(position) ?? 0;
    const lineupCount = lineupPositionCounts.get(position) ?? 0;
    const rule = context.rules.positions[position];

    if (squadCount !== rule.squadCount) {
      issues.push({
        code: "position_count_invalid",
        path: `squad.position.${position}`,
        message: `Expected ${rule.squadCount} ${position} squad slots, received ${squadCount}.`,
      });
    }

    if (
      lineupCount < rule.minimumStarters ||
      lineupCount > rule.maximumStarters
    ) {
      issues.push({
        code: "lineup_position_invalid",
        path: `squad.selection.${position}`,
        message: `${position} starters fall outside the active rules.`,
      });
    }
  }

  for (const [teamId, count] of teamCounts) {
    if (count > context.rules.maxPlayersPerTeam) {
      issues.push({
        code: "team_limit_exceeded",
        path: `squad.team.${teamId}`,
        message: `Team has ${count} players; active rules allow ${context.rules.maxPlayersPerTeam}.`,
      });
    }
  }

  if (captains !== 1) {
    issues.push({
      code: "captain_invalid",
      path: "squad.captaincy",
      message: `Expected exactly one captain, received ${captains}.`,
    });
  }

  if (viceCaptains !== 1) {
    issues.push({
      code: "vice_captain_invalid",
      path: "squad.captaincy",
      message: `Expected exactly one vice-captain, received ${viceCaptains}.`,
    });
  }

  validateOrigins(candidate, context, issues);

  return Object.freeze(issues);
}

function expectResolved<T>(
  field: CandidateField<T>,
): Extract<CandidateField<T>, { readonly status: "resolved" }> {
  if (field.status !== "resolved") {
    throw new Error(
      "Validated candidate unexpectedly contains an unresolved field.",
    );
  }
  return field;
}

function confirmOrigin(
  origin: FieldOrigin,
  confirmedAt: UtcInstant,
): ConfirmedFieldOrigin {
  return Object.freeze({ source: origin, confirmedAt });
}

export type ConfirmTeamStateResult =
  | { readonly ok: true; readonly teamState: TeamState }
  | {
      readonly ok: false;
      readonly issues: readonly TeamStateValidationIssue[];
    };

export function confirmTeamState(input: {
  readonly teamStateId: TeamStateId;
  readonly candidate: TeamStateCandidate;
  readonly context: TeamStateValidationContext;
  readonly confirmedAt: UtcInstant;
}): ConfirmTeamStateResult {
  const issues = [
    ...validateTeamStateCandidate(input.candidate, input.context),
  ];

  if (input.confirmedAt < input.candidate.updatedAt) {
    issues.push({
      code: "confirmation_time_invalid",
      path: "confirmedAt",
      message: "Confirmation cannot precede the latest candidate revision.",
    });
  }

  if (issues.length > 0) {
    return Object.freeze({ ok: false, issues: Object.freeze(issues) });
  }

  const gameweekId = expectResolved(input.candidate.gameweekId);
  const rulesIdentity = expectResolved(input.candidate.rulesIdentity);
  const bank = expectResolved(input.candidate.bank);
  const freeTransfers = expectResolved(input.candidate.freeTransfers);
  const chips = expectResolved(input.candidate.chips);
  const provenanceRefs = new Set<ProvenanceId>();

  const squad = input.candidate.squad.map((slot): SquadPick => {
    const playerId = expectResolved(slot.playerId);
    const teamId = expectResolved(slot.teamId);
    const position = expectResolved(slot.position);
    const purchasePrice = expectResolved(slot.purchasePrice);
    const sellingPrice = expectResolved(slot.sellingPrice);
    const selection = expectResolved(slot.selection);
    const captaincy = expectResolved(slot.captaincy);

    return Object.freeze({
      slotId: slot.slotId,
      playerId: playerId.value,
      teamId: teamId.value,
      position: position.value,
      purchasePrice: purchasePrice.value,
      sellingPrice: sellingPrice.value,
      selection: selection.value,
      captaincy: captaincy.value,
    });
  });

  const origins: TeamStateOrigins = Object.freeze({
    gameweekId: confirmOrigin(gameweekId.origin, input.confirmedAt),
    rulesIdentity: confirmOrigin(rulesIdentity.origin, input.confirmedAt),
    bank: confirmOrigin(bank.origin, input.confirmedAt),
    freeTransfers: confirmOrigin(freeTransfers.origin, input.confirmedAt),
    chips: confirmOrigin(chips.origin, input.confirmedAt),
    squad: Object.freeze(
      input.candidate.squad.map((slot): ConfirmedSquadSlotOrigins => ({
        slotId: slot.slotId,
        playerId: confirmOrigin(
          expectResolved(slot.playerId).origin,
          input.confirmedAt,
        ),
        teamId: confirmOrigin(
          expectResolved(slot.teamId).origin,
          input.confirmedAt,
        ),
        position: confirmOrigin(
          expectResolved(slot.position).origin,
          input.confirmedAt,
        ),
        purchasePrice: confirmOrigin(
          expectResolved(slot.purchasePrice).origin,
          input.confirmedAt,
        ),
        sellingPrice: confirmOrigin(
          expectResolved(slot.sellingPrice).origin,
          input.confirmedAt,
        ),
        selection: confirmOrigin(
          expectResolved(slot.selection).origin,
          input.confirmedAt,
        ),
        captaincy: confirmOrigin(
          expectResolved(slot.captaincy).origin,
          input.confirmedAt,
        ),
      })),
    ),
  });

  for (const { origin } of collectOrigins(input.candidate)) {
    for (const provenanceId of origin.provenanceRefs) {
      provenanceRefs.add(provenanceId);
    }
  }

  return Object.freeze({
    ok: true,
    teamState: Object.freeze({
      kind: "confirmed",
      id: input.teamStateId,
      candidateId: input.candidate.id,
      gameweekId: gameweekId.value,
      rulesIdentity: rulesIdentity.value,
      squad: Object.freeze(squad),
      bank: bank.value,
      freeTransfers: freeTransfers.value,
      chips: Object.freeze([...chips.value]),
      confirmedAt: input.confirmedAt,
      origins,
      provenanceRefs: Object.freeze([...provenanceRefs]),
    }),
  });
}
