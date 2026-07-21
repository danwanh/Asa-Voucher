import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";
import type { AuthUser } from "../../types/auth.types.js";

vi.mock("../../repositories/report.repository.js", () => ({
  listPaidOrders: vi.fn(),
  listOrderItemsForPartner: vi.fn(),
  listAllOrders: vi.fn(),
  listAllOrderItemsForPartner: vi.fn(),
  listVoucherProductStats: vi.fn(),
  countUsedIssuedVouchersByProduct: vi.fn(),
  listPartners: vi.fn(),
  countVoucherProductsByPartner: vi.fn(),
}));

import * as reportRepo from "../../repositories/report.repository.js";
import * as reportService from "../../services/report.service.js";

const BUYER: AuthUser = { id: "u-buyer", email: "b@test.com", role: "buyer" };
const PARTNER_OWNER: AuthUser = { id: "u-partner", email: "p@test.com", role: "partner_owner", partnerId: "partner-1" };
const ADMIN: AuthUser = { id: "u-admin", email: "a@test.com", role: "admin_account" };
const ADMIN_SECURITY: AuthUser = { id: "u-sec", email: "sec@test.com", role: "admin_security" };

describe("Report Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRevenueReport", () => {
    it("returns revenue for partner owner (partner-scoped)", async () => {
      vi.mocked(reportRepo.listOrderItemsForPartner).mockResolvedValue([
        {
          order_id: "order-1", subtotal: 100000, created_at: "2026-01-15T10:00:00Z",
          orders: { payment_status: "paid", status: "confirmed", created_at: "2026-01-15T10:00:00Z" },
          voucher_products: { partner_id: "partner-1" },
        },
      ]);

      const result = await reportService.getRevenueReport(PARTNER_OWNER, {});
      expect(result).toHaveLength(1);
      expect(result[0].revenue).toBe(100000);
      expect(result[0].date).toBe("2026-01-15");
    });

    it("returns revenue for admin (system-wide)", async () => {
      vi.mocked(reportRepo.listPaidOrders).mockResolvedValue([
        { id: "order-1", total_amount: 200000, status: "confirmed", payment_status: "paid", created_at: "2026-01-15T10:00:00Z" },
      ]);

      const result = await reportService.getRevenueReport(ADMIN, {});
      expect(result).toHaveLength(1);
      expect(result[0].revenue).toBe(200000);
    });

    it("excludes unpaid orders from revenue", async () => {
      vi.mocked(reportRepo.listOrderItemsForPartner).mockResolvedValue([
        {
          order_id: "order-1", subtotal: 100000, created_at: "2026-01-15T10:00:00Z",
          orders: { payment_status: "pending", status: "pending", created_at: "2026-01-15T10:00:00Z" },
          voucher_products: { partner_id: "partner-1" },
        },
      ]);

      const result = await reportService.getRevenueReport(PARTNER_OWNER, {});
      expect(result).toHaveLength(0);
    });

    it("rejects buyer", async () => {
      await expect(reportService.getRevenueReport(BUYER, {})).rejects.toThrow(HttpError);
    });
  });

  describe("getOrderReport", () => {
    it("returns order status breakdown for partner", async () => {
      vi.mocked(reportRepo.listAllOrderItemsForPartner).mockResolvedValue([
        {
          order_id: "order-1", subtotal: 100000, created_at: "2026-01-15T10:00:00Z",
          orders: { payment_status: "paid", status: "confirmed", created_at: "2026-01-15T10:00:00Z" },
          voucher_products: { partner_id: "partner-1" },
        },
        {
          order_id: "order-2", subtotal: 50000, created_at: "2026-01-16T10:00:00Z",
          orders: { payment_status: "paid", status: "completed", created_at: "2026-01-16T10:00:00Z" },
          voucher_products: { partner_id: "partner-1" },
        },
      ]);

      const result = await reportService.getOrderReport(PARTNER_OWNER, {});
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: "confirmed", count: 1 }),
          expect.objectContaining({ status: "completed", count: 1 }),
        ])
      );
    });

    it("rejects buyer", async () => {
      await expect(reportService.getOrderReport(BUYER, {})).rejects.toThrow(HttpError);
    });
  });

  describe("getVoucherReport", () => {
    it("returns voucher stats for partner", async () => {
      vi.mocked(reportRepo.listVoucherProductStats).mockResolvedValue([
        { id: "vp-1", name: "Voucher A", partner_id: "partner-1", total_quantity: 100, remaining_quantity: 50 },
      ]);
      vi.mocked(reportRepo.countUsedIssuedVouchersByProduct).mockResolvedValue({ "vp-1": 30 });

      const result = await reportService.getVoucherReport(PARTNER_OWNER, {});
      expect(result).toHaveLength(1);
      expect(result[0].sold_quantity).toBe(50);
      expect(result[0].used_quantity).toBe(30);
    });

    it("rejects buyer", async () => {
      await expect(reportService.getVoucherReport(BUYER, {})).rejects.toThrow(HttpError);
    });
  });

  describe("getPartnerReport", () => {
    it("returns partner report for admin", async () => {
      vi.mocked(reportRepo.listPartners).mockResolvedValue([
        { id: "partner-1", business_name: "Partner A" },
      ]);
      vi.mocked(reportRepo.countVoucherProductsByPartner).mockResolvedValue({ "partner-1": 5 });
      vi.mocked(reportRepo.listOrderItemsForPartner).mockResolvedValue([
        {
          order_id: "order-1", subtotal: 100000, created_at: "2026-01-15T10:00:00Z",
          orders: { payment_status: "paid", status: "confirmed", created_at: "2026-01-15T10:00:00Z" },
          voucher_products: { partner_id: "partner-1" },
        },
      ]);

      const result = await reportService.getPartnerReport(ADMIN, {});
      expect(result).toHaveLength(1);
      expect(result[0].business_name).toBe("Partner A");
      expect(result[0].revenue).toBe(100000);
      expect(result[0].voucher_count).toBe(5);
    });

    it("rejects non-admin users", async () => {
      await expect(reportService.getPartnerReport(PARTNER_OWNER, {})).rejects.toThrow(HttpError);
    });

    it("rejects buyer", async () => {
      await expect(reportService.getPartnerReport(BUYER, {})).rejects.toThrow(HttpError);
    });
  });
});
