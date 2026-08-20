import { and, desc, eq, isNotNull, lt, lte, or, type SQL } from "drizzle-orm";
import {
  createClaimId,
  createEvidenceId,
  createNewsSignalId,
  createPlayerAvailabilityStateId,
  createRecommendation,
  createRecommendationId,
  createSeasonId,
  createTeamStateId,
  createUtcInstant,
  createVersion,
  type Recommendation,
  type RecommendationId,
  type RecommendationOptionInput,
  type UtcInstant,
} from "@fpl-intelligence/domain";
import type { DatabaseClient } from "./client";
import {
  classifyRecommendationSnapshot,
  createRecommendationSnapshot,
  recommendationComparisonKey,
  type PersistRecommendationSnapshotInput,
  type RecommendationComparisonKey,
  type RecommendationHistoryEntry,
  type RecommendationSnapshot,
  type RecommendationSnapshotContext,
} from "./recommendation-history";
import { recommendationSnapshots } from "./schema";

type Database = DatabaseClient["db"];
type SnapshotRow = typeof recommendationSnapshots.$inferSelect;

export class RecommendationSnapshotConflictError extends Error {
  readonly code = "recommendation_snapshot_conflict" as const;

  constructor(readonly recommendationId: RecommendationId) {
    super(
      `Recommendation snapshot ${recommendationId} already has different content.`,
    );
    this.name = "RecommendationSnapshotConflictError";
  }
}

function rehydrateRecommendation(value: Recommendation): Recommendation {
  const option = ({
    rank: _rank,
    ...rest
  }: Recommendation["primary"]): RecommendationOptionInput => {
    void _rank;
    return rest;
  };
  const base = {
    recommendationId: createRecommendationId(value.recommendationId),
    contractVersion: createVersion(value.contractVersion),
    kind: value.kind,
    teamStateId: createTeamStateId(value.teamStateId),
    rulesIdentity: Object.freeze({
      rulesetId: value.rulesIdentity.rulesetId,
      version: createVersion(value.rulesIdentity.version),
      seasonId: createSeasonId(value.rulesIdentity.seasonId),
    }),
    generatedAt: createUtcInstant(value.generatedAt),
    algorithm: Object.freeze({
      name: value.algorithm.name,
      version: createVersion(value.algorithm.version),
    }),
    evidence: value.evidence,
    confidence: Object.freeze({
      methodologyVersion: createVersion(value.confidence.methodologyVersion),
      evaluatedAt: createUtcInstant(value.confidence.evaluatedAt),
      factors: value.confidence.factors,
    }),
    options: Object.freeze([
      option(value.primary),
      ...value.alternatives.map(option),
    ]),
  };
  return createRecommendation(
    value.supersedesRecommendationId === undefined
      ? base
      : {
          ...base,
          supersedesRecommendationId: createRecommendationId(
            value.supersedesRecommendationId,
          ),
        },
  );
}

function rehydrateContext(
  value: RecommendationSnapshotContext,
): RecommendationSnapshotContext {
  return Object.freeze({
    teamStateVersion: createVersion(value.teamStateVersion),
    projection: Object.freeze({
      baselineVersion: createVersion(value.projection.baselineVersion),
      currentVersion: createVersion(value.projection.currentVersion),
      inputVersion: createVersion(value.projection.inputVersion),
    }),
    news: Object.freeze({
      signalRefs: Object.freeze(value.news.signalRefs.map(createNewsSignalId)),
      availabilityStateRefs: Object.freeze(
        value.news.availabilityStateRefs.map(createPlayerAvailabilityStateId),
      ),
      claimRefs: Object.freeze(value.news.claimRefs.map(createClaimId)),
      evidenceRefs: Object.freeze(
        value.news.evidenceRefs.map(createEvidenceId),
      ),
    }),
    retention: Object.freeze({
      policyVersion: createVersion(value.retention.policyVersion),
      retainUntil:
        value.retention.retainUntil === null
          ? null
          : createUtcInstant(value.retention.retainUntil),
    }),
  });
}

