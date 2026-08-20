import { describe, expect, it } from "vitest";
import {
  createEphemeralArtifactId,
  createGameweekId,
  createUserCorrectionFieldOrigin,
  createTeamStateId,
  createUtcInstant,
  missingField,
  resolvedField,
  type CandidateField,
  type FootballReferenceDataPort,
  type FplMoney,
  type TeamStateCandidate,
  type TeamStateCandidateStore,
  type TeamStateStore,
  type VisionTeamStateCandidatePort,
} from "@fpl-intelligence/domain";
import {
  SYNTHETIC_GAMEWEEK_ID,
  SYNTHETIC_NOW,
  SYNTHETIC_REFERENCE_DATA,
  createSyntheticCandidate,
} from "@fpl-intelligence/domain/testing";
import {
  createManualTeamStateCandidate,
  TeamStateImportService,
  type EphemeralScreenshotStore,
  type ManualTeamStateEntry,
  type VisionUsageEvent,
  type VisionUsageRecorder,
} from "./team-state-import.js";
import type { SafeImageDecoderPort } from "./image-input.js";

const visionUsage = {
  eventId: "vision-event-1",
  idempotencyKey: "vision-idempotency-1",
  requestId: "request-1",
  providerRef: "synthetic-vision",
  recordedAt: SYNTHETIC_NOW,
  instrumentationVersion: "1",
} as const;

function valueOf<T>(field: CandidateField<T>): T {
  if (field.status !== "resolved")
    throw new Error("Synthetic field is unresolved.");
  return field.value;
}

function syntheticManualEntry(): ManualTeamStateEntry {
  const source = createSyntheticCandidate();
  return {
    candidateId: source.id,
    gameweekId: valueOf(source.gameweekId),
    rulesIdentity: valueOf(source.rulesIdentity),
    squad: source.squad.map((slot) => ({
      slotId: slot.slotId,
      playerId: valueOf(slot.playerId),
      teamId: valueOf(slot.teamId),
      position: valueOf(slot.position),
      purchasePrice: valueOf(slot.purchasePrice),
      sellingPrice: valueOf(slot.sellingPrice),
      selection: valueOf(slot.selection),
      captaincy: valueOf(slot.captaincy),
    })),
    bank: valueOf(source.bank),
    freeTransfers: valueOf(source.freeTransfers),
    chips: valueOf(source.chips),
    enteredAt: SYNTHETIC_NOW,
  };
}

function service(
  options: {
    readonly candidate?: TeamStateCandidate;
    readonly visionFails?: boolean;
  } = {},
) {
  const candidates = new Map<string, TeamStateCandidate>();
  const states = new Map<string, ReturnType<TeamStateStore["getById"]>>();
  const deleted: string[] = [];
  const expirations: string[] = [];
  const events: VisionUsageEvent[] = [];
  const candidate = options.candidate ?? createSyntheticCandidate();
  const candidateStore: TeamStateCandidateStore = {
    save: async (value) => {
      candidates.set(value.id, value);
    },
    getById: async (id) => candidates.get(id) ?? null,
    delete: async (id) => {
      candidates.delete(id);
    },
  };
  const teamStates: TeamStateStore = {
    saveConfirmed: async (value) => {
      states.set(value.id, Promise.resolve(value));
    },
    getById: async (id) => (await states.get(id)) ?? null,
    getLatest: async () => null,
  };
  const screenshots: EphemeralScreenshotStore = {
    accept: async (input) => {
      expirations.push(input.expiresAt);
      return { artifactId: createEphemeralArtifactId("test-artifact") };
    },
    delete: async (id) => {
      deleted.push(id);
    },
  };
  const imageDecoder: SafeImageDecoderPort = {
    decodeAndSanitize: async (bytes) => ({
      bytes,
      metadata: {
        mediaType: "image/png",
        byteLength: bytes.length,
        width: 1,
        height: 1,
      },
    }),
  };
  const vision: VisionTeamStateCandidatePort = {
    createCandidate: async () => {
      if (options.visionFails) throw new Error("vision unavailable");
      return candidate;
    },
  };
  const referenceData: FootballReferenceDataPort = {
    loadReferenceData: async () => SYNTHETIC_REFERENCE_DATA,
  };
  const usage: VisionUsageRecorder = {
    record: async (event) => {
      events.push(event);
    },
  };
  return {
    sut: new TeamStateImportService({
      candidates: candidateStore,
      teamStates,
      screenshots,
      imageDecoder,
      vision,
      referenceData,
      usage,
    }),
    candidates,
    states,
    deleted,
    expirations,
    events,
    candidate,
  };
}

