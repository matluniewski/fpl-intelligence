import {
  missingField,
  resolvedField,
  uncertainField,
  type CandidateField,
  type FieldOrigin,
  type PlayerId,
  type Position,
  type ReferenceDataSnapshot,
  type TeamId,
} from "@fpl-intelligence/domain";
import { resolvePlayerIdentity } from "./player-identity.js";

/** Provider DTOs are mapped to this minimal extraction candidate inside adapters. */
export interface ExtractedPlayerIdentity {
  readonly displayName: string;
  readonly position?: Position;
  readonly teamHint?: string;
}

export interface NormalizedExtractedPlayerIdentity {
  readonly playerId: CandidateField<PlayerId>;
  readonly teamId: CandidateField<TeamId>;
  readonly position: CandidateField<Position>;
  readonly identityIssue?:
    | Readonly<{
        code: "ambiguous_player_identity";
        candidatePlayerIds: readonly PlayerId[];
      }>
    | Readonly<{ code: "player_identity_not_found" }>;
}

export function normalizeExtractedPlayerIdentity(input: {
  readonly extracted: ExtractedPlayerIdentity;
  readonly referenceData: ReferenceDataSnapshot;
  readonly origin: FieldOrigin;
}): NormalizedExtractedPlayerIdentity {
  const resolution = resolvePlayerIdentity(
    input.referenceData,
    input.extracted,
  );
  if (resolution.kind === "matched") {
    const player = resolution.match;
    return Object.freeze({
      playerId: resolvedField(player.id, input.origin),
      teamId: resolvedField(player.teamId, input.origin),
      position: resolvedField(player.position, input.origin),
    });
  }
  if (resolution.kind === "ambiguous") {
    const reason = "Multiple normalized players match the extracted identity.";
    return Object.freeze({
      playerId: uncertainField<PlayerId>({ origin: input.origin, reason }),
      teamId: missingField<TeamId>(reason, input.origin),
      position:
        input.extracted.position === undefined
          ? missingField<Position>(reason, input.origin)
          : resolvedField(input.extracted.position, input.origin),
      identityIssue: Object.freeze({
        code: "ambiguous_player_identity",
        candidatePlayerIds: resolution.candidatePlayerIds,
      }),
    });
  }
  const reason = "No normalized player matches the extracted identity.";
  return Object.freeze({
    playerId: missingField<PlayerId>(reason, input.origin),
    teamId: missingField<TeamId>(reason, input.origin),
    position:
      input.extracted.position === undefined
        ? missingField<Position>(reason, input.origin)
        : resolvedField(input.extracted.position, input.origin),
    identityIssue: Object.freeze({ code: "player_identity_not_found" }),
  });
}
