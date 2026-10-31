// Shared by the integration config and global setup.
// Points at a dedicated database inside the docker compose Postgres, never the dev one.
export const DEFAULT_TEST_DATABASE_URL = "postgresql://asa:asa_password@localhost:5433/asa_voucher_test";

export function getTestDatabaseUrl() {
  return process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "db", "postgres"]);

// The integration run wipes and re-seeds the database, so refuse anything
// that is not clearly a local throwaway test database.
export function assertSafeTestDatabase(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`TEST_DATABASE_URL is not a valid URL: ${url}`);
  }
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`Refusing to run integration tests against non-local host "${parsed.hostname}".`);
  }
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to run integration tests: database name "${dbName}" must end with "_test".`);
  }
}