function fromRow(row: SnapshotRow): RecommendationSnapshot {
  return Object.freeze({
    recommendation: rehydrateRecommendation(row.recommendation),
    context: rehydrateContext(row.context),
    recordedAt: createUtcInstant(row.recordedAt.toISOString()),
    materialFingerprint: row.materialFingerprint,
    payloadFingerprint: row.payloadFingerprint,
  });
}

function comparableWhere(key: RecommendationComparisonKey): SQL {
  return and(
    eq(recommendationSnapshots.teamStateId, key.teamStateId),
    eq(recommendationSnapshots.recommendationKind, key.kind),
    eq(recommendationSnapshots.contractVersion, key.contractVersion),
    eq(recommendationSnapshots.horizonFromSeasonId, key.horizon.from.seasonId),
    eq(recommendationSnapshots.horizonFromGameweek, key.horizon.from.number),
    eq(recommendationSnapshots.horizonToSeasonId, key.horizon.to.seasonId),
    eq(recommendationSnapshots.horizonToGameweek, key.horizon.to.number),
  )!;
}

function rowValues(snapshot: RecommendationSnapshot) {
  const recommendation = snapshot.recommendation;
  const horizon = recommendation.primary.horizon;
  return {
    recommendationId: recommendation.recommendationId,
    contractVersion: recommendation.contractVersion,
    recommendationKind: recommendation.kind,
    generatedAt: new Date(recommendation.generatedAt),
    recordedAt: new Date(snapshot.recordedAt),
    teamStateId: recommendation.teamStateId,
    teamStateVersion: snapshot.context.teamStateVersion,
    rulesetId: recommendation.rulesIdentity.rulesetId,
    rulesVersion: recommendation.rulesIdentity.version,
    algorithmName: recommendation.algorithm.name,
    algorithmVersion: recommendation.algorithm.version,
    confidenceMethodologyVersion: recommendation.confidence.methodologyVersion,
    horizonFromSeasonId: horizon.from.seasonId,
    horizonFromGameweek: horizon.from.number,
    horizonToSeasonId: horizon.to.seasonId,
    horizonToGameweek: horizon.to.number,
    baselineProjectionVersion: snapshot.context.projection.baselineVersion,
    currentProjectionVersion: snapshot.context.projection.currentVersion,
    projectionInputVersion: snapshot.context.projection.inputVersion,
    materialFingerprint: snapshot.materialFingerprint,
    payloadFingerprint: snapshot.payloadFingerprint,
    recommendation,
    context: snapshot.context,
    retainUntil:
      snapshot.context.retention.retainUntil === null
        ? null
        : new Date(snapshot.context.retention.retainUntil),
  };
}

export interface RecommendationHistoryRepository {
  append(
    input: PersistRecommendationSnapshotInput,
  ): Promise<RecommendationHistoryEntry>;
  getById(id: RecommendationId): Promise<RecommendationHistoryEntry | null>;
  getLatestAndPrior(
    key: RecommendationComparisonKey,
  ): Promise<readonly RecommendationHistoryEntry[]>;
  listHistory(
    key: RecommendationComparisonKey,
    options?: { readonly limit?: number; readonly before?: UtcInstant },
  ): Promise<readonly RecommendationHistoryEntry[]>;
  deleteExpired(asOf: UtcInstant): Promise<readonly RecommendationId[]>;
}

