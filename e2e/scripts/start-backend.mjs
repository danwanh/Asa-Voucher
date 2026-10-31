// Starts the API for e2e tests: checks the database is a throwaway e2e one,
// applies migrations, loads the seed, then runs the server (stays in the foreground).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../backend");
const databaseUrl = process.env.DATABASE_URL;

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  throw new Error(`E2E DATABASE_URL is not a valid URL: ${databaseUrl}`);
}
const dbName = parsed.pathname.replace(/^\//, "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
  throw new Error(`Refusing to run e2e against non-local host "${parsed.hostname}".`);
}
if (!dbName.endsWith("_e2e")) {
  throw new Error(`Refusing to run e2e: database name "${dbName}" must end with "_e2e" (it is wiped and re-seeded).`);
}

function run(args) {
  const result = spawnSync("npx", args, { cwd: backendDir, stdio: "inherit", shell: true, env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["prisma", "migrate", "deploy"]);
run(["tsx", "prisma/seed/index.ts"]);
run(["tsx", "src/server.ts"]);
