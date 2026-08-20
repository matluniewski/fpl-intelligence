import type {
  Recommendation,
  TeamState,
  TeamStateCandidate,
} from "@fpl-intelligence/domain";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { RecommendationSnapshotContext } from "./recommendation-history";

/**
 * Reserved namespace for future application-owned persistence models.
 * FPL-15 deliberately introduces no product, provider, identity, or billing tables.
 */
export const applicationSchema = pgSchema("fpl_intelligence");

export const recommendationSnapshots = applicationSchema.table(
  "recommendation_snapshots",
  {
    recommendationId: text("recommendation_id").primaryKey(),
    contractVersion: text("contract_version").notNull(),
    recommendationKind: text("recommendation_kind").notNull(),
    generatedAt: timestamp("generated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    recordedAt: timestamp("recorded_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    teamStateId: text("team_state_id").notNull(),
    teamStateVersion: text("team_state_version").notNull(),
    rulesetId: text("ruleset_id").notNull(),
    rulesVersion: text("rules_version").notNull(),
    algorithmName: text("algorithm_name").notNull(),
    algorithmVersion: text("algorithm_version").notNull(),
    confidenceMethodologyVersion: text(
      "confidence_methodology_version",
    ).notNull(),
    horizonFromSeasonId: text("horizon_from_season_id").notNull(),
    horizonFromGameweek: integer("horizon_from_gameweek").notNull(),
    horizonToSeasonId: text("horizon_to_season_id").notNull(),
    horizonToGameweek: integer("horizon_to_gameweek").notNull(),
    baselineProjectionVersion: text("baseline_projection_version").notNull(),
    currentProjectionVersion: text("current_projection_version").notNull(),
    projectionInputVersion: text("projection_input_version").notNull(),
    materialFingerprint: text("material_fingerprint").notNull(),
    payloadFingerprint: text("payload_fingerprint").notNull(),
    recommendation: jsonb("recommendation").$type<Recommendation>().notNull(),
    context: jsonb("context").$type<RecommendationSnapshotContext>().notNull(),
    retainUntil: timestamp("retain_until", {
      mode: "date",
      withTimezone: true,
    }),
  },
  (table) => [
    index("recommendation_snapshots_comparable_idx").on(
      table.teamStateId,
      table.recommendationKind,
      table.contractVersion,
      table.horizonFromSeasonId,
      table.horizonFromGameweek,
      table.horizonToSeasonId,
      table.horizonToGameweek,
      table.generatedAt,
    ),
    index("recommendation_snapshots_retention_idx").on(table.retainUntil),
  ],
);

/**
 * Only normalized contracts are persisted here. Screenshot bytes, crops, OCR,
 * and provider DTOs remain exclusively in an ephemeral adapter store.
 */
export const teamStateCandidates = applicationSchema.table(
  "team_state_candidates",
  {
    candidateId: text("candidate_id").primaryKey(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    retainUntil: timestamp("retain_until", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    candidate: jsonb("candidate").$type<TeamStateCandidate>().notNull(),
  },
  (table) => [
    index("team_state_candidates_retention_idx").on(table.retainUntil),
  ],
);

export const teamStates = applicationSchema.table(
  "team_states",
  {
    teamStateId: text("team_state_id").primaryKey(),
    candidateId: text("candidate_id").notNull(),
    gameweekSeasonId: text("gameweek_season_id").notNull(),
    gameweekNumber: integer("gameweek_number").notNull(),
    confirmedAt: timestamp("confirmed_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    teamState: jsonb("team_state").$type<TeamState>().notNull(),
  },
  (table) => [
    uniqueIndex("team_states_candidate_unique_idx").on(table.candidateId),
    index("team_states_latest_idx").on(table.confirmedAt, table.teamStateId),
  ],
);

/**
 * Provider-independent, content-minimized news artifacts. The JSON values are
 * validated domain contracts; provider DTOs and raw content stay in adapters.
 */
export const rawNewsItems = applicationSchema.table(
  "raw_news_items",
  {
    rawNewsItemId: text("raw_news_item_id").primaryKey(),
    ingestionKey: text("ingestion_key").notNull().unique(),
    sourceId: text("source_id").notNull(),
    providerId: text("provider_id").notNull(),
    fetchedAt: timestamp("fetched_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    policyState: text("policy_state").notNull(),
    lifecycleState: text("lifecycle_state").notNull(),
    lifecycleEvaluatedAt: timestamp("lifecycle_evaluated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    retainUntil: timestamp("retain_until", {
      mode: "date",
      withTimezone: true,
    }),
    payloadFingerprint: text("payload_fingerprint").notNull(),
    item: jsonb("item").notNull(),
  },
  (table) => [
    index("raw_news_items_lifecycle_idx").on(
      table.lifecycleState,
      table.retainUntil,
    ),
  ],
);

function newsArtifactTable(name: string, idColumn: string) {
  return applicationSchema.table(
    name,
    {
      id: text(idColumn).primaryKey(),
      playerId: text("player_id"),
      effectiveFrom: timestamp("effective_from", {
        mode: "date",
        withTimezone: true,
      }),
      effectiveUntil: timestamp("effective_until", {
        mode: "date",
        withTimezone: true,
      }),
      evaluatedAt: timestamp("evaluated_at", {
        mode: "date",
        withTimezone: true,
      }).notNull(),
      expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
      supersededById: text("superseded_by_id"),
      lifecycleState: text("lifecycle_state").notNull(),
      retainUntil: timestamp("retain_until", {
        mode: "date",
        withTimezone: true,
      }),
      payloadFingerprint: text("payload_fingerprint").notNull(),
      artifact: jsonb("artifact").notNull(),
      isCurrentCandidate: boolean("is_current_candidate")
        .notNull()
        .default(true),
    },
    (table) => [
      index(`${name}_current_at_idx`).on(
        table.playerId,
        table.lifecycleState,
        table.effectiveFrom,
        table.effectiveUntil,
        table.expiresAt,
        table.evaluatedAt,
      ),
      index(`${name}_retention_idx`).on(table.retainUntil),
    ],
  );
}

export const claims = newsArtifactTable("claims", "claim_id");
export const evidence = newsArtifactTable("evidence", "evidence_id");
export const newsSignals = newsArtifactTable("news_signals", "news_signal_id");
export const playerAvailabilityStates = newsArtifactTable(
  "player_availability_states",
  "availability_state_id",
);
