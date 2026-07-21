import { describe, expect, it, vi } from "vitest";

vi.mock("../repositories/health.repository.js", () => ({
  getDatabaseStatus: vi.fn(async () => ({ configured: true })),
}));

import { getHealthStatus } from "../services/health.service.js";

describe("getHealthStatus", () => {
  it("returns service health", async () => {
    await expect(getHealthStatus()).resolves.toMatchObject({
      status: "ok",
      service: "asa-voucher-backend"
    });
  });
});
