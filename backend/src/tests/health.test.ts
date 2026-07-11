import { describe, expect, it } from "vitest";
import { getHealthStatus } from "../services/health.service.js";

describe("getHealthStatus", () => {
  it("returns service health", async () => {
    await expect(getHealthStatus()).resolves.toMatchObject({
      status: "ok",
      service: "asa-voucher-backend"
    });
  });
});
