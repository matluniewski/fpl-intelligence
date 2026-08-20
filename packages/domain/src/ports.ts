import type {
  EphemeralArtifactId,
  SeasonId,
  TeamStateCandidateId,
  TeamStateId,
} from "./identifiers";
import type { RawNewsItem } from "./news-intelligence";
import type { UtcInstant } from "./primitives";
import type { GameweekId, ReferenceDataSnapshot } from "./reference-data";
import type { TeamState, TeamStateCandidate } from "./team-state";

export interface ReferenceDataQuery {
  readonly seasonId: SeasonId;
  readonly gameweekId?: GameweekId;
  readonly asOf: UtcInstant;
}

export interface FootballReferenceDataPort {
  loadReferenceData(query: ReferenceDataQuery): Promise<ReferenceDataSnapshot>;
}

export interface NewsIngestionRequest {
  readonly requestedAt: UtcInstant;
  readonly cursor?: string;
}

export interface NewsIngestionBatch {
  readonly items: readonly RawNewsItem[];
  readonly nextCursor?: string;
  readonly complete: boolean;
}

/** Permitted source adapters return normalized items, never provider DTOs. */
export interface NewsSourcePort {
  loadBatch(request: NewsIngestionRequest): Promise<NewsIngestionBatch>;
}

export interface ScreenshotCandidateRequest {
  readonly artifactId: EphemeralArtifactId;
  readonly intendedGameweekId: GameweekId;
  readonly requestedAt: UtcInstant;
}

export interface VisionTeamStateCandidatePort {
  createCandidate(
    request: ScreenshotCandidateRequest,
  ): Promise<TeamStateCandidate>;
}

/**
 * Adapters for future permitted imports supply their own request type while
 * returning the same provider-independent provisional candidate.
 */
export interface TeamStateCandidateImportPort<TRequest> {
  createCandidate(request: TRequest): Promise<TeamStateCandidate>;
}

export interface TeamStateCandidateStore {
  save(candidate: TeamStateCandidate): Promise<void>;
  replace(
    candidate: TeamStateCandidate,
    expectedCandidate: TeamStateCandidate,
  ): Promise<boolean>;
  getById(id: TeamStateCandidateId): Promise<TeamStateCandidate | null>;
  delete(id: TeamStateCandidateId): Promise<void>;
}

export interface TeamStateStore {
  saveConfirmed(teamState: TeamState): Promise<void>;
  getById(id: TeamStateId): Promise<TeamState | null>;
  getLatest(): Promise<TeamState | null>;
}

export interface TeamStateConfirmationStore {
  /**
   * Persists the confirmed state and consumes its provisional candidate as one
   * atomic operation. A retry with identical state is idempotent.
   */
  saveConfirmedAndConsumeCandidate(
    teamState: TeamState,
    expectedCandidate: TeamStateCandidate,
  ): Promise<"confirmed" | "candidate_not_available">;
}
