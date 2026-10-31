import { defineConfig } from "vitest/config";
import { getTestDatabaseUrl } from "./src/tests/integration/test-db.js";

const databaseUrl = getTestDatabaseUrl();

// Integration tests: real HTTP requests through createApp() against a real
// Postgres test database (needs `docker compose up -d db`).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/tests/integration/**/*.int.test.ts"],
    globalSetup: ["./src/tests/integration/global-setup.ts"],
    setupFiles: ["./src/tests/setup-env.ts", "./src/tests/integration/setup-quiet-logs.ts"],
    env: {
      DOTENV_CONFIG_PATH: "./.env.does-not-exist",
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
    },
    // Files share one database, so run them one at a time
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 120000,
  },
});
