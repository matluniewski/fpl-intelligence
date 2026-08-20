CREATE TABLE "fpl_intelligence"."claims" (
	"claim_id" text PRIMARY KEY NOT NULL,
	"player_id" text,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"evaluated_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"superseded_by_id" text,
	"lifecycle_state" text NOT NULL,
	"retain_until" timestamp with time zone,
	"payload_fingerprint" text NOT NULL,
	"artifact" jsonb NOT NULL,
	"is_current_candidate" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fpl_intelligence"."evidence" (
	"evidence_id" text PRIMARY KEY NOT NULL,
	"player_id" text,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"evaluated_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"superseded_by_id" text,
	"lifecycle_state" text NOT NULL,
	"retain_until" timestamp with time zone,
	"payload_fingerprint" text NOT NULL,
	"artifact" jsonb NOT NULL,
	"is_current_candidate" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fpl_intelligence"."news_signals" (
	"news_signal_id" text PRIMARY KEY NOT NULL,
	"player_id" text,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"evaluated_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"superseded_by_id" text,
	"lifecycle_state" text NOT NULL,
	"retain_until" timestamp with time zone,
	"payload_fingerprint" text NOT NULL,
	"artifact" jsonb NOT NULL,
	"is_current_candidate" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fpl_intelligence"."player_availability_states" (
	"availability_state_id" text PRIMARY KEY NOT NULL,
	"player_id" text,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"evaluated_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"superseded_by_id" text,
	"lifecycle_state" text NOT NULL,
	"retain_until" timestamp with time zone,
	"payload_fingerprint" text NOT NULL,
	"artifact" jsonb NOT NULL,
	"is_current_candidate" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fpl_intelligence"."raw_news_items" (
	"raw_news_item_id" text PRIMARY KEY NOT NULL,
	"ingestion_key" text NOT NULL,
	"source_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"policy_state" text NOT NULL,
	"lifecycle_state" text NOT NULL,
	"lifecycle_evaluated_at" timestamp with time zone NOT NULL,
	"retain_until" timestamp with time zone,
	"payload_fingerprint" text NOT NULL,
	"item" jsonb NOT NULL,
	CONSTRAINT "raw_news_items_ingestion_key_unique" UNIQUE("ingestion_key")
);
--> statement-breakpoint
CREATE INDEX "raw_news_items_lifecycle_idx" ON "fpl_intelligence"."raw_news_items" USING btree ("lifecycle_state","retain_until");