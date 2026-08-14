import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    voucherProduct: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    voucherProductImage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    voucherProductBranch: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    partner: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    partnerBranch: {
      findUnique: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));

vi.mock("../../services/notification.service.js", () => ({
  notifyVoucherApproved: vi.fn().mockResolvedValue(undefined),
  notifyVoucherRejected: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../../config/prisma.js";
import * as voucherProductService from "../../services/voucher-product.service.js";
import type { UserRole } from "../../types/auth.types.js";

type CurrentUser = { id: string; role: UserRole; partnerId?: string; branchId?: string };

const ADMIN_CONTENT: CurrentUser = { id: "u-admin", role: "admin_content" };
const PARTNER_OWNER: CurrentUser = { id: "u-owner", role: "partner_owner", partnerId: "p1" };
const VOUCHER_STAFF_WITH_BRANCH: CurrentUser = { id: "u-staff", role: "partner_voucher_staff", branchId: "b1" };
const OTHER_PARTNER: CurrentUser = { id: "u-other", role: "partner_owner", partnerId: "p2" };
const BUYER: CurrentUser = { id: "u-buyer", role: "buyer" };

function makeVoucher(overrides: Record<string, unknown> = {}) {
  return {
    id: "vp1", partner_id: "p1", name: "Voucher A", original_price: 100000,
    selling_price: 80000, discount_rate: 20, total_quantity: 100, remaining_quantity: 80,
    approval_status: "approved", status: "active", sale_start_date: "2026-01-01",
    sale_end_date: "2026-12-31", validity_days: 30, description: "Desc",
    category_id: "cat1", terms_and_conditions: ["Term"], submitted_at: null,
    partners: {
      business_name: "Partner A",
      representative_user: { email: "partner@test.com", full_name: "Partner Owner" },
    },
    ...overrides,
  };
}

function makeCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    category_id: "cat1",
    name: "Voucher A",
    description: "Desc",
    original_price: 100000,
    selling_price: 80000,
    total_quantity: 100,
    sale_start_date: "2026-01-01",
    sale_end_date: "2026-12-31",
    validity_days: 30,
    terms_and_conditions: ["Term"],
    ...overrides,
  };
}

describe("Voucher Product Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: "p1", approval_status: "approved", status: "active",
    } as any);
  });

  describe("listVoucherProducts", () => {
    it("returns paginated sellable vouchers", async () => {
      mockPrisma.$transaction.mockResolvedValue([[makeVoucher()], 1]);
      const result = await voucherProductService.listVoucherProducts(undefined, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });

    it("resolves mine scope partner from voucher staff branch", async () => {
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({ partner_id: "p1" } as any);
      mockPrisma.$transaction.mockResolvedValue([[makeVoucher({ status: "draft", approval_status: "pending" })], 1]);

      const result = await voucherProductService.listVoucherProducts(VOUCHER_STAFF_WITH_BRANCH, { page: 1, limit: 20, scope: "mine" });

      expect(result.items).toHaveLength(1);
      expect(prisma.partnerBranch.findUnique).toHaveBeenCalledWith({ where: { id: "b1" }, select: { partner_id: true } });
      expect(prisma.voucherProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ partner_id: "p1" }) })
      );
    });

    it("applies area filter through branch city relation", async () => {
      mockPrisma.$transaction.mockResolvedValue([[makeVoucher()], 1]);

      await voucherProductService.listVoucherProducts(undefined, {
        page: 1,
        limit: 20,
        area: "TP.HCM"
      });

      expect(prisma.voucherProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            voucher_product_branches: expect.objectContaining({
              some: expect.objectContaining({
                partner_branches: expect.objectContaining({
                  OR: expect.arrayContaining([
                    expect.objectContaining({
                      city: expect.objectContaining({ equals: "TP. Hồ Chí Minh", mode: "insensitive" })
                    })
                  ])
                })
              })
            })
          })
        })
      );
    });
  });

  describe("createVoucherProduct", () => {
    it("creates voucher for approved partner", async () => {
      const created = { ...makeVoucher(), approval_status: "pending", remaining_quantity: 100 };
      vi.mocked(prisma.voucherProduct.create).mockResolvedValue(created as any);

      const result = await voucherProductService.createVoucherProduct(PARTNER_OWNER, makeCreateInput());
      expect(result.approval_status).toBe("pending");
      expect(result.remaining_quantity).toBe(100);
      expect(prisma.voucherProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            partner_id: "p1",
            created_by: "u-owner",
            status: "draft",
            approval_status: "pending",
            submitted_at: null,
            sale_start_date: expect.any(Date),
            sale_end_date: expect.any(Date),
          }),
        })
      );
    });

    it("rejects if selling_price >= original_price", async () => {
      await expect(
        voucherProductService.createVoucherProduct(PARTNER_OWNER, makeCreateInput({ original_price: 50000, selling_price: 50000 }))
      ).rejects.toThrow(HttpError);
    });

    it("rejects invalid sale date before Prisma create", async () => {
      await expect(
        voucherProductService.createVoucherProduct(PARTNER_OWNER, makeCreateInput({ sale_start_date: "not-a-date" }))
      ).rejects.toThrow(HttpError);
      expect(prisma.voucherProduct.create).not.toHaveBeenCalled();
    });

    it("rejects if partner not approved (no partnerId on user)", async () => {
      const userNoPartner: CurrentUser = { id: "u-owner", role: "partner_owner" };
      vi.mocked(prisma.partner.findFirst).mockResolvedValue({
        id: "p1", approval_status: "pending", status: "active",
      } as any);

      await expect(
        voucherProductService.createVoucherProduct(userNoPartner, makeCreateInput())
      ).rejects.toThrow(HttpError);
    });

    it("rejects if partner not found in DB", async () => {
      const userNoPartner: CurrentUser = { id: "u-ghost", role: "partner_owner" };
      vi.mocked(prisma.partner.findFirst).mockResolvedValue(null);

      await expect(
        voucherProductService.createVoucherProduct(userNoPartner, makeCreateInput())
      ).rejects.toThrow(HttpError);
    });
  });

  describe("getVoucherProduct", () => {
    it("returns approved+active voucher to public", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);

      const result = await voucherProductService.getVoucherProduct(undefined, "vp1");
      expect(result.id).toBe("vp1");
    });

    it("returns draft voucher to owner", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ approval_status: "pending" }) as any);

      const result = await voucherProductService.getVoucherProduct(PARTNER_OWNER, "vp1");
      expect(result.approval_status).toBe("pending");
    });

    it("rejects draft voucher to public", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ approval_status: "pending" }) as any);

      await expect(voucherProductService.getVoucherProduct(undefined, "vp1")).rejects.toThrow(HttpError);
    });

    it("rejects draft voucher to non-owner", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ approval_status: "pending" }) as any);

      await expect(voucherProductService.getVoucherProduct(OTHER_PARTNER, "vp1")).rejects.toThrow(HttpError);
    });
  });

  describe("getPublicVoucherDetail", () => {
    it("allows approved sold-out vouchers but excludes draft vouchers", async () => {
      vi.mocked(prisma.voucherProduct.findFirst).mockResolvedValue(makeVoucher({ status: "sold_out" }) as any);
      vi.mocked(prisma.voucherProductBranch.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.review.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.review.aggregate).mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } } as any);

      const result = await voucherProductService.getPublicVoucherDetail("vp1");

      expect(result.voucher.id).toBe("vp1");
      expect(prisma.voucherProduct.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "vp1", approval_status: "approved", status: { in: ["active", "paused", "sold_out", "expired"] } },
      }));
    });
  });

  describe("updateVoucherProduct", () => {
    it("owner can update own voucher", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.voucherProduct.update).mockResolvedValue(makeVoucher({ name: "B" }) as any);

      await voucherProductService.updateVoucherProduct(PARTNER_OWNER, "vp1", { name: "B" });
      expect(prisma.voucherProduct.update).toHaveBeenCalled();
    });

    it("rejects updating other partner's voucher", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);

      await expect(voucherProductService.updateVoucherProduct(OTHER_PARTNER, "vp1", { name: "X" })).rejects.toThrow(HttpError);
    });

    it("admin_content cannot update voucher (allowAdminContent=false)", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);

      await expect(voucherProductService.updateVoucherProduct(ADMIN_CONTENT, "vp1", { name: "B" })).rejects.toThrow(HttpError);
    });

    it("admin_content can get voucher detail (allowAdminContent=true by default)", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ approval_status: "pending" }) as any);

      const result = await voucherProductService.getVoucherProduct(ADMIN_CONTENT, "vp1");
      expect(result.approval_status).toBe("pending");
    });
  });

  describe("deleteVoucherProduct", () => {
    it("owner can pause own voucher", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.voucherProduct.update).mockResolvedValue(makeVoucher({ status: "paused" }) as any);

      await voucherProductService.deleteVoucherProduct(PARTNER_OWNER, "vp1");
      expect(prisma.voucherProduct.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "paused" }) })
      );
    });
  });

  describe("submitVoucherProduct", () => {
    it("owner can submit own voucher", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ status: "draft", approval_status: "pending", submitted_at: null }) as any);
      vi.mocked(prisma.voucherProductBranch.count).mockResolvedValue(1);
      vi.mocked(prisma.voucherProduct.update).mockResolvedValue(makeVoucher({ status: "draft", approval_status: "pending", submitted_at: new Date() }) as any);

      const result = await voucherProductService.submitVoucherProduct(PARTNER_OWNER, "vp1");
      expect(result.approval_status).toBe("pending");
      expect(result.workflow_status).toBe("pending_approval");
      expect(prisma.voucherProduct.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ submitted_by: "u-owner", approved_by: null, approved_at: null }),
        })
      );
    });

    it("rejects submitting voucher without branch", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ status: "draft", approval_status: "pending", submitted_at: null }) as any);
      vi.mocked(prisma.voucherProductBranch.count).mockResolvedValue(0);

      await expect(voucherProductService.submitVoucherProduct(PARTNER_OWNER, "vp1")).rejects.toThrow(HttpError);
    });

    it("rejects submitting rejected voucher", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({
        status: "draft",
        approval_status: "rejected",
        approved_by: "u-admin",
        approved_at: new Date(),
      }) as any);
      await expect(voucherProductService.submitVoucherProduct(PARTNER_OWNER, "vp1")).rejects.toThrow(HttpError);
      expect(prisma.voucherProduct.update).not.toHaveBeenCalled();
    });

    it("rejects submitting voucher with invalid status", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ status: "active", approval_status: "pending", submitted_at: null }) as any);

      await expect(voucherProductService.submitVoucherProduct(PARTNER_OWNER, "vp1")).rejects.toThrow(HttpError);
      expect(prisma.voucherProduct.update).not.toHaveBeenCalled();
    });
  });

  describe("approveVoucherProduct", () => {
    it("approves voucher with admin id", async () => {
      mockPrisma.voucherProduct.findUnique.mockResolvedValue(
        makeVoucher({ approval_status: "pending" }) as any
      );
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: never) => Promise<unknown>) => {
        return fn({
          voucherProduct: { update: vi.fn().mockResolvedValue(makeVoucher({ approval_status: "approved" })) },
          adminLog: { create: vi.fn() },
        } as never);
      });

      const result = await voucherProductService.approveVoucherProduct("u-admin", "vp1", { approval_status: "approved" });
      expect(result.approval_status).toBe("approved");
    });
  });

  describe("updateVoucherStatus", () => {
    it("owner can publish approved voucher", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.voucherProduct.update).mockResolvedValue(makeVoucher() as any);

      const result = await voucherProductService.updateVoucherStatus(PARTNER_OWNER, "vp1", "active");
      expect(result.status).toBe("active");
    });

    it("cannot activate unapproved voucher", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ approval_status: "pending" }) as any);

      await expect(voucherProductService.updateVoucherStatus(PARTNER_OWNER, "vp1", "active")).rejects.toThrow(HttpError);
    });

    it("rejects status update by non-owner", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);

      await expect(voucherProductService.updateVoucherStatus(OTHER_PARTNER, "vp1", "paused")).rejects.toThrow(HttpError);
    });
  });

  describe("voucher images", () => {
    it("listVoucherImages", async () => {
      vi.mocked(prisma.voucherProductImage.findMany).mockResolvedValue([{ id: "img1" }] as any);
      const result = await voucherProductService.listVoucherImages("vp1");
      expect(result).toHaveLength(1);
    });

    it("createVoucherImage", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.voucherProductImage.create).mockResolvedValue({ id: "img1" } as any);

      await voucherProductService.createVoucherImage(PARTNER_OWNER, "vp1", { url: "http://img.jpg" });
      expect(prisma.voucherProductImage.create).toHaveBeenCalled();
    });

    it("rejects image creation by non-owner", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      await expect(voucherProductService.createVoucherImage(OTHER_PARTNER, "vp1", { url: "x" })).rejects.toThrow(HttpError);
    });

    it("deleteVoucherImage", async () => {
      vi.mocked(prisma.voucherProductImage.findUnique).mockResolvedValue({
        id: "img1", voucher_products: makeVoucher(),
      } as any);
      vi.mocked(prisma.voucherProductImage.delete).mockResolvedValue({} as any);

      await voucherProductService.deleteVoucherImage(PARTNER_OWNER, "img1");
      expect(prisma.voucherProductImage.delete).toHaveBeenCalled();
    });
  });

  describe("voucher branches", () => {
    it("listVoucherBranches", async () => {
      vi.mocked(prisma.voucherProductBranch.findMany).mockResolvedValue([{ branch_id: "b1" }] as any);
      const result = await voucherProductService.listVoucherBranches("vp1");
      expect(result).toHaveLength(1);
    });

    it("createVoucherBranch", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({ partner_id: "p1", is_active: true } as any);
      vi.mocked(prisma.voucherProductBranch.create).mockResolvedValue({} as any);

      await voucherProductService.createVoucherBranch(PARTNER_OWNER, "vp1", "b1");
      expect(prisma.voucherProductBranch.create).toHaveBeenCalled();
    });

    it("rejects assigning branch from another partner", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({ partner_id: "p2", is_active: true } as any);

      await expect(voucherProductService.createVoucherBranch(PARTNER_OWNER, "vp1", "b1")).rejects.toThrow(HttpError);
    });

    it("deleteVoucherBranch", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.voucherProductBranch.deleteMany).mockResolvedValue({ count: 1 } as any);

      await voucherProductService.deleteVoucherBranch(PARTNER_OWNER, "vp1", "b1");
      expect(prisma.voucherProductBranch.deleteMany).toHaveBeenCalled();
    });
  });
});
