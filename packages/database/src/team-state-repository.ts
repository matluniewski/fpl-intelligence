import { createHash } from "node:crypto";
import { desc, eq, lte, sql } from "drizzle-orm";
import type {
  TeamState,
  TeamStateCandidate,
  TeamStateCandidateId,
  TeamStateCandidateStore,
  TeamStateConfirmationStore,
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
  readonly confirmations: TeamStateConfirmationStore;
}

export class TeamStateConflictError extends Error {
  readonly code = "team_state_conflict" as const;

  constructor(readonly teamStateId: TeamStateId) {
    super(`TeamState ${teamStateId} already has different content.`);
    this.name = "TeamStateConflictError";
  }
}

export class TeamStateCandidateConflictError extends Error {
  readonly code = "team_state_candidate_conflict" as const;

  constructor(readonly candidateId: TeamStateCandidateId) {
    super(`TeamState candidate ${candidateId} already has different content.`);
    this.name = "TeamStateCandidateConflictError";
  }
}

export function createTeamStatePersistenceRepository(
  db: Database,
): TeamStatePersistenceRepository {
  const candidates: TeamStateCandidateRepository = {
    async save(candidate: TeamStateCandidate) {
      await db.transaction(async (transaction) => {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${candidate.id}, 0))`,
        );
        const [confirmedState] = await transaction
          .select({ teamStateId: teamStates.teamStateId })
          .from(teamStates)
          .where(eq(teamStates.candidateId, candidate.id))
          .limit(1);
        if (confirmedState !== undefined) {
          throw new Error(
            "A confirmed TeamState already consumed this candidate.",
          );
        }
        const [existing] = await transaction
          .select({ candidate: teamStateCandidates.candidate })
          .from(teamStateCandidates)
          .where(eq(teamStateCandidates.candidateId, candidate.id))
          .limit(1);
        if (existing !== undefined) {
          if (fingerprint(existing.candidate) === fingerprint(candidate))
            return;
          throw new TeamStateCandidateConflictError(candidate.id);
        }
        await transaction.insert(teamStateCandidates).values({
          candidateId: candidate.id,
          createdAt: new Date(candidate.createdAt),
          updatedAt: new Date(candidate.updatedAt),
          retainUntil: new Date(
            new Date(candidate.updatedAt).getTime() + CANDIDATE_RETENTION_MS,
          ),
          candidate,
        });
      });
    },
    async replace(candidate, expectedCandidate) {
      return db.transaction(async (transaction) => {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${candidate.id}, 0))`,
        );
        const [current] = await transaction
          .select({ candidate: teamStateCandidates.candidate })
          .from(teamStateCandidates)
          .where(eq(teamStateCandidates.candidateId, candidate.id))
          .limit(1);
        if (
          current === undefined ||
          fingerprint(current.candidate) !== fingerprint(expectedCandidate)
        ) {
          return false;
        }
        const updated = await transaction
          .update(teamStateCandidates)
          .set({
            updatedAt: new Date(candidate.updatedAt),
            retainUntil: new Date(
              new Date(candidate.updatedAt).getTime() + CANDIDATE_RETENTION_MS,
            ),
            candidate,
          })
          .where(eq(teamStateCandidates.candidateId, candidate.id))
          .returning({ candidateId: teamStateCandidates.candidateId });
        return updated.length === 1;
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
  const confirmations: TeamStateConfirmationStore = {
    async saveConfirmedAndConsumeCandidate(
      teamState: TeamState,
      expectedCandidate: TeamStateCandidate,
    ) {
      return db.transaction(async (transaction) => {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${teamState.candidateId}, 0))`,
        );
        const [candidateToConsume] = await transaction
          .select({ candidate: teamStateCandidates.candidate })
          .from(teamStateCandidates)
          .where(eq(teamStateCandidates.candidateId, teamState.candidateId))
          .for("update")
          .limit(1);

        if (candidateToConsume === undefined) {
          const [existing] = await transaction
            .select({ teamState: teamStates.teamState })
            .from(teamStates)
            .where(eq(teamStates.candidateId, teamState.candidateId))
            .limit(1);
          return existing !== undefined &&
            fingerprint(existing.teamState) === fingerprint(teamState)
            ? "confirmed"
            : "candidate_not_available";
        }
        if (
          fingerprint(candidateToConsume.candidate) !==
          fingerprint(expectedCandidate)
        ) {
          return "candidate_not_available";
        }

        await transaction
          .delete(teamStateCandidates)
          .where(eq(teamStateCandidates.candidateId, teamState.candidateId));

        const inserted = await transaction
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
        if (inserted.length !== 0) return "confirmed";

        const [existing] = await transaction
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
        return "confirmed";
      });
    },
  };
  return Object.freeze({
    candidates: Object.freeze(candidates),
    teamStates: Object.freeze(confirmed),
    confirmations: Object.freeze(confirmations),
  });
}
