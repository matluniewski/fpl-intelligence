import {
  createManualFieldOrigin,
  createTeamStateCandidate,
  createUtcInstant,
  confirmTeamState,
  gameweekIdsEqual,
  resolvedField,
  reviseTeamStateCandidate,
  uncertainField,
} from "@fpl-intelligence/domain";
import type {
  CandidateRevision,
  ChipState,
  FootballReferenceDataPort,
  FplMoney,
  GameweekId,
  PlayerId,
  Position,
  RulesIdentity,
  ScreenshotCandidateRequest,
  SquadSelection,
  SquadSlotId,
  TeamId,
  TeamStateCandidate,
  TeamStateCandidateId,
  TeamStateCandidateStore,
  TeamStateId,
  TeamStateStore,
  TeamStateValidationIssue,
  UtcInstant,
  VisionTeamStateCandidatePort,
} from "@fpl-intelligence/domain";
import type {
  SafeImageDecoderPort,
  ValidatedImageInput,
} from "./image-input.js";

export interface EphemeralScreenshotStore {
  accept(input: {
    readonly bytes: Uint8Array;
    readonly metadata: ValidatedImageInput;
    readonly receivedAt: UtcInstant;
    readonly expiresAt: UtcInstant;
  }): Promise<{
    readonly artifactId: ScreenshotCandidateRequest["artifactId"];
  }>;
  delete(artifactId: ScreenshotCandidateRequest["artifactId"]): Promise<void>;
}
export const EPHEMERAL_SCREENSHOT_TTL_MS = 60 * 60 * 1000;
export interface VisionUsageContext {
  readonly eventId: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly providerRef: string;
  readonly recordedAt: UtcInstant;
  readonly instrumentationVersion: string;
}
export interface VisionUsageEvent extends VisionUsageContext {
  readonly occurredAt: UtcInstant;
  readonly serviceCategory: "vision";
  readonly operation: "team_state.screenshot_extract";
  readonly measurements: readonly [
    Readonly<{
      metric: "request_count";
      quantity: 1;
      unit: "request";
      measurementStatus: "measured";
    }>,
    Readonly<{
      metric: "image_count";
      quantity: 1;
      unit: "image";
      measurementStatus: "measured";
    }>,
  ];
  readonly outcome: "succeeded" | "failed" | "cancelled";
  readonly attribution: Readonly<{ scope: "user_triggered" }>;
  readonly correlation: Readonly<{ requestId: string }>;
  readonly estimateMetadata: Readonly<{ status: "unknown" }>;
}
export interface VisionUsageRecorder {
  record(event: VisionUsageEvent): Promise<void>;
}
export interface TeamStateImportDependencies {
  readonly referenceData: FootballReferenceDataPort;
  readonly vision: VisionTeamStateCandidatePort;
  readonly candidates: TeamStateCandidateStore;
  readonly teamStates: TeamStateStore;
  readonly screenshots: EphemeralScreenshotStore;
  readonly imageDecoder: SafeImageDecoderPort;
  readonly usage: VisionUsageRecorder;
}

export type ImportConfirmationIssue =
  | TeamStateValidationIssue
  | Readonly<{
      code: "reference_context_missing";
      path: "gameweekId" | "rulesIdentity";
      message: string;
    }>;

/** A complete, reference-data-backed manual fallback; no image or provider is required. */
export interface ManualTeamStateEntry {
  readonly candidateId: TeamStateCandidateId;
  readonly gameweekId: GameweekId;
  readonly rulesIdentity: RulesIdentity;
  readonly squad: readonly {
    readonly slotId: SquadSlotId;
    readonly playerId: PlayerId;
    readonly teamId: TeamId;
    readonly position: Position;
    readonly purchasePrice: FplMoney;
    readonly sellingPrice: FplMoney;
    readonly selection: SquadSelection;
    readonly captaincy: "none" | "captain" | "vice_captain";
  }[];
  readonly bank: FplMoney;
  readonly freeTransfers: number;
  readonly chips: readonly ChipState[];
  readonly enteredAt: UtcInstant;
}

export function createManualTeamStateCandidate(
  entry: ManualTeamStateEntry,
): TeamStateCandidate {
  const origin = createManualFieldOrigin(entry.enteredAt);
  return createTeamStateCandidate({
    id: entry.candidateId,
    gameweekId: resolvedField(entry.gameweekId, origin),
    rulesIdentity: resolvedField(entry.rulesIdentity, origin),
    squad: entry.squad.map((slot) => ({
      slotId: slot.slotId,
      playerId: resolvedField(slot.playerId, origin),
      teamId: resolvedField(slot.teamId, origin),
      position: resolvedField(slot.position, origin),
      purchasePrice: resolvedField(slot.purchasePrice, origin),
      sellingPrice: resolvedField(slot.sellingPrice, origin),
      selection: resolvedField(slot.selection, origin),
      captaincy: resolvedField(slot.captaincy, origin),
    })),
    bank: resolvedField(entry.bank, origin),
    freeTransfers: resolvedField(entry.freeTransfers, origin),
    chips: resolvedField(entry.chips, origin),
    createdAt: entry.enteredAt,
    updatedAt: entry.enteredAt,
  });
}

