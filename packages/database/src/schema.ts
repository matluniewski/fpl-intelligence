import type { Recommendation } from "@fpl-intelligence/domain";
import {
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
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
