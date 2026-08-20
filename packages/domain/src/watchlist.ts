import type { PlayerId, TeamStateId, WatchlistId } from "./identifiers";
import type { UtcInstant } from "./primitives";

/** A manually curated list scoped to one confirmed team context, not an account. */
export interface Watchlist {
  readonly watchlistId: WatchlistId;
  readonly teamStateId: TeamStateId;
  readonly playerIds: readonly PlayerId[];
  readonly updatedAt: UtcInstant;
}

function sortedUnique(playerIds: readonly PlayerId[]): readonly PlayerId[] {
  return Object.freeze([...new Set(playerIds)].sort());
}

export function createWatchlist(input: Watchlist): Watchlist {
  return Object.freeze({ ...input, playerIds: sortedUnique(input.playerIds) });
}

export function addWatchlistPlayer(
  watchlist: Watchlist,
  playerId: PlayerId,
  updatedAt: UtcInstant,
): Watchlist {
  if (updatedAt < watchlist.updatedAt) {
    throw new RangeError("Watchlist updates cannot move time backwards.");
  }
  return createWatchlist({
    ...watchlist,
    playerIds: [...watchlist.playerIds, playerId],
    updatedAt,
  });
}

export function removeWatchlistPlayer(
  watchlist: Watchlist,
  playerId: PlayerId,
  updatedAt: UtcInstant,
): Watchlist {
  if (updatedAt < watchlist.updatedAt) {
    throw new RangeError("Watchlist updates cannot move time backwards.");
  }
  return createWatchlist({
    ...watchlist,
    playerIds: watchlist.playerIds.filter(
      (candidate) => candidate !== playerId,
    ),
    updatedAt,
  });
}