export function createRecommendationHistoryRepository(
  db: Database,
): RecommendationHistoryRepository {
  async function rowsFor(
    key: RecommendationComparisonKey,
    options: { readonly limit: number; readonly before?: UtcInstant },
  ): Promise<readonly SnapshotRow[]> {
    const filters: SQL[] = [comparableWhere(key)];
    if (options.before !== undefined) {
      filters.push(
        lt(
          recommendationSnapshots.generatedAt,
          new Date(createUtcInstant(options.before)),
        ),
      );
    }
    return db
      .select()
      .from(recommendationSnapshots)
      .where(and(...filters))
      .orderBy(
        desc(recommendationSnapshots.generatedAt),
        desc(recommendationSnapshots.recommendationId),
      )
      .limit(options.limit);
  }

  async function priorRowFor(row: SnapshotRow): Promise<SnapshotRow | null> {
    const [prior] = await db
      .select()
      .from(recommendationSnapshots)
      .where(
        and(
          comparableWhere(
            recommendationComparisonKey(fromRow(row).recommendation),
          ),
          or(
            lt(recommendationSnapshots.generatedAt, row.generatedAt),
            and(
              eq(recommendationSnapshots.generatedAt, row.generatedAt),
              lt(
                recommendationSnapshots.recommendationId,
                row.recommendationId,
              ),
            ),
          ),
        ),
      )
      .orderBy(
        desc(recommendationSnapshots.generatedAt),
        desc(recommendationSnapshots.recommendationId),
      )
      .limit(1);
    return prior ?? null;
  }

  async function decorate(
    rows: readonly SnapshotRow[],
  ): Promise<readonly RecommendationHistoryEntry[]> {
    const entries: RecommendationHistoryEntry[] = [];
    for (const [index, row] of rows.entries()) {
      const current = fromRow(row);
      let prior =
        rows[index + 1] === undefined ? null : fromRow(rows[index + 1]!);
      if (prior === null) {
        const priorRow = await priorRowFor(row);
        prior = priorRow === null ? null : fromRow(priorRow);
      }
      entries.push(
        Object.freeze({
          ...current,
          ...classifyRecommendationSnapshot(current, prior),
        }),
      );
    }
    return Object.freeze(entries);
  }

  const repository: RecommendationHistoryRepository = {
    async append(input) {
      const snapshot = createRecommendationSnapshot(input);
      const inserted = await db
        .insert(recommendationSnapshots)
        .values(rowValues(snapshot))
        .onConflictDoNothing({
          target: recommendationSnapshots.recommendationId,
        })
        .returning();

      if (inserted.length === 0) {
        const [existing] = await db
          .select()
          .from(recommendationSnapshots)
          .where(
            eq(
              recommendationSnapshots.recommendationId,
              snapshot.recommendation.recommendationId,
            ),
          )
          .limit(1);
        if (
          existing === undefined ||
          existing.payloadFingerprint !== snapshot.payloadFingerprint
        ) {
          throw new RecommendationSnapshotConflictError(
            snapshot.recommendation.recommendationId,
          );
        }
      }

      const entry = await this.getById(
        snapshot.recommendation.recommendationId,
      );
      if (entry === null) {
        throw new Error("Persisted recommendation snapshot was not found.");
      }
      return entry;
    },

    async getById(id) {
      const [row] = await db
        .select()
        .from(recommendationSnapshots)
        .where(eq(recommendationSnapshots.recommendationId, id))
        .limit(1);
      if (row === undefined) return null;
      const [entry] = await decorate([row]);
      return entry ?? null;
    },

    async getLatestAndPrior(key) {
      return decorate(await rowsFor(key, { limit: 2 }));
    },

    async listHistory(key, options = {}) {
      const limit = options.limit ?? 50;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        throw new RangeError("History limit must be an integer from 1 to 100.");
      }
      const rows = await rowsFor(key, {
        limit: limit + 1,
        ...(options.before === undefined ? {} : { before: options.before }),
      });
      return (await decorate(rows)).slice(0, limit);
    },

    async deleteExpired(asOf) {
      const deleted = await db
        .delete(recommendationSnapshots)
        .where(
          and(
            isNotNull(recommendationSnapshots.retainUntil),
            lte(
              recommendationSnapshots.retainUntil,
              new Date(createUtcInstant(asOf)),
            ),
          ),
        )
        .returning({
          recommendationId: recommendationSnapshots.recommendationId,
        });
      return Object.freeze(
        deleted.map((row) => createRecommendationId(row.recommendationId)),
      );
    },
  };
  return Object.freeze(repository);
}
