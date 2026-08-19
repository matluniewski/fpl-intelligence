import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { DatabaseConfig } from "./config";

export interface DatabaseHealth {
  readonly status: "ok";
  readonly databaseName: string;
  readonly applicationSchemaReady: true;
}

export interface DatabaseClient {
  readonly db: ReturnType<typeof drizzle>;
  checkHealth(): Promise<DatabaseHealth>;
  close(): Promise<void>;
}

interface HealthRow {
  readonly database_name: string;
  readonly application_schema_ready: boolean;
}

export function createDatabaseClient(config: DatabaseConfig): DatabaseClient {
  const queryClient = postgres(config.url, {
    max: config.maxConnections,
    connect_timeout: config.connectionTimeoutSeconds,
    idle_timeout: config.idleTimeoutSeconds,
  });
  const db = drizzle({ client: queryClient });

  return Object.freeze({
    db,
    async checkHealth(): Promise<DatabaseHealth> {
      const rows = await queryClient<HealthRow[]>`
        select
          current_database() as database_name,
          exists (
            select 1
            from information_schema.schemata
            where schema_name = 'fpl_intelligence'
          ) as application_schema_ready
      `;
      const row = rows[0];
      if (
        row === undefined ||
        typeof row.database_name !== "string" ||
        row.database_name.length === 0 ||
        row.application_schema_ready !== true
      ) {
        throw new Error("Database health check returned an invalid result.");
      }
      return Object.freeze({
        status: "ok",
        databaseName: row.database_name,
        applicationSchemaReady: true,
      });
    },
    async close(): Promise<void> {
      await queryClient.end({ timeout: 5 });
    },
  });
}
