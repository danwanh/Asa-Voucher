import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";
import type { AuthUser } from "../../types/auth.types.js";

vi.mock("../../repositories/issued-voucher.repository.js", () => ({
  listIssuedVouchers: vi.fn(),
  findIssuedVoucherById: vi.fn(),
  findIssuedVoucherByCode: vi.fn(),
  findIssuedVoucherByQrPayload: vi.fn(),
  updateIssuedVoucherStatus: vi.fn(),
  expireExpiredVouchers: vi.fn(),
  findEligibleBranchIds: vi.fn(),
  findEligibleBranches: vi.fn(),
}));

vi.mock("../../repositories/voucher-usage.repository.js", () => ({
  listUsagesByIssuedVoucher: vi.fn(),
  listUsages: vi.fn(),
}));

vi.mock("../../config/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((fn: unknown) => {
      if (typeof fn === "function") return fn({});
      return fn;
    }),
    voucherProduct: {
      findUnique: vi.fn(),
    },
  },
}));

import * as issuedVoucherRepo from "../../repositories/issued-voucher.repository.js";
import * as voucherUsageRepo from "../../repositories/voucher-usage.repository.js";
import * as issuedVoucherService from "../../services/issued-voucher.service.js";

const BUYER: AuthUser = { id: "u-buyer", email: "b@test.com", role: "buyer" };
const PARTNER_OWNER: AuthUser = { id: "u-partner", email: "p@test.com", role: "partner_owner", partnerId: "partner-1" };
const VOUCHER_STAFF: AuthUser = { id: "u-vstaff", email: "vs@test.com", role: "partner_voucher_staff", partnerId: "partner-1" };
const STORE_STAFF: AuthUser = { id: "u-staff", email: "s@test.com", role: "partner_store_staff", partnerId: "partner-1", branchId: "branch-1" };
const ADMIN: AuthUser = { id: "u-admin", email: "a@test.com", role: "admin_content" };

function makeIssuedVoucher(overrides: Record<string, unknown> = {}) {
  return {
    id: "iv-1",
    voucher_code: "VC-001",
    qr_code_payload: "qr-payload-1",
    qr_code_image_url: null,
    order_item_id: "oi-1",
    voucher_product_id: "vp-1",
    owner_id: "u-buyer",
    issued_date: "2026-01-01",
    expired_date: "2026-12-31",
    status: "active" as const,
    is_test: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    voucher_products: { id: "vp-1", name: "Voucher A", partner_id: "partner-1", thumbnail_url: null },
    order_items: { id: "oi-1", order_id: "order-1" },
    ...overrides,
  };
}

