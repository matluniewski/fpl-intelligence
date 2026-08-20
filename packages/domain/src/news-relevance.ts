import type { NewsSignal, PlayerAvailabilityState } from "./news-intelligence";
import type { PlayerId } from "./identifiers";
import type { TeamState } from "./team-state";
import type { UtcInstant, Version } from "./primitives";
import type { Watchlist } from "./watchlist";

export type RelevanceReason =
  "squad_member" | "watchlist_member" | "suggested_player" | "strategic_player";

export interface NewsRelevanceRules {
  readonly version: Version;
  readonly minimumReasonCount: number;
  readonly strategicPlayerIds: readonly PlayerId[];
}

export interface NewsRelevanceRecord {
  readonly playerId: PlayerId;
  readonly signal: NewsSignal;
  readonly availability: PlayerAvailabilityState | null;
  readonly reasons: readonly RelevanceReason[];
  readonly evaluatedAt: UtcInstant;
  readonly requiresReview: boolean;
}

export interface NewsRelevanceResult {
  readonly records: readonly NewsRelevanceRecord[];
  readonly suppressed: Readonly<{
    duplicateSignalIds: readonly string[];
    expiredSignalIds: readonly string[];
    unrelatedSignalIds: readonly string[];
  }>;
  readonly quarantinedIdentityCandidates: readonly Readonly<{
    reference: string;
    reason: "ambiguous" | "unresolved";
  }>[];
}

function isEffective(signal: NewsSignal, evaluatedAt: UtcInstant): boolean {
  return (
    signal.freshness !== "expired" &&
    signal.effectiveFrom <= evaluatedAt &&
    (signal.effectiveUntil === undefined ||
      signal.effectiveUntil >= evaluatedAt)
  );
}

function compareSignals(left: NewsSignal, right: NewsSignal): number {
  return (
    right.evaluatedAt.localeCompare(left.evaluatedAt) ||
    left.newsSignalId.localeCompare(right.newsSignalId)
  );
}

function relevanceReasons(input: {
  readonly playerId: PlayerId;
  readonly squad: ReadonlySet<PlayerId>;
  readonly watchlist: ReadonlySet<PlayerId>;
  readonly suggested: ReadonlySet<PlayerId>;
  readonly strategic: ReadonlySet<PlayerId>;
}): readonly RelevanceReason[] {
  const reasons: RelevanceReason[] = [];
  if (input.squad.has(input.playerId)) reasons.push("squad_member");
  if (input.watchlist.has(input.playerId)) reasons.push("watchlist_member");
  if (input.suggested.has(input.playerId)) reasons.push("suggested_player");
  if (input.strategic.has(input.playerId)) reasons.push("strategic_player");
  return Object.freeze(reasons);
}

/**
 * Deterministically selects central news signals that matter to one confirmed
 * team context. It never fetches a provider and does not mutate TeamState.
 */
export function matchNewsRelevance(input: {
  readonly teamState: TeamState;
  readonly watchlist: Watchlist;
  readonly suggestedPlayerIds?: readonly PlayerId[];
  readonly signals: readonly NewsSignal[];
  readonly availabilityStates?: readonly PlayerAvailabilityState[];
  readonly evaluatedAt: UtcInstant;
  readonly rules: NewsRelevanceRules;
  /** Upstream candidates without a verified PlayerId must never be matched. */
  readonly unresolvedIdentityCandidates?: readonly Readonly<{
    reference: string;
    reason: "ambiguous" | "unresolved";
  }>[];
}): NewsRelevanceResult {
  if (
    !Number.isSafeInteger(input.rules.minimumReasonCount) ||
    input.rules.minimumReasonCount < 1
  ) {
    throw new RangeError("minimumReasonCount must be a positive safe integer.");
  }

  if (input.watchlist.teamStateId !== input.teamState.id) {
    throw new RangeError("Watchlist must belong to the confirmed TeamState.");
  }
  const squad = new Set(input.teamState.squad.map((slot) => slot.playerId));
  const watchlist = new Set(input.watchlist.playerIds);
  const suggested = new Set(input.suggestedPlayerIds ?? []);
  const strategic = new Set(input.rules.strategicPlayerIds);
  const availabilityByPlayer = new Map<PlayerId, PlayerAvailabilityState>();
  for (const state of input.availabilityStates ?? []) {
    const existing = availabilityByPlayer.get(state.playerId);
    if (
      existing === undefined ||
      state.evaluatedAt > existing.evaluatedAt ||
      (state.evaluatedAt === existing.evaluatedAt &&
        state.availabilityStateId < existing.availabilityStateId)
    ) {
      availabilityByPlayer.set(state.playerId, state);
    }
  }

  const seen = new Set<string>();
  const selected = new Map<PlayerId, NewsSignal>();
  const duplicateSignalIds: string[] = [];
  const expiredSignalIds: string[] = [];
  const unrelatedSignalIds: string[] = [];
  for (const signal of [...input.signals].sort(compareSignals)) {
    if (seen.has(signal.newsSignalId)) {
      duplicateSignalIds.push(signal.newsSignalId);
      continue;
    }
    seen.add(signal.newsSignalId);
    if (!isEffective(signal, input.evaluatedAt)) {
      expiredSignalIds.push(signal.newsSignalId);
      continue;
    }
    const reasons = relevanceReasons({
      playerId: signal.playerId,
      squad,
      watchlist,
      suggested,
      strategic,
    });
    if (reasons.length < input.rules.minimumReasonCount) {
      unrelatedSignalIds.push(signal.newsSignalId);
      continue;
    }
    if (!selected.has(signal.playerId)) selected.set(signal.playerId, signal);
  }

  const records = [...selected.values()]
    .map((signal): NewsRelevanceRecord =>
      Object.freeze({
        playerId: signal.playerId,
        signal,
        availability: availabilityByPlayer.get(signal.playerId) ?? null,
        reasons: relevanceReasons({
          playerId: signal.playerId,
          squad,
          watchlist,
          suggested,
          strategic,
        }),
        evaluatedAt: input.evaluatedAt,
        requiresReview:
          signal.conflictState === "unresolved_conflict" ||
          signal.state === "unknown" ||
          signal.confidenceBand === "low",
      }),
    )
    .sort((left, right) => left.playerId.localeCompare(right.playerId));

  return Object.freeze({
    records: Object.freeze(records),
    suppressed: Object.freeze({
      duplicateSignalIds: Object.freeze(duplicateSignalIds.sort()),
      expiredSignalIds: Object.freeze(expiredSignalIds.sort()),
      unrelatedSignalIds: Object.freeze(unrelatedSignalIds.sort()),
    }),
    quarantinedIdentityCandidates: Object.freeze(
      [...(input.unresolvedIdentityCandidates ?? [])].sort(
        (left, right) =>
          left.reference.localeCompare(right.reference) ||
          left.reason.localeCompare(right.reason),
      ),
    ),
  });
}
