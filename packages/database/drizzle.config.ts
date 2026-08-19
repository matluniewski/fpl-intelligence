import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnvironment } from "dotenv";
import { defineConfig } from "drizzle-kit";

const packageDirectory = fileURLToPath(new URL(".", import.meta.url));
loadEnvironment({
  path: resolve(packageDirectory, "../../.env.local"),
  quiet: true,
});

const databaseUrl = process.env["DATABASE_URL"]?.trim();
if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error(
    "DATABASE_URL is required for Drizzle migration commands. Copy .env.example to .env.local for local development.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
  strict: true,
  verbose: true,
});
