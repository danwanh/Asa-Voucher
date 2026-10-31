import { defineConfig } from "vitest/config";

// Unit tests: Prisma and external services are mocked, no database needed.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    exclude: ["src/tests/integration/**", "node_modules/**", "dist/**"],
    setupFiles: ["./src/tests/setup-env.ts"],
    // Point dotenv at a file that does not exist so tests never load the real backend/.env
    env: { DOTENV_CONFIG_PATH: "./.env.does-not-exist" },
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/tests/**", "src/types/**", "src/server.ts"],
    },
  },
});
