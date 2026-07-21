import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";
import type { AuthUser } from "../../types/auth.types.js";

vi.mock("../../repositories/issued-voucher.repository.js", () => ({
  listIssuedVouchers: vi.fn(),
  findIssuedVoucherById: vi.fn(),
  findIssuedVoucherByCode: vi.fn(),
  findIssuedVoucherByQrPayload: vi.fn(),
  updateIssuedVoucherStatus: vi.fn(),
  findEligibleBranchIds: vi.fn(),
}));

vi.mock("../../repositories/voucher-usage.repository.js", () => ({
  createVoucherUsage: vi.fn(),
  listUsagesByIssuedVoucher: vi.fn(),
  listUsages: vi.fn(),
}));

import * as issuedVoucherRepo from "../../repositories/issued-voucher.repository.js";
import * as voucherUsageRepo from "../../repositories/voucher-usage.repository.js";
import * as issuedVoucherService from "../../services/issued-voucher.service.js";

const BUYER: AuthUser = { id: "u-buyer", email: "b@test.com", role: "buyer" };
const PARTNER_OWNER: AuthUser = { id: "u-partner", email: "p@test.com", role: "partner_owner", partnerId: "partner-1" };
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
        expect.objectContaining({ ownerId: "u-buyer" })
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
      vi.mocked(issuedVoucherRepo.updateIssuedVoucherStatus).mockResolvedValue({ ...voucher, status: "refunded" });

      const result = await issuedVoucherService.updateIssuedVoucherStatus(ADMIN, "iv-1", { status: "refunded" });
      expect(result.status).toBe("refunded");
    });

    it("rejects non-admin users", async () => {
      await expect(
        issuedVoucherService.updateIssuedVoucherStatus(BUYER, "iv-1", { status: "refunded" })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("validateVoucher", () => {
    it("returns voucher info for valid code", async () => {
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);

      const result = await issuedVoucherService.validateVoucher(STORE_STAFF, { voucher_code: "VC-001" });
      expect(result.redeemable).toBe(true);
      expect(result.eligible_branch_ids).toEqual(["branch-1"]);
    });

    it("rejects if not partner staff or admin", async () => {
      await expect(
        issuedVoucherService.validateVoucher(BUYER, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);
    });

    it("returns redeemable=false for used voucher", async () => {
      const voucher = makeIssuedVoucher({ status: "used" });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue([]);

      const result = await issuedVoucherService.validateVoucher(PARTNER_OWNER, { voucher_code: "VC-001" });
      expect(result.redeemable).toBe(false);
    });

    it("returns redeemable=false for expired voucher", async () => {
      const voucher = makeIssuedVoucher({ expired_date: "2020-01-01" });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue([]);

      const result = await issuedVoucherService.validateVoucher(PARTNER_OWNER, { voucher_code: "VC-001" });
      expect(result.redeemable).toBe(false);
    });

    it("rejects partner validating voucher from another partner", async () => {
      const otherPartner: AuthUser = { id: "u-other", email: "o@test.com", role: "partner_owner", partnerId: "partner-2" };
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherByCode).mockResolvedValue(voucher);

      await expect(
        issuedVoucherService.validateVoucher(otherPartner, { voucher_code: "VC-001" })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("redeemVoucher", () => {
    it("redeems active voucher successfully", async () => {
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);
      vi.mocked(voucherUsageRepo.createVoucherUsage).mockResolvedValue({
        id: "usage-1", issued_voucher_id: "iv-1", branch_id: "branch-1",
        redeemed_by: "u-staff", redemption_code: "RED-001", used_at: new Date().toISOString(), note: null,
      });
      vi.mocked(issuedVoucherRepo.updateIssuedVoucherStatus).mockResolvedValue({ ...voucher, status: "used" });

      const result = await issuedVoucherService.redeemVoucher(STORE_STAFF, "iv-1", { branch_id: "branch-1" });
      expect(result.issued_voucher.status).toBe("used");
      expect(result.usage).toBeDefined();
    });

    it("rejects if already used (409)", async () => {
      const voucher = makeIssuedVoucher({ status: "used" });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);

      await expect(
        issuedVoucherService.redeemVoucher(STORE_STAFF, "iv-1", { branch_id: "branch-1" })
      ).rejects.toThrow(HttpError);
    });

    it("rejects if expired (422)", async () => {
      const voucher = makeIssuedVoucher({ expired_date: "2020-01-01" });
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);

      await expect(
        issuedVoucherService.redeemVoucher(STORE_STAFF, "iv-1", { branch_id: "branch-1" })
      ).rejects.toThrow(HttpError);
    });

    it("rejects store_staff at wrong branch", async () => {
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1", "branch-2"]);

      await expect(
        issuedVoucherService.redeemVoucher(STORE_STAFF, "iv-1", { branch_id: "branch-2" })
      ).rejects.toThrow(HttpError);
    });

    it("rejects if branch not in eligible list", async () => {
      const voucher = makeIssuedVoucher();
      vi.mocked(issuedVoucherRepo.findIssuedVoucherById).mockResolvedValue(voucher);
      vi.mocked(issuedVoucherRepo.findEligibleBranchIds).mockResolvedValue(["branch-1"]);

      await expect(
        issuedVoucherService.redeemVoucher(PARTNER_OWNER, "iv-1", { branch_id: "branch-99" })
      ).rejects.toThrow(HttpError);
    });

    it("rejects non-partner-staff user", async () => {
      await expect(
        issuedVoucherService.redeemVoucher(ADMIN, "iv-1", { branch_id: "branch-1" })
      ).rejects.toThrow(HttpError);
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
});
