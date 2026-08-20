import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  confirmTeamState,
  createTeamStateCandidateId,
  createTeamStateId,
  createUtcInstant,
  resolvedField,
} from "@fpl-intelligence/domain";
import {
  createSyntheticCandidate,
  createSyntheticValidationContext,
} from "@fpl-intelligence/domain/testing";
import { createDatabaseClient, type DatabaseClient } from "./client";
import { readDatabaseConfig } from "./config";
import { teamStateCandidates, teamStates } from "./schema";
import {
  createTeamStatePersistenceRepository,
  TeamStateCandidateConflictError,
  TeamStateConflictError,
} from "./team-state-repository";

describe("TeamState persistence", () => {
  const candidate = createSyntheticCandidate();
  const concurrentCandidate = {
    ...createSyntheticCandidate(),
    id: createTeamStateCandidateId("synthetic-concurrent-candidate"),
  };
  const collisionCandidate = {
    ...createSyntheticCandidate(),
    id: createTeamStateCandidateId("synthetic-collision-candidate"),
  };
  const racingCandidate = {
    ...createSyntheticCandidate(),
    id: createTeamStateCandidateId("synthetic-racing-candidate"),
  };
  const teamStateId = createTeamStateId("synthetic-persisted-team-state");
  let client: DatabaseClient;

  beforeAll(async () => {
    client = createDatabaseClient(readDatabaseConfig());
    await client.db
      .delete(teamStates)
      .where(eq(teamStates.candidateId, candidate.id));
    await client.db
      .delete(teamStates)
      .where(eq(teamStates.candidateId, concurrentCandidate.id));
    await client.db
      .delete(teamStates)
      .where(eq(teamStates.candidateId, collisionCandidate.id));
    await client.db
      .delete(teamStates)
      .where(eq(teamStates.candidateId, racingCandidate.id));
    await client.db
      .delete(teamStateCandidates)
      .where(eq(teamStateCandidates.candidateId, candidate.id));
    await client.db
      .delete(teamStateCandidates)
      .where(eq(teamStateCandidates.candidateId, concurrentCandidate.id));
    await client.db
      .delete(teamStateCandidates)
      .where(eq(teamStateCandidates.candidateId, collisionCandidate.id));
    await client.db
      .delete(teamStateCandidates)
      .where(eq(teamStateCandidates.candidateId, racingCandidate.id));
  });

  afterAll(async () => {
    await client.db
      .delete(teamStates)
      .where(eq(teamStates.candidateId, candidate.id));
    await client.db
      .delete(teamStates)
      .where(eq(teamStates.candidateId, concurrentCandidate.id));
    await client.db
      .delete(teamStates)
      .where(eq(teamStates.candidateId, collisionCandidate.id));
    await client.db
      .delete(teamStates)
      .where(eq(teamStates.candidateId, racingCandidate.id));
    await client.db
      .delete(teamStateCandidates)
      .where(eq(teamStateCandidates.candidateId, candidate.id));
    await client.db
      .delete(teamStateCandidates)
      .where(eq(teamStateCandidates.candidateId, concurrentCandidate.id));
    await client.db
      .delete(teamStateCandidates)
      .where(eq(teamStateCandidates.candidateId, collisionCandidate.id));
    await client.db
      .delete(teamStateCandidates)
      .where(eq(teamStateCandidates.candidateId, racingCandidate.id));
    await client.close();
  });

  it("persists provisional candidates with bounded retention", async () => {
    const repository = createTeamStatePersistenceRepository(client.db);
    await repository.candidates.save(candidate);
    await expect(
      repository.candidates.getById(candidate.id),
    ).resolves.toMatchObject({
      id: candidate.id,
      kind: "candidate",
    });
    await expect(
      repository.candidates.save({
        ...candidate,
        freeTransfers:
          candidate.freeTransfers.status === "resolved"
            ? resolvedField(
                candidate.freeTransfers.value + 1,
                candidate.freeTransfers.origin,
              )
            : candidate.freeTransfers,
      }),
    ).rejects.toBeInstanceOf(TeamStateCandidateConflictError);

    const deleted = await repository.candidates.deleteExpiredCandidates(
      createUtcInstant("2026-08-19T12:00:01Z"),
    );
    expect(deleted).toContain(candidate.id);
    await expect(
      repository.candidates.getById(candidate.id),
    ).resolves.toBeNull();
  });

  it("persists a confirmed normalized TeamState as the latest durable state", async () => {
    const confirmation = confirmTeamState({
      teamStateId,
      candidate,
      context: createSyntheticValidationContext(),
      confirmedAt: createUtcInstant("2026-08-18T12:05:00Z"),
    });
    expect(confirmation.ok).toBe(true);
    if (!confirmation.ok) return;

    const repository = createTeamStatePersistenceRepository(client.db);
    await repository.teamStates.saveConfirmed(confirmation.teamState);
    await expect(
      repository.teamStates.saveConfirmed(confirmation.teamState),
    ).resolves.toBeUndefined();
    await expect(
      repository.teamStates.saveConfirmed({
        ...confirmation.teamState,
        freeTransfers: confirmation.teamState.freeTransfers + 1,
      }),
    ).rejects.toBeInstanceOf(TeamStateConflictError);
    await expect(
      repository.teamStates.getById(teamStateId),
    ).resolves.toMatchObject({
      id: teamStateId,
      candidateId: candidate.id,
      kind: "confirmed",
    });
    await expect(repository.teamStates.getLatest()).resolves.toMatchObject({
      id: teamStateId,
    });
  });

  it("atomically consumes a candidate during concurrent confirmation", async () => {
    const first = confirmTeamState({
      teamStateId: createTeamStateId("synthetic-concurrent-first"),
      candidate: concurrentCandidate,
      context: createSyntheticValidationContext(),
      confirmedAt: createUtcInstant("2026-08-18T12:06:00Z"),
    });
    const second = confirmTeamState({
      teamStateId: createTeamStateId("synthetic-concurrent-second"),
      candidate: concurrentCandidate,
      context: createSyntheticValidationContext(),
      confirmedAt: createUtcInstant("2026-08-18T12:06:01Z"),
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    const repository = createTeamStatePersistenceRepository(client.db);
    await repository.candidates.save(concurrentCandidate);
    const results = await Promise.all([
      repository.confirmations.saveConfirmedAndConsumeCandidate(
        first.teamState,
        concurrentCandidate,
      ),
      repository.confirmations.saveConfirmedAndConsumeCandidate(
        second.teamState,
        concurrentCandidate,
      ),
    ]);
    expect(results.sort()).toEqual(["candidate_not_available", "confirmed"]);
    await expect(
      repository.candidates.getById(concurrentCandidate.id),
    ).resolves.toBeNull();
    const persisted = await client.db
      .select({ teamStateId: teamStates.teamStateId })
      .from(teamStates)
      .where(eq(teamStates.candidateId, concurrentCandidate.id));
    expect(persisted).toHaveLength(1);
  });

  it("does not consume a corrected candidate when its timestamp collides", async () => {
    const staleConfirmation = confirmTeamState({
      teamStateId: createTeamStateId("synthetic-stale-confirmation"),
      candidate: collisionCandidate,
      context: createSyntheticValidationContext(),
      confirmedAt: createUtcInstant("2026-08-18T12:07:00Z"),
    });
    expect(staleConfirmation.ok).toBe(true);
    if (!staleConfirmation.ok) return;
    if (collisionCandidate.freeTransfers.status !== "resolved") return;

    const correctedCandidate = {
      ...collisionCandidate,
      freeTransfers: resolvedField(
        collisionCandidate.freeTransfers.value + 1,
        collisionCandidate.freeTransfers.origin,
      ),
      updatedAt: collisionCandidate.updatedAt,
    };
    const repository = createTeamStatePersistenceRepository(client.db);
    await repository.candidates.save(correctedCandidate);

    await expect(
      repository.confirmations.saveConfirmedAndConsumeCandidate(
        staleConfirmation.teamState,
        collisionCandidate,
      ),
    ).resolves.toBe("candidate_not_available");
    await expect(
      repository.candidates.getById(collisionCandidate.id),
    ).resolves.toMatchObject({
      freeTransfers: correctedCandidate.freeTransfers,
    });
  });

  it("serializes a racing correction and confirmation without resurrecting a candidate", async () => {
    const staleConfirmation = confirmTeamState({
      teamStateId: createTeamStateId("synthetic-racing-confirmation"),
      candidate: racingCandidate,
      context: createSyntheticValidationContext(),
      confirmedAt: createUtcInstant("2026-08-18T12:08:00Z"),
    });
    expect(staleConfirmation.ok).toBe(true);
    expect(racingCandidate.freeTransfers.status).toBe("resolved");
    if (
      !staleConfirmation.ok ||
      racingCandidate.freeTransfers.status !== "resolved"
    )
      return;
    const correctedCandidate = {
      ...racingCandidate,
      freeTransfers: resolvedField(
        racingCandidate.freeTransfers.value + 1,
        racingCandidate.freeTransfers.origin,
      ),
    };
    const repository = createTeamStatePersistenceRepository(client.db);
    await repository.candidates.save(racingCandidate);

    const [confirmationResult, correctionResult] = await Promise.all([
      repository.confirmations.saveConfirmedAndConsumeCandidate(
        staleConfirmation.teamState,
        racingCandidate,
      ),
      repository.candidates.replace(correctedCandidate, racingCandidate),
    ]);
    const persistedCandidate = await repository.candidates.getById(
      racingCandidate.id,
    );
    const persistedStates = await client.db
      .select({ teamStateId: teamStates.teamStateId })
      .from(teamStates)
      .where(eq(teamStates.candidateId, racingCandidate.id));

    if (confirmationResult === "confirmed") {
      expect(correctionResult).toBe(false);
      expect(persistedCandidate).toBeNull();
      expect(persistedStates).toHaveLength(1);
    } else {
      expect(correctionResult).toBe(true);
      expect(persistedCandidate).toMatchObject({
        freeTransfers: correctedCandidate.freeTransfers,
      });
      expect(persistedStates).toHaveLength(0);
    }
  });
});
