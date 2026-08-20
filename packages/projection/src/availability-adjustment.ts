import type {
  ClaimId,
  EvidenceId,
  NewsSignalId,
  PlayerAvailabilityState,
  ProvenanceId,
  UtcInstant,
  Version,
} from "@fpl-intelligence/domain";
import type {
  PlayerGameweekProjection,
  PlayerGameweekProjectionInput,
} from "./contracts";
import { projectPlayerGameweek } from "./project-player";

export interface AvailabilityAdjustmentRules {
  readonly version: Version;
  readonly name: string;
}

export interface AvailabilityAdjustmentTrace {
  readonly availabilityStateId: string;
  readonly signalRefs: readonly NewsSignalId[];
  readonly evidenceRefs: readonly EvidenceId[];
  readonly claimRefs: readonly ClaimId[];
  readonly provenanceRefs: readonly ProvenanceId[];
  readonly evaluatedAt: UtcInstant;
  readonly ruleName: string;
  readonly ruleVersion: Version;
}

export interface AvailabilityAdjustedProjection {
  readonly baseline: PlayerGameweekProjection;
  readonly adjusted: PlayerGameweekProjection;
  readonly applied: boolean;
  readonly reasonCodes: readonly string[];
  readonly trace: AvailabilityAdjustmentTrace | null;
}

function sorted<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)].sort());
}

function conservativeReason(
  state: PlayerAvailabilityState | null,
  input: PlayerGameweekProjectionInput,
): string | null {
  if (state === null) return "availability_state_not_supplied";
  if (state.playerId !== input.playerId)
    return "availability_state_player_mismatch";
  if (state.freshness !== "current") return "availability_state_not_current";
  if (state.conflictState !== "no_conflict")
    return "availability_state_conflicted";
  if (state.confidenceBand !== "medium" && state.confidenceBand !== "high")
    return "availability_state_low_confidence";
  if (
    state.expectedMinutes === null ||
    state.expectedStartProbability === null ||
    state.signalRefs.length === 0 ||
    state.evidenceRefs.length === 0
  )
    return "availability_state_insufficient_for_adjustment";
  if (state.evaluatedAt > input.evaluatedAt)
    return "availability_state_after_projection_evaluation";
  return null;
}

/**
 * Produces a separate news-adjusted projection. The baseline is never mutated
 * and unsupported or uncertain availability material leaves it unchanged.
 */
export function applyAvailabilityToProjection(input: {
  readonly projection: PlayerGameweekProjectionInput;
  readonly availabilityState: PlayerAvailabilityState | null;
  readonly claimRefs: readonly ClaimId[];
  readonly rules: AvailabilityAdjustmentRules;
}): AvailabilityAdjustedProjection {
  const baseline = projectPlayerGameweek(input.projection);
  const reason = conservativeReason(input.availabilityState, input.projection);
  if (reason !== null)
    return Object.freeze({
      baseline,
      adjusted: baseline,
      applied: false,
      reasonCodes: Object.freeze([reason]),
      trace: null,
    });

  const state = input.availabilityState;
  if (state === null) {
    throw new Error("Validated availability state was unexpectedly absent.");
  }
  const adjustedInput: PlayerGameweekProjectionInput = Object.freeze({
    ...input.projection,
    fixtures: Object.freeze(
      input.projection.fixtures.map((fixture) => {
        const expectedMinutes = Math.min(
          fixture.expectedMinutes,
          state.expectedMinutes!,
        );
        const appearanceProbability = Math.min(
          fixture.appearanceProbability,
          state.expectedStartProbability!,
        );
        const startProbability = Math.min(
          fixture.startProbability,
          state.expectedStartProbability!,
        );
        const sixtyMinuteProbability = Math.min(
          fixture.sixtyMinuteProbability,
          expectedMinutes >= 60 ? state.expectedStartProbability! : 0,
        );
        return Object.freeze({
          ...fixture,
          expectedMinutes,
          appearanceProbability,
          startProbability,
          sixtyMinuteProbability,
        });
      }),
    ),
  });
  const adjusted = projectPlayerGameweek(adjustedInput);
  return Object.freeze({
    baseline,
    adjusted,
    applied: true,
    reasonCodes: Object.freeze([
      "availability_minutes_and_probabilities_capped",
      `availability_${state.availability}`,
    ]),
    trace: Object.freeze({
      availabilityStateId: state.availabilityStateId,
      signalRefs: sorted(state.signalRefs),
      evidenceRefs: sorted(state.evidenceRefs),
      claimRefs: sorted(input.claimRefs),
      provenanceRefs: sorted(state.provenanceRefs),
      evaluatedAt: state.evaluatedAt,
      ruleName: input.rules.name,
      ruleVersion: input.rules.version,
    }),
  });
}
