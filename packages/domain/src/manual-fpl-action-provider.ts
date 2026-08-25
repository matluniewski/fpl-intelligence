import type { ActionPlan, ActionPlanInstruction } from "./action-plan";

export const OFFICIAL_FPL_URL = "https://fantasy.premierleague.com/";

export interface ManualFplActionStep {
  readonly instruction: ActionPlanInstruction;
  readonly completionRequired: true;
}

/**
 * Consumer-facing handoff only. Opening the supplied URL is optional UI
 * navigation; execution and verification remain with the user in FPL.
 */
export interface ManualFplActionHandoff {
  readonly kind: "manual_fpl_handoff";
  readonly actionPlanId: ActionPlan["actionPlanId"];
  readonly officialFplUrl: typeof OFFICIAL_FPL_URL;
  readonly approvalScope: "internal_only";
  readonly steps: readonly ManualFplActionStep[];
}

/** This port deliberately has no authenticate, execute, or mutation method. */
export interface ManualFplActionProvider {
  prepareHandoff(actionPlan: ActionPlan): Promise<ManualFplActionHandoff>;
}

function freezeStep(instruction: ActionPlanInstruction): ManualFplActionStep {
  return Object.freeze({ instruction, completionRequired: true });
}

/** A deterministic, network-free MVP provider implementation. */
export class StaticManualFplActionProvider implements ManualFplActionProvider {
  async prepareHandoff(
    actionPlan: ActionPlan,
  ): Promise<ManualFplActionHandoff> {
    return Object.freeze({
      kind: "manual_fpl_handoff",
      actionPlanId: actionPlan.actionPlanId,
      officialFplUrl: OFFICIAL_FPL_URL,
      approvalScope: "internal_only",
      steps: Object.freeze(actionPlan.instructions.map(freezeStep)),
    });
  }
}
