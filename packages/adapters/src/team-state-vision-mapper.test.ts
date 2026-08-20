import { describe, expect, it } from "vitest";
import {
  createPlayerId,
  createScreenshotFieldOrigin,
} from "@fpl-intelligence/domain";
import {
  SYNTHETIC_NOW,
  SYNTHETIC_REFERENCE_DATA,
} from "@fpl-intelligence/domain/testing";
import { normalizeExtractedPlayerIdentity } from "./team-state-vision-mapper.js";

describe("normalizeExtractedPlayerIdentity", () => {
  const origin = createScreenshotFieldOrigin({
    capturedAt: SYNTHETIC_NOW,
    confidence: { band: "high", score: 0.95 },
  });

  it("resolves a normalized player identity without exposing provider DTOs", () => {
    const player = SYNTHETIC_REFERENCE_DATA.players[0]!;
    const result = normalizeExtractedPlayerIdentity({
      extracted: { displayName: player.displayName, position: player.position },
      referenceData: SYNTHETIC_REFERENCE_DATA,
      origin,
    });
    expect(result.playerId).toMatchObject({
      status: "resolved",
      value: player.id,
    });
    expect(result.teamId).toMatchObject({
      status: "resolved",
      value: player.teamId,
    });
  });

  it("makes a missing identity correction-required rather than guessing", () => {
    const result = normalizeExtractedPlayerIdentity({
      extracted: { displayName: "Unknown player", position: "forward" },
      referenceData: SYNTHETIC_REFERENCE_DATA,
      origin,
    });
    expect(result.playerId).toMatchObject({ status: "missing" });
    expect(result.identityIssue).toEqual({
      code: "player_identity_not_found",
    });
    expect(result.position).toMatchObject({
      status: "resolved",
      value: "forward",
    });
  });

  it("keeps duplicate normalized names explicitly ambiguous", () => {
    const duplicated = {
      ...SYNTHETIC_REFERENCE_DATA,
      players: Object.freeze([
        ...SYNTHETIC_REFERENCE_DATA.players,
        {
          ...SYNTHETIC_REFERENCE_DATA.players[0]!,
          id: createPlayerId("synthetic-ambiguous-player"),
        },
      ]),
    };
    const result = normalizeExtractedPlayerIdentity({
      extracted: {
        displayName: SYNTHETIC_REFERENCE_DATA.players[0]!.displayName,
      },
      referenceData: duplicated,
      origin,
    });
    expect(result.playerId).toMatchObject({ status: "uncertain" });
    expect(result.teamId).toMatchObject({ status: "missing" });
    expect(result.identityIssue).toEqual({
      code: "ambiguous_player_identity",
      candidatePlayerIds: [
        createPlayerId("synthetic-ambiguous-player"),
        SYNTHETIC_REFERENCE_DATA.players[0]!.id,
      ],
    });
  });
});
