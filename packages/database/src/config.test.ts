import { describe, expect, it } from "vitest";
import { readDatabaseConfig } from "./config";

describe("database configuration", () => {
  it("parses explicit PostgreSQL configuration", () => {
    expect(
      readDatabaseConfig({
        DATABASE_URL:
          "postgresql://synthetic_user:synthetic_password@127.0.0.1:5432/synthetic_database",
        DATABASE_POOL_MAX: "4",
        DATABASE_CONNECT_TIMEOUT_SECONDS: "3",
        DATABASE_IDLE_TIMEOUT_SECONDS: "12",
      }),
    ).toEqual({
      url: "postgresql://synthetic_user:synthetic_password@127.0.0.1:5432/synthetic_database",
      maxConnections: 4,
      connectionTimeoutSeconds: 3,
      idleTimeoutSeconds: 12,
    });
  });

  it("uses bounded defaults without a remote connection", () => {
    const config = readDatabaseConfig({
      DATABASE_URL: "postgres://local_user:local_password@localhost/local_db",
    });
    expect(config).toMatchObject({
      maxConnections: 10,
      connectionTimeoutSeconds: 5,
      idleTimeoutSeconds: 20,
    });
  });

  it.each([
    [{}, "DATABASE_URL is required."],
    [{ DATABASE_URL: "https://example.test/db" }, "PostgreSQL database"],
    [
      {
        DATABASE_URL: "postgresql://localhost/db",
        DATABASE_POOL_MAX: "0",
      },
      "DATABASE_POOL_MAX",
    ],
  ])("fails closed for invalid configuration", (environment, message) => {
    expect(() => readDatabaseConfig(environment)).toThrow(message);
  });
});
