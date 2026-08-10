import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";
import type { AuthUser } from "../../types/auth.types.js";

vi.mock("../../repositories/log.repository.js", () => ({
  listAuthenticationLogs: vi.fn(),
  findAuthenticationLogById: vi.fn(),
  listAdminLogs: vi.fn(),
  findAdminLogById: vi.fn(),
  listOrderLogs: vi.fn(),
  findOrderLogById: vi.fn(),
  listPaymentLogs: vi.fn(),
  findPaymentLogById: vi.fn(),
}));

import * as logRepo from "../../repositories/log.repository.js";
import * as logService from "../../services/log.service.js";

const ADMIN_SECURITY: AuthUser = { id: "u-sec", email: "sec@test.com", role: "admin_security" };
const BUYER: AuthUser = { id: "u-buyer", email: "b@test.com", role: "buyer" };
const ADMIN: AuthUser = { id: "u-admin", email: "a@test.com", role: "admin_operations" };

describe("Log Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAuthenticationLogs", () => {
    it("returns logs for admin_security", async () => {
      vi.mocked(logRepo.listAuthenticationLogs).mockResolvedValue({
        rows: [{
          id: "log-1", user_id: "u-1", action: "login", status: "success",
          ip_address: "127.0.0.1", user_agent: "test", occurred_at: "2026-01-01T00:00:00Z",
        }],
        total: 1,
      });

      const result = await logService.listAuthenticationLogs(ADMIN_SECURITY, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });

    it("rejects non-admin_security users", async () => {
      await expect(
        logService.listAuthenticationLogs(BUYER, { page: 1, limit: 20 })
      ).rejects.toThrow(HttpError);
    });

    it("rejects admin_operations users", async () => {
      await expect(
        logService.listAuthenticationLogs(ADMIN, { page: 1, limit: 20 })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("getAuthenticationLog", () => {
    it("returns log by id for admin_security", async () => {
      vi.mocked(logRepo.findAuthenticationLogById).mockResolvedValue({
        id: "log-1", user_id: "u-1", action: "login", status: "success",
        ip_address: "127.0.0.1", user_agent: "test", occurred_at: "2026-01-01T00:00:00Z",
      });

      const result = await logService.getAuthenticationLog(ADMIN_SECURITY, "log-1");
      expect(result.id).toBe("log-1");
    });

    it("throws 404 if not found", async () => {
      vi.mocked(logRepo.findAuthenticationLogById).mockResolvedValue(null);
      await expect(logService.getAuthenticationLog(ADMIN_SECURITY, "log-1")).rejects.toThrow(HttpError);
    });

    it("rejects non-admin_security", async () => {
      await expect(logService.getAuthenticationLog(BUYER, "log-1")).rejects.toThrow(HttpError);
    });
  });

  describe("listAdminLogs", () => {
    it("returns admin logs for admin_security", async () => {
      vi.mocked(logRepo.listAdminLogs).mockResolvedValue({
        rows: [{
          id: "alog-1", admin_id: "u-admin", target_user_id: null, target_partner_id: null,
          target_voucher_id: null, action: "approve_partner", description: null,
          occurred_at: "2026-01-01T00:00:00Z",
        }],
        total: 1,
      });

      const result = await logService.listAdminLogs(ADMIN_SECURITY, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });

    it("rejects buyer", async () => {
      await expect(
        logService.listAdminLogs(BUYER, { page: 1, limit: 20 })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("getAdminLog", () => {
    it("returns admin log by id", async () => {
      vi.mocked(logRepo.findAdminLogById).mockResolvedValue({
        id: "alog-1", admin_id: "u-admin", target_user_id: null, target_partner_id: null,
        target_voucher_id: null, action: "approve_partner", description: null,
        occurred_at: "2026-01-01T00:00:00Z",
      });

      const result = await logService.getAdminLog(ADMIN_SECURITY, "alog-1");
      expect(result.id).toBe("alog-1");
    });

    it("throws 404 if not found", async () => {
      vi.mocked(logRepo.findAdminLogById).mockResolvedValue(null);
      await expect(logService.getAdminLog(ADMIN_SECURITY, "alog-1")).rejects.toThrow(HttpError);
    });
  });

  describe("listOrderLogs", () => {
    it("returns order logs for admin_security", async () => {
      vi.mocked(logRepo.listOrderLogs).mockResolvedValue({
        rows: [{
          id: "olog-1", order_id: "order-1", user_id: "u-1", action: "created",
          description: null, occurred_at: "2026-01-01T00:00:00Z",
        }],
        total: 1,
      });

      const result = await logService.listOrderLogs(ADMIN_SECURITY, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });

    it("rejects non-admin_security", async () => {
      await expect(
        logService.listOrderLogs(BUYER, { page: 1, limit: 20 })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("getOrderLog", () => {
    it("returns order log by id", async () => {
      vi.mocked(logRepo.findOrderLogById).mockResolvedValue({
        id: "olog-1", order_id: "order-1", user_id: "u-1", action: "created",
        description: null, occurred_at: "2026-01-01T00:00:00Z",
      });

      const result = await logService.getOrderLog(ADMIN_SECURITY, "olog-1");
      expect(result.id).toBe("olog-1");
    });

    it("throws 404 if not found", async () => {
      vi.mocked(logRepo.findOrderLogById).mockResolvedValue(null);
      await expect(logService.getOrderLog(ADMIN_SECURITY, "olog-1")).rejects.toThrow(HttpError);
    });
  });

  describe("listPaymentLogs", () => {
    it("returns payment logs for admin_security", async () => {
      vi.mocked(logRepo.listPaymentLogs).mockResolvedValue({
        rows: [{
          id: "plog-1", payment_id: "pay-1", order_id: "order-1", user_id: "u-1",
          action: "created", status: "pending", amount: 100000,
          occurred_at: "2026-01-01T00:00:00Z",
        }],
        total: 1,
      });

      const result = await logService.listPaymentLogs(ADMIN_SECURITY, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });

    it("rejects non-admin_security", async () => {
      await expect(
        logService.listPaymentLogs(BUYER, { page: 1, limit: 20 })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("getPaymentLog", () => {
    it("returns payment log by id", async () => {
      vi.mocked(logRepo.findPaymentLogById).mockResolvedValue({
        id: "plog-1", payment_id: "pay-1", order_id: "order-1", user_id: "u-1",
        action: "created", status: "pending", amount: 100000,
        occurred_at: "2026-01-01T00:00:00Z",
      });

      const result = await logService.getPaymentLog(ADMIN_SECURITY, "plog-1");
      expect(result.id).toBe("plog-1");
    });

    it("throws 404 if not found", async () => {
      vi.mocked(logRepo.findPaymentLogById).mockResolvedValue(null);
      await expect(logService.getPaymentLog(ADMIN_SECURITY, "plog-1")).rejects.toThrow(HttpError);
    });
  });
});
