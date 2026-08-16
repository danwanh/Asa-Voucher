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
  listVoucherProductsByPartner: vi.fn(),
  countIssuedVouchersByProduct: vi.fn(),
  sumRevenueProducts: vi.fn(),
}));

import * as reportRepo from "../../repositories/report.repository.js";
import * as reportService from "../../services/report.service.js";

type PartnerItemsResult = Awaited<ReturnType<typeof reportRepo.listOrderItemsForPartner>>;

const BUYER: AuthUser = { id: "u-buyer", email: "b@test.com", role: "buyer" };
const PARTNER_OWNER: AuthUser = { id: "u-partner", email: "p@test.com", role: "partner_owner", partnerId: "partner-1" };
const STAFF: AuthUser = { id: "u-staff", email: "s@test.com", role: "partner_voucher_staff", partnerId: "partner-1" };
const ADMIN: AuthUser = { id: "u-admin", email: "a@test.com", role: "admin_operations" };

describe("Report Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRevenueReport", () => {
    it("handles Date created_at without throwing and returns YYYY-MM-DD date key", async () => {
      vi.mocked(reportRepo.listOrderItemsForPartner).mockResolvedValue([
        {
          order_id: "order-date-1", subtotal: 150000, created_at: new Date("2026-08-10T11:29:16.071Z"),
          orders: { status: "confirmed", created_at: new Date("2026-08-10T11:29:16.071Z") },
          voucher_products: { partner_id: "partner-1" },
        },
      ] as unknown as PartnerItemsResult);

      await expect(reportService.getRevenueReport(PARTNER_OWNER, {})).resolves.toEqual([
        { date: "2026-08-10", revenue: 150000, order_count: 1 },
      ]);
    });

    it("returns revenue for partner owner (partner-scoped)", async () => {
      vi.mocked(reportRepo.listOrderItemsForPartner).mockResolvedValue([
        {
          order_id: "order-1", subtotal: 100000, created_at: "2026-01-15T10:00:00Z",
          orders: { status: "confirmed", created_at: "2026-01-15T10:00:00Z" },
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
        { id: "order-1", total_amount: 200000, status: "confirmed", created_at: "2026-01-15T10:00:00Z" },
      ]);

      const result = await reportService.getRevenueReport(ADMIN, {});
      expect(result).toHaveLength(1);
      expect(result[0].revenue).toBe(200000);
    });

    it("preserves ISO string behavior for date key", async () => {
      vi.mocked(reportRepo.listPaidOrders).mockResolvedValue([
        { id: "order-iso-1", total_amount: 120000, status: "confirmed", created_at: "2026-08-10T11:29:16.071Z" },
      ]);

      const result = await reportService.getRevenueReport(ADMIN, {});
      expect(result).toEqual([
        { date: "2026-08-10", revenue: 120000, order_count: 1 },
      ]);
    });

    it("aggregates revenue with Date created_at and keeps numeric revenue", async () => {
      vi.mocked(reportRepo.listOrderItemsForPartner).mockResolvedValue([
        {
          order_id: "order-a", subtotal: 100000, created_at: new Date("2026-08-10T11:29:16.071Z"),
          orders: { status: "completed", created_at: new Date("2026-08-10T11:29:16.071Z") },
          voucher_products: { partner_id: "partner-1" },
        },
        {
          order_id: "order-b", subtotal: 25000, created_at: new Date("2026-08-10T12:29:16.071Z"),
          orders: { status: "completed", created_at: new Date("2026-08-10T12:29:16.071Z") },
          voucher_products: { partner_id: "partner-1" },
        },
      ] as unknown as PartnerItemsResult);

      const result = await reportService.getRevenueReport(PARTNER_OWNER, {});
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2026-08-10");
      expect(result[0].revenue).toBe(125000);
      expect(Number.isNaN(result[0].revenue)).toBe(false);
      expect(result[0].order_count).toBe(2);
    });

    it("excludes unpaid orders from revenue", async () => {
      vi.mocked(reportRepo.listOrderItemsForPartner).mockResolvedValue([
        {
          order_id: "order-1", subtotal: 100000, created_at: "2026-01-15T10:00:00Z",
          orders: { status: "pending_payment", created_at: "2026-01-15T10:00:00Z" },
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
          orders: { status: "confirmed", created_at: "2026-01-15T10:00:00Z" },
          voucher_products: { partner_id: "partner-1" },
        },
        {
          order_id: "order-2", subtotal: 50000, created_at: "2026-01-16T10:00:00Z",
          orders: { status: "completed", created_at: "2026-01-16T10:00:00Z" },
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

    it("uses authenticated partner scope for partner_owner", async () => {
      vi.mocked(reportRepo.listVoucherProductStats).mockResolvedValue([]);
      vi.mocked(reportRepo.countUsedIssuedVouchersByProduct).mockResolvedValue({});

      await reportService.getVoucherReport(PARTNER_OWNER, { partner_id: "partner-other" });

      expect(reportRepo.listVoucherProductStats).toHaveBeenCalledWith("partner-1");
    });

    it("uses query partner_id for admin scope", async () => {
      vi.mocked(reportRepo.listVoucherProductStats).mockResolvedValue([]);
      vi.mocked(reportRepo.countUsedIssuedVouchersByProduct).mockResolvedValue({});

      await reportService.getVoucherReport(ADMIN, { partner_id: "partner-2" });

      expect(reportRepo.listVoucherProductStats).toHaveBeenCalledWith("partner-2");
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
          orders: { status: "confirmed", created_at: "2026-01-15T10:00:00Z" },
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

  describe("getStaffVoucherReport", () => {
    const CREATED_PRODUCTS = [
      {
        id: "vp-1",
        name: "Voucher A",
        partner_id: "partner-1",
        total_quantity: 100,
        remaining_quantity: 0,
        category_name: "Ăn uống",
        created_at: new Date("2026-01-01T00:00:00Z"),
      },
    ];

    it("returns period-based stats with redefined effectiveness", async () => {
      vi.mocked(reportRepo.listVoucherProductsByPartner).mockResolvedValue(CREATED_PRODUCTS);
      vi.mocked(reportRepo.countIssuedVouchersByProduct).mockResolvedValue({ "vp-1": { total: 30, used: 12 } });
      vi.mocked(reportRepo.sumRevenueProducts).mockResolvedValue({ "vp-1": 300000 });

      const result = await reportService.getStaffVoucherReport(STAFF, {});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        voucher_product_id: "vp-1",
        program_name: "Voucher A",
        category_name: "Ăn uống",
        total_quantity: 100,
        sold_quantity: 30,
        used_quantity: 12,
        usage_rate: 40,
        revenue: 300000,
        effectiveness_score: 120000,
      });
    });

    it("returns zero usage rate and effectiveness when nothing sold", async () => {
      vi.mocked(reportRepo.listVoucherProductsByPartner).mockResolvedValue(CREATED_PRODUCTS);
      vi.mocked(reportRepo.countIssuedVouchersByProduct).mockResolvedValue({ "vp-1": { total: 0, used: 0 } });
      vi.mocked(reportRepo.sumRevenueProducts).mockResolvedValue({ "vp-1": 0 });

      const result = await reportService.getStaffVoucherReport(STAFF, {});

      expect(result[0].sold_quantity).toBe(0);
      expect(result[0].usage_rate).toBe(0);
      expect(result[0].effectiveness_score).toBe(0);
    });

    it("returns 0 revenue/effectiveness (not NaN) when product has no revenue data", async () => {
      vi.mocked(reportRepo.listVoucherProductsByPartner).mockResolvedValue(CREATED_PRODUCTS);
      vi.mocked(reportRepo.countIssuedVouchersByProduct).mockResolvedValue({});
      vi.mocked(reportRepo.sumRevenueProducts).mockResolvedValue({});

      const result = await reportService.getStaffVoucherReport(STAFF, {});

      expect(Number.isNaN(result[0].revenue)).toBe(false);
      expect(result[0].revenue).toBe(0);
      expect(Number.isNaN(result[0].effectiveness_score)).toBe(false);
      expect(result[0].effectiveness_score).toBe(0);
    });

    it("queries whole partner's approved products and passes date range to period-stat queries", async () => {
      vi.mocked(reportRepo.listVoucherProductsByPartner).mockResolvedValue(CREATED_PRODUCTS);
      vi.mocked(reportRepo.countIssuedVouchersByProduct).mockResolvedValue({});
      vi.mocked(reportRepo.sumRevenueProducts).mockResolvedValue({});

      await reportService.getStaffVoucherReport(STAFF, { date_from: "2026-01-01", date_to: "2026-01-31" });

      expect(reportRepo.listVoucherProductsByPartner).toHaveBeenCalledWith("partner-1", undefined);
      expect(reportRepo.countIssuedVouchersByProduct).toHaveBeenCalledWith(
        ["vp-1"], "2026-01-01", "2026-01-31",
      );
      expect(reportRepo.sumRevenueProducts).toHaveBeenCalledWith(
        ["vp-1"], "2026-01-01", "2026-01-31",
      );
    });

    it("forwards category filter to partner product query", async () => {
      vi.mocked(reportRepo.listVoucherProductsByPartner).mockResolvedValue(CREATED_PRODUCTS);
      vi.mocked(reportRepo.countIssuedVouchersByProduct).mockResolvedValue({});
      vi.mocked(reportRepo.sumRevenueProducts).mockResolvedValue({});

      await reportService.getStaffVoucherReport(STAFF, { category_id: "cat-1" });

      expect(reportRepo.listVoucherProductsByPartner).toHaveBeenCalledWith("partner-1", "cat-1");
    });

    it("rejects user without a partner", async () => {
      await expect(reportService.getStaffVoucherReport(BUYER, {})).rejects.toThrow(HttpError);
    });
  });
});
