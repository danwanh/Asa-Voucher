import { defineConfig, devices } from "@playwright/test";

// A separate stack on its own ports and database, so it never touches the docker dev stack (3000/5000).
const FRONTEND_PORT = 3100;
const BACKEND_PORT = 5100;
export const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
export const API_URL = `http://localhost:${BACKEND_PORT}/api/v1`;

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://asa:asa_password@localhost:5433/asa_voucher_e2e";

export const VNPAY = {
  tmnCode: "E2ETMN01",
  hashSecret: "E2EVNPAYHASHSECRET",
};

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  // Specs share one database, so run one at a time
  workers: 1,
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: FRONTEND_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "vi-VN",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node scripts/start-backend.mjs",
      url: `http://localhost:${BACKEND_PORT}/api/v1/health`,
      // Always start fresh so the DB is re-seeded and rate-limit counters are reset
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        NODE_ENV: "development", // not "production": the refresh cookie must work over http
        PORT: String(BACKEND_PORT),
        DATABASE_URL,
        DIRECT_URL: DATABASE_URL,
        JWT_SECRET: "e2e-jwt-secret",
        FRONTEND_URL,
        EMAIL_PROVIDER: "smtp",
        VNPAY_TMN_CODE: VNPAY.tmnCode,
        VNPAY_HASH_SECRET: VNPAY.hashSecret,
        VNPAY_URL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        VNPAY_RETURN_URL: `http://localhost:${BACKEND_PORT}/api/v1/payments/vnpay/return`,
        DOTENV_CONFIG_PATH: "./.env.does-not-exist", // never load backend/.env
      },
    },
    {
      command: `npm --workspace frontend run build && npm --workspace frontend run start -- -p ${FRONTEND_PORT}`,
      cwd: "..",
      url: FRONTEND_URL,
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: "pipe",
      stderr: "pipe",
      env: { NEXT_PUBLIC_API_BASE_URL: API_URL, NEXT_TELEMETRY_DISABLED: "1" },
    },
  ],
});
