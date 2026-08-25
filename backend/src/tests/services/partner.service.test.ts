import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";

const { mockPrisma, mockTx } = vi.hoisted(() => ({
  mockPrisma: {
    partner: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    partnerBranch: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    voucherProductBranch: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockTx: {} as Record<string, unknown>,
}));

vi.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));

import { prisma } from "../../config/prisma.js";
import * as partnerService from "../../services/partner.service.js";
import type { UserRole } from "../../types/auth.types.js";

type CurrentUser = { id: string; role: UserRole; partnerId?: string; branchId?: string };

const ADMIN: CurrentUser = { id: "u-admin", role: "admin_operations" };
const PARTNER_OWNER: CurrentUser = { id: "u-owner", role: "partner_owner", partnerId: "p1" };
const STAFF: CurrentUser = { id: "u-staff", role: "partner_store_staff", partnerId: "p1", branchId: "b1" };
const BUYER: CurrentUser = { id: "u-buyer", role: "buyer" };

describe("Partner Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.voucherProductBranch.count.mockResolvedValue(0);
  });

  describe("listPartners", () => {
    it("returns paginated partners", async () => {
      mockPrisma.$transaction.mockResolvedValue([[{ id: "p1", business_name: "A" }], 1]);

      const result = await partnerService.listPartners({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it("filters by approval_status", async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await partnerService.listPartners({ page: 1, limit: 20, approval_status: "pending" });
      expect(mockPrisma.partner.findMany).toHaveBeenCalled();
    });
  });

  describe("createPartner", () => {
    it("creates partner with pending status", async () => {
      vi.mocked(prisma.partner.create).mockResolvedValue({
        id: "p1", representative_user_id: "u-owner", approval_status: "pending", status: "active",
      } as any);

      const result = await partnerService.createPartner(PARTNER_OWNER, { business_name: "A" });
      expect(result.approval_status).toBe("pending");
      expect(result.status).toBe("active");
    });

    it("admin can create partner with different representative", async () => {
      vi.mocked(prisma.partner.create).mockResolvedValue({
        id: "p1", representative_user_id: "u-other", approval_status: "pending", status: "active",
      } as any);

      await partnerService.createPartner(ADMIN, { business_name: "A", representative_user_id: "u-other" });
      expect(prisma.partner.create).toHaveBeenCalled();
    });
  });

  describe("getPartnerById", () => {
    it("returns partner for owner", async () => {
      vi.mocked(prisma.partner.findUnique).mockResolvedValue({
        id: "p1", representative_user_id: "u-owner", business_name: "A",
      } as any);

      const result = await partnerService.getPartnerById(PARTNER_OWNER, "p1");
      expect(result.id).toBe("p1");
    });

    it("returns partner for admin", async () => {
      vi.mocked(prisma.partner.findUnique).mockResolvedValue({
        id: "p1", representative_user_id: "u-other", business_name: "A",
      } as any);

      await partnerService.getPartnerById(ADMIN, "p1");
      expect(prisma.partner.findUnique).toHaveBeenCalled();
    });

    it("rejects non-owner non-admin", async () => {
      vi.mocked(prisma.partner.findUnique).mockResolvedValue({
        id: "p1", representative_user_id: "u-owner", business_name: "A",
      } as any);

      await expect(partnerService.getPartnerById(BUYER, "p1")).rejects.toThrow(HttpError);
    });
  });

  describe("updatePartner", () => {
    it("owner can update own partner", async () => {
      vi.mocked(prisma.partner.findUnique).mockResolvedValue({
        id: "p1", representative_user_id: "u-owner",
      } as any);
      vi.mocked(prisma.partner.update).mockResolvedValue({ id: "p1", business_name: "B" } as any);

      await partnerService.updatePartner(PARTNER_OWNER, "p1", { business_name: "B" });
      expect(prisma.partner.update).toHaveBeenCalled();
    });

    it("rejects owner updating other partner", async () => {
      vi.mocked(prisma.partner.findUnique).mockResolvedValue({
        id: "p1", representative_user_id: "u-other",
      } as any);

      await expect(partnerService.updatePartner(PARTNER_OWNER, "p1", { business_name: "B" })).rejects.toThrow(HttpError);
    });
  });

  describe("deletePartner", () => {
    it("sets partner status to closed", async () => {
      vi.mocked(prisma.partner.update).mockResolvedValue({} as any);

      await partnerService.deletePartner("p1");
      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { status: "closed", updated_at: expect.any(Date) },
      });
    });
  });

  describe("updatePartnerApproval", () => {
    it("admin can approve partner", async () => {
      vi.mocked(prisma.partner.update).mockResolvedValue({
        id: "p1", approval_status: "approved", approved_by: "u-admin",
      } as any);

      const result = await partnerService.updatePartnerApproval("u-admin", "p1", "approved");
      expect(result.approval_status).toBe("approved");
      expect(result.approved_by).toBe("u-admin");
    });
  });

  describe("updatePartnerStatus", () => {
    it("updates partner status", async () => {
      vi.mocked(prisma.partner.update).mockResolvedValue({ id: "p1", status: "suspended" } as any);

      await partnerService.updatePartnerStatus("p1", "suspended");
      expect(prisma.partner.update).toHaveBeenCalled();
    });
  });

  describe("listBranches", () => {
    it("returns branches for partner owner", async () => {
      vi.mocked(prisma.partner.findUnique).mockResolvedValue({
        id: "p1", representative_user_id: "u-owner",
      } as any);
      vi.mocked(prisma.partnerBranch.findMany).mockResolvedValue([{ id: "b1", partner_id: "p1" }] as any);

      const result = await partnerService.listBranches(PARTNER_OWNER, "p1");
      expect(result).toHaveLength(1);
    });

    it("store_staff can list branches of own partner", async () => {
      vi.mocked(prisma.partner.findUnique).mockResolvedValue({
        id: "p1", representative_user_id: "u-owner",
      } as any);
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({
        id: "b1", partner_id: "p1",
      } as any);
      vi.mocked(prisma.partnerBranch.findMany).mockResolvedValue([] as any);

      await partnerService.listBranches(STAFF, "p1");
      expect(prisma.partnerBranch.findMany).toHaveBeenCalled();
    });

    it("store_staff cannot list branches of other partner", async () => {
      vi.mocked(prisma.partner.findUnique).mockResolvedValue({
        id: "p2", representative_user_id: "u-other",
      } as any);
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({
        id: "b1", partner_id: "p1",
      } as any);

      await expect(partnerService.listBranches(STAFF, "p2")).rejects.toThrow(HttpError);
    });
  });

  describe("createBranch", () => {
    it("owner can create branch", async () => {
      vi.mocked(prisma.partner.findUnique).mockResolvedValue({
        id: "p1", representative_user_id: "u-owner",
      } as any);
      vi.mocked(prisma.partnerBranch.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.partnerBranch.create).mockResolvedValue({ id: "b2", partner_id: "p1" } as any);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{
          lat: "10.762622",
          lon: "106.660172",
          address: { road: "Test Street", city: "HCM" },
        }],
      }));

      const result = await partnerService.createBranch(PARTNER_OWNER, "p1", {
        branch_name: "Branch 2",
        address: "123 Test Street",
        city: "HCM",
      });
      expect(result.partner_id).toBe("p1");
    });

    it("rejects non-owner creating branch", async () => {
      vi.mocked(prisma.partner.findUnique).mockResolvedValue({
        id: "p1", representative_user_id: "u-other",
      } as any);

      await expect(partnerService.createBranch(BUYER, "p1", { branch_name: "X", address: "123 Test", city: "HCM" })).rejects.toThrow(HttpError);
    });
  });

  describe("getBranchById", () => {
    it("returns branch for owner", async () => {
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({
        id: "b1", partner_id: "p1", partners: { representative_user_id: "u-owner" },
      } as any);

      const result = await partnerService.getBranchById(PARTNER_OWNER, "b1");
      expect(result.id).toBe("b1");
    });

    it("store_staff can get own branch", async () => {
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({
        id: "b1", partner_id: "p1", partners: { representative_user_id: "u-owner" },
      } as any);

      await partnerService.getBranchById(STAFF, "b1");
      expect(prisma.partnerBranch.findUnique).toHaveBeenCalled();
    });

    it("store_staff cannot get other branch", async () => {
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({
        id: "b2", partner_id: "p1", partners: { representative_user_id: "u-owner" },
      } as any);

      const otherStaff: CurrentUser = { id: "u-staff2", role: "partner_store_staff", partnerId: "p1", branchId: "b1" };
      await expect(partnerService.getBranchById(otherStaff, "b2")).rejects.toThrow(HttpError);
    });
  });

  describe("updateBranch", () => {
    it("rejects deactivation when branch is attached to active vouchers", async () => {
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({
        id: "b1", partner_id: "p1", is_active: true, partners: { representative_user_id: "u-owner" },
      } as any);
      vi.mocked(prisma.voucherProductBranch.count).mockResolvedValue(1);

      await expect(partnerService.updateBranch(PARTNER_OWNER, "b1", { is_active: false })).rejects.toMatchObject({
        statusCode: 409,
        code: "BRANCH_HAS_ACTIVE_VOUCHERS",
      });
      expect(prisma.partnerBranch.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteBranch", () => {
    it("owner can deactivate own branch", async () => {
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({
        id: "b1", partner_id: "p1", is_active: true, partners: { representative_user_id: "u-owner" },
      } as any);
      vi.mocked(prisma.partnerBranch.update).mockResolvedValue({} as any);

      await partnerService.deleteBranch(PARTNER_OWNER, "b1");
      expect(prisma.voucherProductBranch.count).toHaveBeenCalledWith({
        where: {
          branch_id: "b1",
          voucher_products: { status: "active" },
        },
      });
      expect(prisma.partnerBranch.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: { is_active: false },
      });
    });

    it("rejects deactivation when branch is attached to active vouchers", async () => {
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({
        id: "b1", partner_id: "p1", is_active: true, partners: { representative_user_id: "u-owner" },
      } as any);
      vi.mocked(prisma.voucherProductBranch.count).mockResolvedValue(1);

      await expect(partnerService.deleteBranch(PARTNER_OWNER, "b1")).rejects.toMatchObject({
        statusCode: 409,
        code: "BRANCH_HAS_ACTIVE_VOUCHERS",
      });
      expect(prisma.partnerBranch.update).not.toHaveBeenCalled();
    });
  });
});
