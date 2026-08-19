import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "./client";
import { readDatabaseConfig } from "./config";
import type { DatabaseClient } from "./client";

describe("PostgreSQL and Drizzle integration", () => {
  let client: DatabaseClient;

  beforeAll(() => {
    client = createDatabaseClient(readDatabaseConfig());
  });

  afterAll(async () => {
    await client.close();
  });

  it("connects after migrations and reports the application schema ready", async () => {
    await expect(client.checkHealth()).resolves.toEqual({
      status: "ok",
      databaseName: "fpl_intelligence",
      applicationSchemaReady: true,
    });
  });
});
