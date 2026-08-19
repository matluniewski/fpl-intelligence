import { pgSchema } from "drizzle-orm/pg-core";

/**
 * Reserved namespace for future application-owned persistence models.
 * FPL-15 deliberately introduces no product, provider, identity, or billing tables.
 */
export const applicationSchema = pgSchema("fpl_intelligence");
