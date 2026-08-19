export interface DatabaseConfig {
  readonly url: string;
  readonly maxConnections: number;
  readonly connectionTimeoutSeconds: number;
  readonly idleTimeoutSeconds: number;
}

const DEFAULT_MAX_CONNECTIONS = 10;
const DEFAULT_CONNECTION_TIMEOUT_SECONDS = 5;
const DEFAULT_IDLE_TIMEOUT_SECONDS = 20;

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  if (value === undefined || value.trim().length === 0) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function readDatabaseConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): DatabaseConfig {
  const rawUrl = environment["DATABASE_URL"]?.trim();
  if (rawUrl === undefined || rawUrl.length === 0) {
    throw new Error("DATABASE_URL is required.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (error) {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.", {
      cause: error,
    });
  }
  if (
    (parsedUrl.protocol !== "postgres:" &&
      parsedUrl.protocol !== "postgresql:") ||
    parsedUrl.hostname.length === 0 ||
    parsedUrl.pathname === "/"
  ) {
    throw new Error("DATABASE_URL must identify a PostgreSQL database.");
  }

  return Object.freeze({
    url: rawUrl,
    maxConnections: readPositiveInteger(
      environment["DATABASE_POOL_MAX"],
      DEFAULT_MAX_CONNECTIONS,
      "DATABASE_POOL_MAX",
    ),
    connectionTimeoutSeconds: readPositiveInteger(
      environment["DATABASE_CONNECT_TIMEOUT_SECONDS"],
      DEFAULT_CONNECTION_TIMEOUT_SECONDS,
      "DATABASE_CONNECT_TIMEOUT_SECONDS",
    ),
    idleTimeoutSeconds: readPositiveInteger(
      environment["DATABASE_IDLE_TIMEOUT_SECONDS"],
      DEFAULT_IDLE_TIMEOUT_SECONDS,
      "DATABASE_IDLE_TIMEOUT_SECONDS",
    ),
  });
}
