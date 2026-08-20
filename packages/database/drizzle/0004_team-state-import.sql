CREATE TABLE "fpl_intelligence"."team_state_candidates" (
  "candidate_id" text PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "retain_until" timestamp with time zone NOT NULL,
  "candidate" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "team_state_candidates_retention_idx" ON "fpl_intelligence"."team_state_candidates" USING btree ("retain_until");
--> statement-breakpoint
CREATE TABLE "fpl_intelligence"."team_states" (
  "team_state_id" text PRIMARY KEY NOT NULL,
  "candidate_id" text NOT NULL,
  "gameweek_season_id" text NOT NULL,
  "gameweek_number" integer NOT NULL,
  "confirmed_at" timestamp with time zone NOT NULL,
  "team_state" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "team_states_latest_idx" ON "fpl_intelligence"."team_states" USING btree ("confirmed_at", "team_state_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "team_states_candidate_unique_idx" ON "fpl_intelligence"."team_states" USING btree ("candidate_id");