describe("TeamStateImportService", () => {
  it("preserves explicit manual origins for a complete fallback candidate", () => {
    const source = createSyntheticCandidate();
    const manual = createManualTeamStateCandidate({
      candidateId: source.id,
      gameweekId: SYNTHETIC_GAMEWEEK_ID,
      rulesIdentity: SYNTHETIC_REFERENCE_DATA.rules.identity,
      squad: source.squad.map((slot) => ({
        slotId: slot.slotId,
        playerId:
          slot.playerId.status === "resolved"
            ? slot.playerId.value
            : (() => {
                throw new Error("fixture");
              })(),
        teamId:
          slot.teamId.status === "resolved"
            ? slot.teamId.value
            : (() => {
                throw new Error("fixture");
              })(),
        position:
          slot.position.status === "resolved"
            ? slot.position.value
            : (() => {
                throw new Error("fixture");
              })(),
        purchasePrice:
          slot.purchasePrice.status === "resolved"
            ? slot.purchasePrice.value
            : (() => {
                throw new Error("fixture");
              })(),
        sellingPrice:
          slot.sellingPrice.status === "resolved"
            ? slot.sellingPrice.value
            : (() => {
                throw new Error("fixture");
              })(),
        selection:
          slot.selection.status === "resolved"
            ? slot.selection.value
            : (() => {
                throw new Error("fixture");
              })(),
        captaincy:
          slot.captaincy.status === "resolved"
            ? slot.captaincy.value
            : (() => {
                throw new Error("fixture");
              })(),
      })),
      bank:
        source.bank.status === "resolved"
          ? source.bank.value
          : (() => {
              throw new Error("fixture");
            })(),
      freeTransfers:
        source.freeTransfers.status === "resolved"
          ? source.freeTransfers.value
          : (() => {
              throw new Error("fixture");
            })(),
      chips:
        source.chips.status === "resolved"
          ? source.chips.value
          : (() => {
              throw new Error("fixture");
            })(),
      enteredAt: SYNTHETIC_NOW,
    });
    expect(manual.squad).toHaveLength(15);
    expect(manual.squad[0]!.playerId).toMatchObject({
      origin: { kind: "manual_entry" },
    });
  });
  it("keeps screenshots ephemeral while retaining only a provisional candidate", async () => {
    const test = service();
    await test.sut.extractScreenshot({
      bytes: new Uint8Array([1]),
      request: {
        intendedGameweekId: SYNTHETIC_GAMEWEEK_ID,
        requestedAt: SYNTHETIC_NOW,
      },
      usage: visionUsage,
    });
    expect(test.candidates.get(test.candidate.id)).toBe(test.candidate);
    expect(test.deleted).toEqual(["test-artifact"]);
    expect(test.expirations).toEqual(["2026-08-18T13:00:00.000Z"]);
    expect(test.events[0]).toMatchObject({
      outcome: "succeeded",
      serviceCategory: "vision",
      providerRef: "synthetic-vision",
      attribution: { scope: "user_triggered" },
      estimateMetadata: { status: "unknown" },
      measurements: [
        { metric: "request_count", quantity: 1 },
        { metric: "image_count", quantity: 1 },
      ],
    });
  });

  it("does not trust an extracted gameweek that conflicts with the request", async () => {
    const test = service();
    const candidate = await test.sut.extractScreenshot({
      bytes: new Uint8Array([1]),
      request: {
        intendedGameweekId: createGameweekId(SYNTHETIC_GAMEWEEK_ID.seasonId, 2),
        requestedAt: SYNTHETIC_NOW,
      },
      usage: { ...visionUsage, eventId: "vision-event-mismatch" },
    });
    expect(candidate.gameweekId).toMatchObject({
      status: "uncertain",
      reason: expect.stringContaining("requires correction"),
    });
  });
  it("deletes a screenshot and records failure when extraction fails", async () => {
    const test = service({ visionFails: true });
    await expect(
      test.sut.extractScreenshot({
        bytes: new Uint8Array([1]),
        request: {
          intendedGameweekId: SYNTHETIC_GAMEWEEK_ID,
          requestedAt: SYNTHETIC_NOW,
        },
        usage: visionUsage,
      }),
    ).rejects.toThrow("vision unavailable");
    expect(test.deleted).toEqual(["test-artifact"]);
    expect(test.events[0]).toMatchObject({ outcome: "failed" });
  });

  it("persists a user correction before confirmation", async () => {
    const test = service();
    await test.sut.saveManualCandidate(test.candidate);
    const correctedAt = createUtcInstant("2026-08-18T12:01:00Z");
    const corrected = await test.sut.revise(
      test.candidate.id,
      {
        kind: "set_free_transfers",
        value: resolvedField(2, createUserCorrectionFieldOrigin(correctedAt)),
      },
      correctedAt,
    );
    expect(corrected?.freeTransfers).toMatchObject({
      status: "resolved",
      value: 2,
      origin: { kind: "user_correction" },
    });
  });
  it("does not durably confirm an incomplete candidate, but confirms a manual fallback", async () => {
    const incomplete = {
      ...createSyntheticCandidate(),
      bank: missingField<FplMoney>("not visible"),
    };
    const blocked = service({ candidate: incomplete });
    await blocked.sut.saveManualCandidate(incomplete);
    const blockedResult = await blocked.sut.confirm({
      candidateId: incomplete.id,
      teamStateId: createTeamStateId("blocked"),
      confirmedAt: createUtcInstant("2026-08-18T12:01:00Z"),
    });
    expect(blockedResult).toMatchObject({
      ok: false,
      reason: "validation_failed",
      issues: [{ code: "field_missing", path: "bank" }],
    });
    expect(blocked.states.size).toBe(0);

    const manual = service();
    await manual.sut.saveManualCandidate(manual.candidate);
    await expect(
      manual.sut.confirm({
        candidateId: manual.candidate.id,
        teamStateId: createTeamStateId("confirmed"),
        confirmedAt: createUtcInstant("2026-08-18T12:01:00Z"),
      }),
    ).resolves.toEqual({ ok: true });
    expect(manual.candidates.size).toBe(0);
    expect(manual.states.size).toBe(1);
  });

  it("completes the manual-only path when vision is unavailable", async () => {
    const test = service({ visionFails: true });
    const candidate = await test.sut.saveManualEntry(syntheticManualEntry());
    const result = await test.sut.confirm({
      candidateId: candidate.id,
      teamStateId: createTeamStateId("manual-without-vision"),
      confirmedAt: createUtcInstant("2026-08-18T12:01:00Z"),
    });
    expect(result).toEqual({ ok: true });
    expect(test.deleted).toEqual([]);
    expect(test.events).toEqual([]);
  });
});
