import type {
  Player,
  PlayerId,
  Position,
  ReferenceDataSnapshot,
} from "@fpl-intelligence/domain";

export interface PlayerIdentityQuery {
  readonly displayName: string;
  readonly position?: Position;
  readonly teamHint?: string;
}

export type PlayerIdentityResolution =
  | Readonly<{
      kind: "matched";
      match: Player;
      strategy: "normalized_name" | "normalized_name_and_context";
    }>
  | Readonly<{
      kind: "ambiguous";
      candidatePlayerIds: readonly PlayerId[];
    }>
  | Readonly<{ kind: "not_found" }>;

function normalizeIdentityText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

export function resolvePlayerIdentity(
  snapshot: ReferenceDataSnapshot,
  query: PlayerIdentityQuery,
): PlayerIdentityResolution {
  const normalizedName = normalizeIdentityText(query.displayName);
  if (normalizedName.length === 0) {
    return Object.freeze({ kind: "not_found" });
  }

  const normalizedTeamHint =
    query.teamHint === undefined
      ? undefined
      : normalizeIdentityText(query.teamHint);
  const teams = new Map(snapshot.teams.map((team) => [team.id, team]));
  const nameMatches = snapshot.players.filter(
    (player) => normalizeIdentityText(player.displayName) === normalizedName,
  );
  const contextualMatches = nameMatches.filter((player) => {
    if (query.position !== undefined && player.position !== query.position) {
      return false;
    }

    if (normalizedTeamHint !== undefined) {
      const team = teams.get(player.teamId);
      return (
        team !== undefined &&
        (normalizeIdentityText(team.name) === normalizedTeamHint ||
          normalizeIdentityText(team.shortName) === normalizedTeamHint)
      );
    }

    return true;
  });

  if (contextualMatches.length === 1) {
    return Object.freeze({
      kind: "matched",
      match: contextualMatches[0]!,
      strategy:
        query.position === undefined && normalizedTeamHint === undefined
          ? "normalized_name"
          : "normalized_name_and_context",
    });
  }

  const candidates = contextualMatches.length > 0 ? contextualMatches : [];
  if (candidates.length > 1) {
    return Object.freeze({
      kind: "ambiguous",
      candidatePlayerIds: Object.freeze(
        candidates.map((player) => player.id).sort(),
      ),
    });
  }

  return Object.freeze({ kind: "not_found" });
}