describe("Issued Voucher Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listIssuedVouchers", () => {
    it("returns paginated issued vouchers for buyer (owner-scoped)", async () => {
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.listIssuedVouchers).mockResolvedValue({ rows: [voucher], total: 1 });

      const result = await issuedVoucherService.listIssuedVouchers(BUYER, { page: 1, limit: 20 });

      expect(issuedVoucherRepo.listIssuedVouchers).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: "u-buyer", feedbackUserId: "u-buyer" })
      );
      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it("returns partner-scoped vouchers for partner owner", async () => {
      vi.mocked(issuedVoucherRepo.listIssuedVouchers).mockResolvedValue({ rows: [], total: 0 });

      await issuedVoucherService.listIssuedVouchers(PARTNER_OWNER, { page: 1, limit: 20 });

      expect(issuedVoucherRepo.listIssuedVouchers).toHaveBeenCalledWith(
        expect.objectContaining({ partnerId: "partner-1" })
      );
    });
  });

  describe("getIssuedVoucherById", () => {
    it("returns voucher if owner", async () => {
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue(voucher);

      const result = await issuedVoucherService.getIssuedVoucherById(BUYER, "iv-1");
      expect(result.id).toBe("iv-1");
      expect(issuedVoucherRepo.findIssuedVoucherById).toHaveBeenCalledWith("iv-1", "u-buyer");
    });

    it("throws 404 if not found", async () => {
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue(null);
      await expect(issuedVoucherService.getIssuedVoucherById(BUYER, "iv-1")).rejects.toThrow(HttpError);
    });

    it("throws 403 if not owner and not admin/partner", async () => {
      const voucher = makeIssuedVoucher({ owner_id: "u-other" });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue(voucher);

      await expect(issuedVoucherService.getIssuedVoucherById(BUYER, "iv-1")).rejects.toThrow(HttpError);
    });
  });

  describe("updateIssuedVoucherStatus", () => {
    it("allows admin to update status", async () => {
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.updateIssuedVoucherStatus).mockResolvedValue({ ...voucher, status: "revoked" });

      const result = await issuedVoucherService.updateIssuedVoucherStatus(ADMIN, "iv-1", { status: "revoked" });
      expect(result.status).toBe("revoked");
    });

    it("rejects non-admin users", async () => {
      await expect(
        issuedVoucherService.updateIssuedVoucherStatus(BUYER, "iv-1", { status: "revoked" })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("checkVoucher", () => {
    it("returns voucher info for valid code", async () => {
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);

      const result = await issuedVoucherService.checkVoucher(STORE_STAFF, { voucher_code: "VC-001" });
      expect(result.issued_voucher).toBeDefined();
      expect(result.eligible_branch_ids).toEqual(["branch-1"]);
    });

    it("rejects if not partner staff or admin", async () => {
      await expect(
        issuedVoucherService.checkVoucher(BUYER, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);
    });

    it("throws 400 for used voucher", async () => {
      const voucher = makeIssuedVoucher({ status: "used" });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);

      await expect(
        issuedVoucherService.checkVoucher(PARTNER_OWNER, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);
    });

    it("throws 400 for expired voucher and marks it expired", async () => {
      const voucher = makeIssuedVoucher({ expired_date: "2020-01-01" });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);

      await expect(
        issuedVoucherService.checkVoucher(PARTNER_OWNER, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);

      expect(issuedVoucherRepo.updateIssuedVoucherStatus).toHaveBeenCalledWith("iv-1", "expired");
    });

    it("does not mutate a voucher already marked expired", async () => {
      const voucher = makeIssuedVoucher({ status: "expired", expired_date: "2020-01-01" });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);

      await expect(
        issuedVoucherService.checkVoucher(PARTNER_OWNER, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);

      expect(issuedVoucherRepo.updateIssuedVoucherStatus).not.toHaveBeenCalled();
    });

    it("rejects partner checking voucher from another partner", async () => {
      const otherPartner: AuthUser = { id: "u-other", email: "o@test.com", role: "partner_owner", partnerId: "partner-2" };
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);

      await expect(
        issuedVoucherService.checkVoucher(otherPartner, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);
    });

    it("returns is_test true when checking a test record by voucher staff", async () => {
      const testVoucher = makeIssuedVoucher({
        id: "iv-test",
        voucher_code: "VC1754341234567012345",
        qr_code_payload: "VC1754341234567012345",
        is_test: true,
        owner_id: null,
        order_item_id: null,
        order_items: null,
      });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(testVoucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);
      vi.mocked(issuedVoucherRepo.findEligibleBranches).mockResolvedValue([{ id: "branch-1", branch_name: "Chi nhánh 1" }]);

      const result = await issuedVoucherService.checkVoucher(VOUCHER_STAFF, { voucher_code: "VC1754341234567012345" });

      expect(result.is_test).toBe(true);
      expect(result.issued_voucher.voucher_code).toBe("VC1754341234567012345");
      expect(result.eligible_branch_ids).toEqual(["branch-1"]);
      expect(result.eligible_branches).toEqual([{ id: "branch-1", branch_name: "Chi nhánh 1" }]);
      expect(issuedVoucherRepo.findIssuedVoucherByCode).toHaveBeenCalled();
    });

    it("also recognizes a test record via qr_code_payload", async () => {
      const testVoucher = makeIssuedVoucher({ is_test: true, owner_id: null, order_item_id: null, order_items: null });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByQrPayload).mockResolvedValue(testVoucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue([]);
      vi.mocked(issuedVoucherRepo.findEligibleBranches).mockResolvedValue([]);

      const result = await issuedVoucherService.checkVoucher(PARTNER_OWNER, { qr_code_payload: "qr-test" });

      expect(result.is_test).toBe(true);
      expect(issuedVoucherRepo.findIssuedVoucherByCode).not.toHaveBeenCalled();
    });

    it("treats a test record as an invalid code for store staff", async () => {
      const testVoucher = makeIssuedVoucher({ is_test: true, owner_id: null, order_item_id: null, order_items: null });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(testVoucher);

      await expect(
        issuedVoucherService.checkVoucher(STORE_STAFF, { voucher_code: "VC1754341234567012345" })
      ).rejects.toThrow(HttpError);

      expect(issuedVoucherRepo.findIssuedVoucherByCode).toHaveBeenCalledWith("VC1754341234567012345");
    });

    it("returns no is_test flag for a real voucher", async () => {
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(makeIssuedVoucher());
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);
      vi.mocked(issuedVoucherRepo.findEligibleBranches).mockResolvedValue([]);

      const result = await issuedVoucherService.checkVoucher(STORE_STAFF, { voucher_code: "VC-001" });

      expect(result.is_test).toBeUndefined();
    });

    it("excludes test records from issued voucher lists", async () => {
      vi.mocked(issuedVoucherRepo.listIssuedVouchers).mockResolvedValue({ rows: [], total: 0 });

      await issuedVoucherService.listIssuedVouchers(PARTNER_OWNER, { page: 1, limit: 20 });

      expect(issuedVoucherRepo.listIssuedVouchers).toHaveBeenCalledWith(
        expect.objectContaining({ isTest: false })
      );
    });
  });

  describe("confirmVoucher", () => {
    it("confirms active voucher successfully", async () => {
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);

      const { prisma } = await import("../../config/prisma.js");
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: never) => Promise<unknown>) => {
        return fn({
          issuedVoucher: {
            findUnique: vi.fn().mockResolvedValue(voucher),
            update: vi.fn().mockResolvedValue({ ...voucher, status: "used" }),
            count: vi.fn().mockResolvedValue(1),
          },
          order: { updateMany: vi.fn() },
          orderLog: { create: vi.fn() },
        } as never);
      });

      const result = await issuedVoucherService.confirmVoucher(STORE_STAFF, { voucher_code: "VC-001" });
      expect(result.message).toContain("thành công");
    });

    it("completes the order after the final voucher is used", async () => {
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);
      const orderUpdate = vi.fn().mockResolvedValue({ count: 1 });

      const { prisma } = await import("../../config/prisma.js");
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: never) => Promise<unknown>) => fn({
        issuedVoucher: {
          findUnique: vi.fn().mockResolvedValue(voucher),
          update: vi.fn().mockResolvedValue({ ...voucher, status: "used" }),
          count: vi.fn().mockResolvedValue(0),
        },
        order: { updateMany: orderUpdate },
        orderLog: { create: vi.fn().mockResolvedValue({}) },
      } as never));

      await issuedVoucherService.confirmVoucher(STORE_STAFF, { voucher_code: "VC-001" });

      expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "completed" }),
      }));
    });

    it("rejects non-store-staff user", async () => {
      await expect(
        issuedVoucherService.confirmVoucher(ADMIN, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);
    });

    it("rejects if voucher from another partner", async () => {
      const otherPartner: AuthUser = { id: "u-other", email: "o@test.com", role: "partner_store_staff", partnerId: "partner-2", branchId: "branch-1" };
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);

      await expect(
        issuedVoucherService.confirmVoucher(otherPartner, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);
    });

    it("rejects confirming a test record", async () => {
      const testVoucher = makeIssuedVoucher({ is_test: true, owner_id: null, order_item_id: null, order_items: null });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(testVoucher);

      await expect(
        issuedVoucherService.confirmVoucher(STORE_STAFF, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);
    });

    it("marks an active-but-expired voucher as expired and rejects confirmation", async () => {
      const voucher = makeIssuedVoucher({ expired_date: "2020-01-01" });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);

      await expect(
        issuedVoucherService.confirmVoucher(STORE_STAFF, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);

      expect(issuedVoucherRepo.updateIssuedVoucherStatus).toHaveBeenCalledWith("iv-1", "expired");
    });
  });

  describe("listVoucherUsages (global)", () => {
    it("allows admin_security to list usages", async () => {
      const adminSecurity: AuthUser = { id: "u-sec", email: "sec@test.com", role: "admin_security" };
      vi.mocked(voucherUsageRepo.listUsages).mockResolvedValue({ rows: [], total: 0 });

      await issuedVoucherService.listUsages(adminSecurity, { page: 1, limit: 20 });
      expect(voucherUsageRepo.listUsages).toHaveBeenCalled();
    });

    it("rejects buyer", async () => {
      await expect(
        issuedVoucherService.listUsages(BUYER, { page: 1, limit: 20 })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("expireIssuedVouchers", () => {
    it("marks active vouchers past their expiry date as expired", async () => {
      vi.mocked(issuedVoucherRepo.expireExpiredVouchers).mockResolvedValue({ count: 3 });

      const count = await issuedVoucherService.expireIssuedVouchers(new Date("2026-08-17T12:00:00Z"));

      expect(count).toBe(3);
      const today = vi.mocked(issuedVoucherRepo.expireExpiredVouchers).mock.calls[0][0];
      expect(today).toBeInstanceOf(Date);
      expect(today.toISOString()).toBe("2026-08-17T00:00:00.000Z");
    });

    it("returns 0 when there is nothing to expire", async () => {
      vi.mocked(issuedVoucherRepo.expireExpiredVouchers).mockResolvedValue({ count: 0 });

      const count = await issuedVoucherService.expireIssuedVouchers();

      expect(count).toBe(0);
    });
  });
});
