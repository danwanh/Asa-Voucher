import { execSync } from "node:child_process";
import { assertSafeTestDatabase, getTestDatabaseUrl } from "./test-db.js";

// Runs once before the integration suite: apply migrations to the test
// database (Prisma creates it if missing), then load the seed data. The seed
// clears its tables first, so every run starts from the same state.
export default function setup() {
  const url = getTestDatabaseUrl();
  assertSafeTestDatabase(url);

  const env = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: url,
    DIRECT_URL: url,
    DOTENV_CONFIG_PATH: "./.env.does-not-exist",
  };
  const run = (command: string) => execSync(command, { env, stdio: "pipe" });

  try {
    run("npx prisma migrate deploy");
    run("npx tsx prisma/seed/index.ts");
  } catch (error) {
    const output = (error as { stdout?: Buffer; stderr?: Buffer });
    console.error(output.stdout?.toString(), output.stderr?.toString());
    throw new Error(
      `Could not prepare the test database at ${new URL(url).host}. ` +
      "Is Postgres running? Start it with: docker compose up -d db",
    );
  }
}
