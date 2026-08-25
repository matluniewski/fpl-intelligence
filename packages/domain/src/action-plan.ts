import type {
  ActionPlanId,
  RecommendationId,
  RecommendationOptionId,
  TeamStateId,
} from "./identifiers";
import type { UtcInstant } from "./primitives";
import type { ProposedFplAction } from "./recommendation";
import type { GameweekId } from "./reference-data";

export type ManualActionScope = "transfer" | "captaincy" | "lineup";

/** A deliberate non-action is preserved instead of being inferred by a UI. */
export type ActionPlanInstruction =
  | ProposedFplAction
  | {
      readonly kind: "hold";
      readonly scope: ManualActionScope;
      readonly gameweekId: GameweekId;
      readonly reasonCode: string;
    }
  | {
      readonly kind: "wait";
      readonly scope: ManualActionScope;
      readonly gameweekId: GameweekId;
      readonly reasonCode: string;
    };

/**
 * Immutable record of the option a user accepted inside this product. It does
 * not represent approval in, or a mutation of, the official FPL service.
 */
export interface ActionPlan {
  readonly actionPlanId: ActionPlanId;
  readonly recommendationId: RecommendationId;
  readonly recommendationOptionId: RecommendationOptionId;
  readonly teamStateId: TeamStateId;
  readonly approvedAt: UtcInstant;
  readonly instructions: readonly ActionPlanInstruction[];
}

export type CreateActionPlanInput = ActionPlan;

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function actionKey(instruction: ActionPlanInstruction): string {
  switch (instruction.kind) {
    case "select_starter":
    case "set_captain":
    case "set_vice_captain":
      return `${instruction.kind}:${instruction.playerId}:${instruction.gameweekId.number}`;
    case "set_bench_order":
      return `${instruction.kind}:${instruction.playerId}:${instruction.order}:${instruction.gameweekId.number}`;
    case "transfer":
      return `${instruction.kind}:${instruction.outPlayerId}:${instruction.inPlayerId}:${instruction.gameweekId.number}`;
    case "roll_transfer":
      return `${instruction.kind}:${instruction.gameweekId.number}`;
    case "apply_points_hit":
      return `${instruction.kind}:${instruction.points}:${instruction.gameweekId.number}`;
    case "activate_chip":
      return `${instruction.kind}:${instruction.chipId}:${instruction.gameweekId.number}`;
    case "hold":
    case "wait":
      return `${instruction.kind}:${instruction.scope}:${instruction.gameweekId.number}`;
  }
}

function freezeGameweek(gameweekId: GameweekId): GameweekId {
  return Object.freeze({ ...gameweekId });
}

function freezeInstruction(
  instruction: ActionPlanInstruction,
): ActionPlanInstruction {
  return Object.freeze({
    ...instruction,
    gameweekId: freezeGameweek(instruction.gameweekId),
  });
}

/** Validates and snapshots an internal approval without contacting FPL. */
export function createActionPlan(input: CreateActionPlanInput): ActionPlan {
  if (input.instructions.length === 0) {
    throw new RangeError("An action plan requires at least one instruction.");
  }

  const instructionKeys = new Set<string>();
  for (const instruction of input.instructions) {
    const key = actionKey(instruction);
    if (instructionKeys.has(key)) {
      throw new RangeError("Action plan instructions must be unique.");
    }
    instructionKeys.add(key);

    if (
      (instruction.kind === "hold" || instruction.kind === "wait") &&
      !isNonEmpty(instruction.reasonCode)
    ) {
      throw new RangeError("Hold and wait instructions require a reason code.");
    }
  }

  return Object.freeze({
    ...input,
    instructions: Object.freeze(input.instructions.map(freezeInstruction)),
  });
}