export class TeamStateImportService {
  constructor(private readonly deps: TeamStateImportDependencies) {}
  async extractScreenshot(input: {
    readonly bytes: Uint8Array;
    readonly request: Omit<ScreenshotCandidateRequest, "artifactId">;
    readonly usage: VisionUsageContext;
  }): Promise<TeamStateCandidate> {
    const decoded = await this.deps.imageDecoder.decodeAndSanitize(input.bytes);
    const artifact = await this.deps.screenshots.accept({
      bytes: decoded.bytes,
      metadata: decoded.metadata,
      receivedAt: input.request.requestedAt,
      expiresAt: createUtcInstant(
        new Date(
          new Date(input.request.requestedAt).getTime() +
            EPHEMERAL_SCREENSHOT_TTL_MS,
        ).toISOString(),
      ),
    });
    let extractedCandidate: TeamStateCandidate;
    try {
      extractedCandidate = await this.deps.vision.createCandidate({
        ...input.request,
        artifactId: artifact.artifactId,
      });
    } catch (error) {
      await this.deps.screenshots.delete(artifact.artifactId);
      await this.recordVisionUsage(input, "failed");
      throw error;
    }

    await this.recordVisionUsage(input, "succeeded");
    const candidate =
      extractedCandidate.gameweekId.status === "resolved" &&
      !gameweekIdsEqual(
        extractedCandidate.gameweekId.value,
        input.request.intendedGameweekId,
      )
        ? reviseTeamStateCandidate(
            extractedCandidate,
            {
              kind: "set_gameweek",
              value: uncertainField({
                suggestedValue: extractedCandidate.gameweekId.value,
                origin: extractedCandidate.gameweekId.origin,
                reason:
                  "Extracted gameweek does not match the onboarding gameweek and requires correction.",
              }),
            },
            extractedCandidate.updatedAt,
          )
        : extractedCandidate;
    try {
      await this.deps.candidates.save(candidate);
      return candidate;
    } finally {
      // Raw screenshot bytes are no longer needed once extraction finishes.
      await this.deps.screenshots.delete(artifact.artifactId);
    }
  }

  private async recordVisionUsage(
    input: {
      readonly request: Omit<ScreenshotCandidateRequest, "artifactId">;
      readonly usage: VisionUsageContext;
    },
    outcome: VisionUsageEvent["outcome"],
  ): Promise<void> {
    await this.deps.usage.record({
      ...input.usage,
      occurredAt: input.request.requestedAt,
      serviceCategory: "vision",
      operation: "team_state.screenshot_extract",
      measurements: [
        {
          metric: "request_count",
          quantity: 1,
          unit: "request",
          measurementStatus: "measured",
        },
        {
          metric: "image_count",
          quantity: 1,
          unit: "image",
          measurementStatus: "measured",
        },
      ],
      outcome,
      attribution: { scope: "user_triggered" },
      correlation: { requestId: input.usage.requestId },
      estimateMetadata: { status: "unknown" },
    });
  }
  async saveManualEntry(
    entry: ManualTeamStateEntry,
  ): Promise<TeamStateCandidate> {
    const candidate = createManualTeamStateCandidate(entry);
    await this.deps.candidates.save(candidate);
    return candidate;
  }

  /** Persists an already assembled manual candidate after a correction UI step. */
  async saveManualCandidate(candidate: TeamStateCandidate): Promise<void> {
    await this.deps.candidates.save(candidate);
  }
  async revise(
    candidateId: TeamStateCandidateId,
    revision: CandidateRevision,
    revisedAt: UtcInstant,
  ): Promise<TeamStateCandidate | null> {
    const candidate = await this.deps.candidates.getById(candidateId);
    if (candidate === null) return null;
    const updated = reviseTeamStateCandidate(candidate, revision, revisedAt);
    await this.deps.candidates.save(updated);
    return updated;
  }
  async confirm(input: {
    readonly candidateId: TeamStateCandidateId;
    readonly teamStateId: TeamStateId;
    readonly confirmedAt: UtcInstant;
  }): Promise<
    | { readonly ok: true }
    | { readonly ok: false; readonly reason: "not_found" }
    | {
        readonly ok: false;
        readonly reason: "validation_failed";
        readonly issues: readonly ImportConfirmationIssue[];
      }
  > {
    const candidate = await this.deps.candidates.getById(input.candidateId);
    if (candidate === null) return { ok: false, reason: "not_found" };
    const seasonId =
      candidate.gameweekId.status === "resolved"
        ? candidate.gameweekId.value.seasonId
        : candidate.rulesIdentity.status === "resolved"
          ? candidate.rulesIdentity.value.seasonId
          : null;
    if (seasonId === null) {
      return {
        ok: false,
        reason: "validation_failed",
        issues: [
          {
            code: "reference_context_missing",
            path: "gameweekId",
            message:
              "Enter a gameweek or rules identity before confirmation so reference data can be loaded.",
          },
        ],
      };
    }
    const reference = await this.deps.referenceData.loadReferenceData({
      seasonId,
      ...(candidate.gameweekId.status === "resolved"
        ? { gameweekId: candidate.gameweekId.value }
        : {}),
      asOf: input.confirmedAt,
    });
    const result = confirmTeamState({
      teamStateId: input.teamStateId,
      candidate,
      confirmedAt: input.confirmedAt,
      context: {
        rules: reference.rules,
        players: reference.players,
        provenanceRecords: [],
      },
    });
    if (!result.ok)
      return {
        ok: false,
        reason: "validation_failed",
        issues: result.issues,
      };
    await this.deps.teamStates.saveConfirmed(result.teamState);
    await this.deps.candidates.delete(candidate.id);
    return { ok: true };
  }
}
