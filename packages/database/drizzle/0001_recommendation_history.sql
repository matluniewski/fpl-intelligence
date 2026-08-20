CREATE TABLE "fpl_intelligence"."recommendation_snapshots" (
	"recommendation_id" text PRIMARY KEY NOT NULL,
	"contract_version" text NOT NULL,
	"recommendation_kind" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"team_state_id" text NOT NULL,
	"team_state_version" text NOT NULL,
	"ruleset_id" text NOT NULL,
	"rules_version" text NOT NULL,
	"algorithm_name" text NOT NULL,
	"algorithm_version" text NOT NULL,
	"confidence_methodology_version" text NOT NULL,
	"horizon_from_season_id" text NOT NULL,
	"horizon_from_gameweek" integer NOT NULL,
	"horizon_to_season_id" text NOT NULL,
	"horizon_to_gameweek" integer NOT NULL,
	"baseline_projection_version" text NOT NULL,
	"current_projection_version" text NOT NULL,
	"projection_input_version" text NOT NULL,
	"material_fingerprint" text NOT NULL,
	"payload_fingerprint" text NOT NULL,
	"recommendation" jsonb NOT NULL,
	"context" jsonb NOT NULL,
	"retain_until" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "recommendation_snapshots_comparable_idx" ON "fpl_intelligence"."recommendation_snapshots" USING btree ("team_state_id","recommendation_kind","contract_version","horizon_from_season_id","horizon_from_gameweek","horizon_to_season_id","horizon_to_gameweek","generated_at");--> statement-breakpoint
CREATE INDEX "recommendation_snapshots_retention_idx" ON "fpl_intelligence"."recommendation_snapshots" USING btree ("retain_until");