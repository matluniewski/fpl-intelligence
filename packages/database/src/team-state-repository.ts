import { createHash } from "node:crypto";
import { desc, eq, lte } from "drizzle-orm";
import type {
  TeamState,
  TeamStateCandidate,
  TeamStateCandidateId,
  TeamStateCandidateStore,
  TeamStateId,
  TeamStateStore,
  UtcInstant,
} from "@fpl-intelligence/domain";
import {
  createTeamStateCandidateId,
  createTeamStateId,
  createUtcInstant,
} from "@fpl-intelligence/domain";
import type { DatabaseClient } from "./client";
import { teamStateCandidates, teamStates } from "./schema";

type Database = DatabaseClient["db"];
const CANDIDATE_RETENTION_MS = 24 * 60 * 60 * 1000;

function candidateFromRow(
  value: TeamStateCandidate,
  id: string,
): TeamStateCandidate {
  return { ...value, id: createTeamStateCandidateId(id) };
}
function teamStateFromRow(value: TeamState, id: string): TeamState {
  return { ...value, id: createTeamStateId(id) };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function fingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export interface TeamStateCandidateRepository extends TeamStateCandidateStore {
  deleteExpiredCandidates(
    asOf: UtcInstant,
  ): Promise<readonly TeamStateCandidateId[]>;
}
export interface TeamStatePersistenceRepository {
  readonly candidates: TeamStateCandidateRepository;
  readonly teamStates: TeamStateStore;
}

export class TeamStateConflictError extends Error {
  readonly code = "team_state_conflict" as const;

  constructor(readonly teamStateId: TeamStateId) {
    super(`TeamState ${teamStateId} already has different content.`);
    this.name = "TeamStateConflictError";
  }
}

export function createTeamStatePersistenceRepository(
  db: Database,
): TeamStatePersistenceRepository {
  const candidates: TeamStateCandidateRepository = {
    async save(candidate: TeamStateCandidate) {
      await db
        .insert(teamStateCandidates)
        .values({
          candidateId: candidate.id,
          createdAt: new Date(candidate.createdAt),
          updatedAt: new Date(candidate.updatedAt),
          retainUntil: new Date(
            new Date(candidate.updatedAt).getTime() + CANDIDATE_RETENTION_MS,
          ),
          candidate,
        })
        .onConflictDoUpdate({
          target: teamStateCandidates.candidateId,
          set: {
            updatedAt: new Date(candidate.updatedAt),
            retainUntil: new Date(
              new Date(candidate.updatedAt).getTime() + CANDIDATE_RETENTION_MS,
            ),
            candidate,
          },
        });
    },
    async getById(id: TeamStateCandidateId) {
      const [row] = await db
        .select()
        .from(teamStateCandidates)
        .where(eq(teamStateCandidates.candidateId, id))
        .limit(1);
      return row === undefined
        ? null
        : candidateFromRow(row.candidate, row.candidateId);
    },
    async delete(id: TeamStateCandidateId) {
      await db
        .delete(teamStateCandidates)
        .where(eq(teamStateCandidates.candidateId, id));
    },
    async deleteExpiredCandidates(asOf: UtcInstant) {
      const deleted = await db
        .delete(teamStateCandidates)
        .where(
          lte(
            teamStateCandidates.retainUntil,
            new Date(createUtcInstant(asOf)),
          ),
        )
        .returning({ candidateId: teamStateCandidates.candidateId });
      return Object.freeze(
        deleted
          .map((row) => createTeamStateCandidateId(row.candidateId))
          .sort(),
      );
    },
  };
  const confirmed: TeamStateStore = {
    async saveConfirmed(teamState: TeamState) {
      const inserted = await db
        .insert(teamStates)
        .values({
          teamStateId: teamState.id,
          candidateId: teamState.candidateId,
          gameweekSeasonId: teamState.gameweekId.seasonId,
          gameweekNumber: teamState.gameweekId.number,
          confirmedAt: new Date(teamState.confirmedAt),
          teamState,
        })
        .onConflictDoNothing({ target: teamStates.teamStateId })
        .returning({ teamStateId: teamStates.teamStateId });
      if (inserted.length !== 0) return;

      const [existing] = await db
        .select({ teamState: teamStates.teamState })
        .from(teamStates)
        .where(eq(teamStates.teamStateId, teamState.id))
        .limit(1);
      if (
        existing === undefined ||
        fingerprint(existing.teamState) !== fingerprint(teamState)
      ) {
        throw new TeamStateConflictError(teamState.id);
      }
    },
    async getById(id: TeamStateId) {
      const [row] = await db
        .select()
        .from(teamStates)
        .where(eq(teamStates.teamStateId, id))
        .limit(1);
      return row === undefined
        ? null
        : teamStateFromRow(row.teamState, row.teamStateId);
    },
    async getLatest() {
      const [row] = await db
        .select()
        .from(teamStates)
        .orderBy(desc(teamStates.confirmedAt), desc(teamStates.teamStateId))
        .limit(1);
      return row === undefined
        ? null
        : teamStateFromRow(row.teamState, row.teamStateId);
    },
  };
  return Object.freeze({
    candidates: Object.freeze(candidates),
    teamStates: Object.freeze(confirmed),
  });
}
