import { describe, expect, it } from "vitest";
import {
  addWatchlistPlayer,
  confirmTeamState,
  createNewsSignal,
  createNewsSignalId,
  createPlayerAvailabilityState,
  createTeamStateId,
  createUtcInstant,
  createVersion,
  createWatchlist,
  createWatchlistId,
  matchNewsRelevance,
  removeWatchlistPlayer,
} from ".";
import {
  SYNTHETIC_AVAILABILITY_STATE,
  SYNTHETIC_SIGNAL,
  SYNTHETIC_SIGNAL_ID,
} from "./testing/synthetic-news-intelligence";
import {
  createSyntheticCandidate,
  createSyntheticValidationContext,
  SYNTHETIC_NOW,
  SYNTHETIC_PLAYERS,
} from "./testing/synthetic-fixtures";

const confirmation = confirmTeamState({
  teamStateId: createTeamStateId("relevance-team-state"),
  candidate: createSyntheticCandidate(),
  context: createSyntheticValidationContext(),
  confirmedAt: SYNTHETIC_NOW,
});
if (!confirmation.ok) throw new Error("Synthetic team state must confirm.");
const teamState = confirmation.teamState;
const rules = Object.freeze({
  version: createVersion("news-relevance-v1"),
  minimumReasonCount: 1,
  strategicPlayerIds: Object.freeze([SYNTHETIC_PLAYERS[2]!.id]),
});
const watchlist = createWatchlist({
  watchlistId: createWatchlistId("relevance-watchlist"),
  teamStateId: teamState.id,
  playerIds: [],
  updatedAt: SYNTHETIC_NOW,
});

function signal(overrides: Partial<typeof SYNTHETIC_SIGNAL> = {}) {
  return createNewsSignal({ ...SYNTHETIC_SIGNAL, ...overrides });
}

function match(signals: readonly ReturnType<typeof signal>[], overrides = {}) {
  return matchNewsRelevance({
    teamState,
    watchlist,
    signals,
    evaluatedAt: SYNTHETIC_NOW,
    rules,
    ...overrides,
  });
}

describe("personalized news relevance", () => {
  it("matches a confirmed squad member independently of its import origin", () => {
    const result = match([signal()]);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      playerId: SYNTHETIC_PLAYERS[0]!.id,
      reasons: ["squad_member"],
      requiresReview: true,
    });
  });

  it("matches watchlist, suggested and explicitly strategic players", () => {
    const watchlistPlayer = SYNTHETIC_PLAYERS[1]!.id;
    const suggestedPlayer = SYNTHETIC_PLAYERS[3]!.id;
    const strategicPlayer = SYNTHETIC_PLAYERS[2]!.id;
    const result = match(
      [
        signal({
          newsSignalId: createNewsSignalId("watchlist"),
          playerId: watchlistPlayer,
        }),
        signal({
          newsSignalId: createNewsSignalId("suggested"),
          playerId: suggestedPlayer,
        }),
        signal({
          newsSignalId: createNewsSignalId("strategic"),
          playerId: strategicPlayer,
        }),
      ],
      {
        watchlist: addWatchlistPlayer(
          watchlist,
          watchlistPlayer,
          SYNTHETIC_NOW,
        ),
        suggestedPlayerIds: [suggestedPlayer],
      },
    );
    expect(result.records.map((record) => record.reasons)).toEqual([
      ["squad_member", "watchlist_member"],
      ["squad_member", "strategic_player"],
      ["squad_member", "suggested_player"],
    ]);
  });

  it("excludes unrelated signals and suppresses duplicate IDs", () => {
    const unrelated = signal({
      newsSignalId: createNewsSignalId("unrelated"),
      playerId: "outside-player" as (typeof SYNTHETIC_PLAYERS)[number]["id"],
    });
    const duplicate = signal({ newsSignalId: SYNTHETIC_SIGNAL_ID });
    const result = match([signal(), duplicate, unrelated]);
    expect(result.records).toHaveLength(1);
    expect(result.suppressed).toEqual({
      duplicateSignalIds: [SYNTHETIC_SIGNAL_ID],
      expiredSignalIds: [],
      unrelatedSignalIds: ["unrelated"],
    });
  });

  it("suppresses expired signals and retains unresolved conflicts for review", () => {
    const expired = signal({
      newsSignalId: createNewsSignalId("expired"),
      freshness: "expired",
    });
    const unresolved = signal({
      newsSignalId: createNewsSignalId("unresolved"),
      conflictState: "unresolved_conflict",
      state: "unknown",
    });
    const result = match([expired, unresolved]);
    expect(result.suppressed.expiredSignalIds).toEqual(["expired"]);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]!.requiresReview).toBe(true);
  });

  it("retains the current availability state and applies the configured threshold", () => {
    const availability = createPlayerAvailabilityState(
      SYNTHETIC_AVAILABILITY_STATE,
    );
    const result = match([signal()], { availabilityStates: [availability] });
    expect(result.records[0]!.availability).toEqual(availability);

    const suppressed = match([signal()], {
      rules: { ...rules, minimumReasonCount: 2 },
    });
    expect(suppressed.records).toEqual([]);
    expect(suppressed.suppressed.unrelatedSignalIds).toEqual([
      SYNTHETIC_SIGNAL_ID,
    ]);
  });

  it("keeps ambiguous identities quarantined and supports manual watchlist removal", () => {
    const updated = addWatchlistPlayer(
      watchlist,
      SYNTHETIC_PLAYERS[1]!.id,
      createUtcInstant("2026-08-18T12:01:00Z"),
    );
    const result = match([signal()], {
      watchlist: removeWatchlistPlayer(
        updated,
        SYNTHETIC_PLAYERS[1]!.id,
        createUtcInstant("2026-08-18T12:02:00Z"),
      ),
      unresolvedIdentityCandidates: [
        { reference: "candidate:ambiguous-player", reason: "ambiguous" },
      ],
    });
    expect(result.quarantinedIdentityCandidates).toEqual([
      { reference: "candidate:ambiguous-player", reason: "ambiguous" },
    ]);
  });

  it("is deterministic for equivalent inputs and evaluation time", () => {
    const newer = signal({
      newsSignalId: createNewsSignalId("newer"),
      evaluatedAt: createUtcInstant("2026-08-18T12:01:00Z"),
    });
    const first = match([signal(), newer]);
    const second = match([newer, signal()]);
    expect(second).toEqual(first);
    expect(first.records[0]!.signal.newsSignalId).toBe("newer");
  });

  it("rejects a watchlist attached to another team state", () => {
    expect(() =>
      match([signal()], {
        watchlist: createWatchlist({
          ...watchlist,
          teamStateId: createTeamStateId("another-team-state"),
        }),
      }),
    ).toThrow("Watchlist must belong to the confirmed TeamState.");
  });
});
