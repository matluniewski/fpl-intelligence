import { createHash } from "node:crypto";
import { and, desc, eq, gte, isNotNull, isNull, lte, or } from "drizzle-orm";
import {
  createPlayerAvailabilityState,
  createPlayerAvailabilityStateId,
  createUtcInstant,
  type Claim,
  type Evidence,
  type NewsSignal,
  type PlayerAvailabilityState,
  type RawNewsItem,
  type UtcInstant,
} from "@fpl-intelligence/domain";
import type { DatabaseClient } from "./client";
import {
  claims,
  evidence,
  newsSignals,
  playerAvailabilityStates,
  rawNewsItems,
} from "./schema";

type Database = DatabaseClient["db"];
export type NewsLifecycleState =
  | "active"
  | "corrected"
  | "withdrawn"
  | "deleted"
  | "expired"
  | "policy_disabled";

export interface NewsPersistenceMetadata {
  readonly lifecycleState: NewsLifecycleState;
  readonly retainUntil: UtcInstant | null;
  readonly expiresAt?: UtcInstant;
  readonly supersededById?: string;
}

export class NewsArtifactConflictError extends Error {
  readonly code = "news_artifact_conflict" as const;
  constructor(readonly artifactId: string) {
    super(`News artifact ${artifactId} already has different content.`);
    this.name = "NewsArtifactConflictError";
  }
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function date(value: UtcInstant | undefined | null): Date | null {
  return value === undefined || value === null
    ? null
    : new Date(createUtcInstant(value));
}

async function insertIdempotently(
  table:
    | typeof claims
    | typeof evidence
    | typeof newsSignals
    | typeof playerAvailabilityStates,
  values: {
    readonly id: string;
    readonly playerId: string | null;
    readonly effectiveFrom: Date | null;
    readonly effectiveUntil: Date | null;
    readonly evaluatedAt: Date;
    readonly expiresAt: Date | null;
    readonly supersededById: string | null;
    readonly lifecycleState: NewsLifecycleState;
    readonly retainUntil: Date | null;
    readonly payloadFingerprint: string;
    readonly artifact: unknown;
    readonly isCurrentCandidate: boolean;
  },
  db: Database,
): Promise<void> {
  const inserted = await db
    .insert(table)
    .values(values)
    .onConflictDoNothing()
    .returning();
  if (inserted.length !== 0) return;
  const [existing] = await db
    .select()
    .from(table)
    .where(eq(table.id, values.id))
    .limit(1);
  if (
    existing === undefined ||
    existing.payloadFingerprint !== values.payloadFingerprint
  ) {
    throw new NewsArtifactConflictError(values.id);
  }
}

function derivedValues(
  id: string,
  artifact: Claim | Evidence | NewsSignal | PlayerAvailabilityState,
  metadata: NewsPersistenceMetadata,
) {
  const signal = "newsSignalId" in artifact ? artifact : undefined;
  const availability = "availabilityStateId" in artifact ? artifact : undefined;
  return {
    id,
    playerId: signal?.playerId ?? availability?.playerId ?? null,
    effectiveFrom: date(signal?.effectiveFrom ?? availability?.effectiveFrom),
    effectiveUntil: date(
      signal?.effectiveUntil ?? availability?.effectiveUntil,
    ),
    evaluatedAt: new Date(
      "extractedAt" in artifact
        ? artifact.extractedAt
        : "observedAt" in artifact
          ? artifact.observedAt
          : artifact.evaluatedAt,
    ),
    expiresAt: date(metadata.expiresAt),
    supersededById: metadata.supersededById ?? null,
    lifecycleState: metadata.lifecycleState,
    retainUntil: date(metadata.retainUntil),
    payloadFingerprint: fingerprint({ artifact, metadata }),
    artifact,
    isCurrentCandidate:
      metadata.lifecycleState === "active" &&
      metadata.supersededById === undefined,
  } as const;
}

export interface NewsStateRepository {
  appendRawNewsItem(
    item: RawNewsItem,
    metadata: NewsPersistenceMetadata,
  ): Promise<void>;
  appendClaim(claim: Claim, metadata: NewsPersistenceMetadata): Promise<void>;
  appendEvidence(
    evidenceValue: Evidence,
    metadata: NewsPersistenceMetadata,
  ): Promise<void>;
  appendNewsSignal(
    signal: NewsSignal,
    metadata: NewsPersistenceMetadata,
  ): Promise<void>;
  appendAvailabilityState(
    state: PlayerAvailabilityState,
    metadata: NewsPersistenceMetadata,
  ): Promise<void>;
  listCurrentAvailability(
    playerId: string,
    asOf: UtcInstant,
  ): Promise<readonly PlayerAvailabilityState[]>;
  listAvailabilityHistory(
    playerId: string,
  ): Promise<readonly PlayerAvailabilityState[]>;
  deleteExpired(asOf: UtcInstant): Promise<readonly string[]>;
}

export function createNewsStateRepository(db: Database): NewsStateRepository {
  return Object.freeze({
    async appendRawNewsItem(
      item: RawNewsItem,
      metadata: NewsPersistenceMetadata,
    ) {
      const values = {
        rawNewsItemId: item.rawNewsItemId,
        ingestionKey: item.ingestionKey,
        sourceId: item.sourceId,
        providerId: item.providerId,
        fetchedAt: new Date(item.fetchedAt),
        policyState: item.policyState,
        lifecycleState: metadata.lifecycleState,
        lifecycleEvaluatedAt: new Date(item.fetchedAt),
        retainUntil: date(metadata.retainUntil),
        payloadFingerprint: fingerprint({ item, metadata }),
        item,
      };
      const inserted = await db
        .insert(rawNewsItems)
        .values(values)
        .onConflictDoNothing()
        .returning();
      if (inserted.length !== 0) return;
      const [existing] = await db
        .select()
        .from(rawNewsItems)
        .where(eq(rawNewsItems.rawNewsItemId, item.rawNewsItemId))
        .limit(1);
      if (
        existing === undefined ||
        existing.payloadFingerprint !== values.payloadFingerprint
      )
        throw new NewsArtifactConflictError(item.rawNewsItemId);
    },
    appendClaim: (artifact: Claim, metadata: NewsPersistenceMetadata) =>
      insertIdempotently(
        claims,
        derivedValues(artifact.claimId, artifact, metadata),
        db,
      ),
    appendEvidence: (artifact: Evidence, metadata: NewsPersistenceMetadata) =>
      insertIdempotently(
        evidence,
        derivedValues(artifact.evidenceId, artifact, metadata),
        db,
      ),
    appendNewsSignal: (
      artifact: NewsSignal,
      metadata: NewsPersistenceMetadata,
    ) =>
      insertIdempotently(
        newsSignals,
        derivedValues(artifact.newsSignalId, artifact, metadata),
        db,
      ),
    appendAvailabilityState: (
      artifact: PlayerAvailabilityState,
      metadata: NewsPersistenceMetadata,
    ) =>
      insertIdempotently(
        playerAvailabilityStates,
        derivedValues(artifact.availabilityStateId, artifact, metadata),
        db,
      ),
    async listCurrentAvailability(playerId: string, asOf: UtcInstant) {
      const rows = await db
        .select()
        .from(playerAvailabilityStates)
        .where(
          and(
            eq(playerAvailabilityStates.playerId, playerId),
            eq(playerAvailabilityStates.lifecycleState, "active"),
            eq(playerAvailabilityStates.isCurrentCandidate, true),
            isNull(playerAvailabilityStates.supersededById),
            or(
              isNull(playerAvailabilityStates.effectiveFrom),
              lte(playerAvailabilityStates.effectiveFrom, new Date(asOf)),
            ),
            or(
              isNull(playerAvailabilityStates.effectiveUntil),
              gte(playerAvailabilityStates.effectiveUntil, new Date(asOf)),
            ),
            or(
              isNull(playerAvailabilityStates.expiresAt),
              gte(playerAvailabilityStates.expiresAt, new Date(asOf)),
            ),
          ),
        )
        .orderBy(
          desc(playerAvailabilityStates.evaluatedAt),
          desc(playerAvailabilityStates.id),
        );
      return Object.freeze(
        rows.map((row) =>
          createPlayerAvailabilityState({
            ...(row.artifact as PlayerAvailabilityState),
            availabilityStateId: createPlayerAvailabilityStateId(row.id),
          }),
        ),
      );
    },
    async listAvailabilityHistory(playerId: string) {
      const rows = await db
        .select()
        .from(playerAvailabilityStates)
        .where(eq(playerAvailabilityStates.playerId, playerId))
        .orderBy(
          desc(playerAvailabilityStates.evaluatedAt),
          desc(playerAvailabilityStates.id),
        );
      return Object.freeze(
        rows.map((row) =>
          createPlayerAvailabilityState({
            ...(row.artifact as PlayerAvailabilityState),
            availabilityStateId: createPlayerAvailabilityStateId(row.id),
          }),
        ),
      );
    },
    async deleteExpired(asOf: UtcInstant) {
      const deadline = new Date(createUtcInstant(asOf));
      const tables = [
        claims,
        evidence,
        newsSignals,
        playerAvailabilityStates,
      ] as const;
      const deletedIds: string[] = [];
      for (const table of tables) {
        const deleted = await db
          .delete(table)
          .where(
            and(isNotNull(table.retainUntil), lte(table.retainUntil, deadline)),
          )
          .returning({ id: table.id });
        deletedIds.push(...deleted.map((row) => row.id));
      }
      const deletedRaw = await db
        .delete(rawNewsItems)
        .where(
          and(
            isNotNull(rawNewsItems.retainUntil),
            lte(rawNewsItems.retainUntil, deadline),
          ),
        )
        .returning({ id: rawNewsItems.rawNewsItemId });
      deletedIds.push(...deletedRaw.map((row) => row.id));
      return Object.freeze(deletedIds.sort());
    },
  });
}
