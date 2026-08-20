import {
  createClaim,
  createClaimId,
  createEvidence,
  createNewsSignal,
  createPlayerAvailabilityState,
  createPlayerAvailabilityStateId,
  createRawNewsItem,
  createUtcInstant,
} from "@fpl-intelligence/domain";
import {
  SYNTHETIC_AVAILABILITY_STATE,
  SYNTHETIC_CLAIM,
  SYNTHETIC_EVIDENCE,
  SYNTHETIC_RAW_NEWS_ITEM,
  SYNTHETIC_SIGNAL,
} from "@fpl-intelligence/domain/testing/news-intelligence";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabaseClient, type DatabaseClient } from "./client";
import { readDatabaseConfig } from "./config";
import {
  createNewsStateRepository,
  NewsArtifactConflictError,
  type NewsStateRepository,
} from "./news-state-repository";
import {
  claims,
  evidence,
  newsSignals,
  playerAvailabilityStates,
  rawNewsItems,
} from "./schema";

const active = Object.freeze({
  lifecycleState: "active" as const,
  retainUntil: null,
});

describe("news state repository", () => {
  let client: DatabaseClient;
  let repository: NewsStateRepository;

  beforeAll(() => {
    client = createDatabaseClient(readDatabaseConfig());
    repository = createNewsStateRepository(client.db);
  });

  beforeEach(async () => {
    await client.db.delete(playerAvailabilityStates);
    await client.db.delete(newsSignals);
    await client.db.delete(evidence);
    await client.db.delete(claims);
    await client.db.delete(rawNewsItems);
  });

  afterAll(async () => client.close());

  it("persists distinct, traceable artifacts idempotently", async () => {
    const raw = createRawNewsItem(SYNTHETIC_RAW_NEWS_ITEM);
    const claim = createClaim(SYNTHETIC_CLAIM, { rawNewsItem: raw });
    const evidenceValue = createEvidence(SYNTHETIC_EVIDENCE);
    const signal = createNewsSignal(SYNTHETIC_SIGNAL);
    const state = createPlayerAvailabilityState(SYNTHETIC_AVAILABILITY_STATE);

    await repository.appendRawNewsItem(raw, active);
    await repository.appendRawNewsItem(raw, active);
    await repository.appendClaim(claim, active);
    await repository.appendEvidence(evidenceValue, active);
    await repository.appendNewsSignal(signal, active);
    await repository.appendAvailabilityState(state, active);

    await expect(client.db.select().from(rawNewsItems)).resolves.toHaveLength(
      1,
    );
    await expect(client.db.select().from(claims)).resolves.toHaveLength(1);
    await expect(client.db.select().from(evidence)).resolves.toHaveLength(1);
    await expect(client.db.select().from(newsSignals)).resolves.toHaveLength(1);
    await expect(
      client.db.select().from(playerAvailabilityStates),
    ).resolves.toHaveLength(1);

    await expect(
      repository.listCurrentAvailability(
        state.playerId,
        createUtcInstant("2026-08-18T12:00:00Z"),
      ),
    ).resolves.toMatchObject([
      {
        availabilityStateId: state.availabilityStateId,
        signalRefs: [signal.newsSignalId],
      },
    ]);
  });

  it("preserves conflicts in history but excludes expired current state", async () => {
    const state = createPlayerAvailabilityState(SYNTHETIC_AVAILABILITY_STATE);
    const conflicting = createPlayerAvailabilityState({
      ...SYNTHETIC_AVAILABILITY_STATE,
      availabilityStateId: createPlayerAvailabilityStateId(
        "synthetic-availability-conflict",
      ),
      availability: "unavailable",
      evaluatedAt: createUtcInstant("2026-08-18T12:10:00Z"),
      effectiveFrom: createUtcInstant("2026-08-18T12:10:00Z"),
    });
    await repository.appendAvailabilityState(state, active);
    await repository.appendAvailabilityState(conflicting, {
      lifecycleState: "active",
      retainUntil: createUtcInstant("2026-08-19T00:00:00Z"),
      expiresAt: createUtcInstant("2026-08-18T12:30:00Z"),
    });

    await expect(
      repository.listAvailabilityHistory(state.playerId),
    ).resolves.toHaveLength(2);
    await expect(
      repository.listCurrentAvailability(
        state.playerId,
        createUtcInstant("2026-08-18T12:20:00Z"),
      ),
    ).resolves.toHaveLength(2);
    await expect(
      repository.listCurrentAvailability(
        state.playerId,
        createUtcInstant("2026-08-18T13:00:00Z"),
      ),
    ).resolves.toMatchObject([
      { availabilityStateId: state.availabilityStateId },
    ]);
  });

  it("keeps superseded state in history without treating it as current", async () => {
    const state = createPlayerAvailabilityState(SYNTHETIC_AVAILABILITY_STATE);
    await repository.appendAvailabilityState(state, {
      lifecycleState: "active",
      retainUntil: null,
      supersededById: "replacement-availability-state",
    });

    await expect(
      repository.listAvailabilityHistory(state.playerId),
    ).resolves.toMatchObject([
      { availabilityStateId: state.availabilityStateId },
    ]);
    await expect(
      repository.listCurrentAvailability(
        state.playerId,
        createUtcInstant("2026-08-18T12:00:00Z"),
      ),
    ).resolves.toEqual([]);
  });

  it("rejects conflicting identity reuse and deletes only records past retention", async () => {
    const raw = createRawNewsItem(SYNTHETIC_RAW_NEWS_ITEM);
    await repository.appendRawNewsItem(raw, {
      lifecycleState: "active",
      retainUntil: createUtcInstant("2026-08-18T13:00:00Z"),
    });
    await expect(
      repository.appendRawNewsItem(raw, active),
    ).rejects.toBeInstanceOf(NewsArtifactConflictError);

    const retainedClaim = createClaim(
      {
        ...SYNTHETIC_CLAIM,
        claimId: createClaimId("synthetic-retained-claim"),
      },
      { rawNewsItem: raw },
    );
    await repository.appendClaim(retainedClaim, active);
    await expect(
      repository.deleteExpired(createUtcInstant("2026-08-18T14:00:00Z")),
    ).resolves.toEqual([raw.rawNewsItemId]);
  });
});
