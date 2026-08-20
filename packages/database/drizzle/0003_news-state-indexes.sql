CREATE INDEX "claims_current_at_idx" ON "fpl_intelligence"."claims" USING btree ("player_id","lifecycle_state","effective_from","effective_until","expires_at","evaluated_at");--> statement-breakpoint
CREATE INDEX "claims_retention_idx" ON "fpl_intelligence"."claims" USING btree ("retain_until");--> statement-breakpoint
CREATE INDEX "evidence_current_at_idx" ON "fpl_intelligence"."evidence" USING btree ("player_id","lifecycle_state","effective_from","effective_until","expires_at","evaluated_at");--> statement-breakpoint
CREATE INDEX "evidence_retention_idx" ON "fpl_intelligence"."evidence" USING btree ("retain_until");--> statement-breakpoint
CREATE INDEX "news_signals_current_at_idx" ON "fpl_intelligence"."news_signals" USING btree ("player_id","lifecycle_state","effective_from","effective_until","expires_at","evaluated_at");--> statement-breakpoint
CREATE INDEX "news_signals_retention_idx" ON "fpl_intelligence"."news_signals" USING btree ("retain_until");--> statement-breakpoint
CREATE INDEX "player_availability_states_current_at_idx" ON "fpl_intelligence"."player_availability_states" USING btree ("player_id","lifecycle_state","effective_from","effective_until","expires_at","evaluated_at");--> statement-breakpoint
CREATE INDEX "player_availability_states_retention_idx" ON "fpl_intelligence"."player_availability_states" USING btree ("retain_until");