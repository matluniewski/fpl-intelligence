import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  confirmTeamState,
  createTeamStateId,
  createUtcInstant,
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
  TeamStateConflictError,
} from "./team-state-repository";

describe("TeamState persistence", () => {
  const candidate = createSyntheticCandidate();
  const teamStateId = createTeamStateId("synthetic-persisted-team-state");
  let client: DatabaseClient;

  beforeAll(async () => {
    client = createDatabaseClient(readDatabaseConfig());
    await client.db
      .delete(teamStateCandidates)
      .where(eq(teamStateCandidates.candidateId, candidate.id));
    await client.db
      .delete(teamStates)
      .where(eq(teamStates.teamStateId, teamStateId));
  });

  afterAll(async () => {
    await client.db
      .delete(teamStateCandidates)
      .where(eq(teamStateCandidates.candidateId, candidate.id));
    await client.db
      .delete(teamStates)
      .where(eq(teamStates.teamStateId, teamStateId));
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
});
