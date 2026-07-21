import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    voucherProduct: {
      findMany: vi.fn(),
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
      deleteMany: vi.fn(),
    },
    partner: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));

import { prisma } from "../../config/prisma.js";
import * as voucherProductService from "../../services/voucher-product.service.js";
import type { UserRole } from "../../types/auth.types.js";

type CurrentUser = { id: string; role: UserRole; partnerId?: string };

const ADMIN_CONTENT: CurrentUser = { id: "u-admin", role: "admin_content" };
const PARTNER_OWNER: CurrentUser = { id: "u-owner", role: "partner_owner", partnerId: "p1" };
const OTHER_PARTNER: CurrentUser = { id: "u-other", role: "partner_owner", partnerId: "p2" };
const BUYER: CurrentUser = { id: "u-buyer", role: "buyer" };

function makeVoucher(overrides: Record<string, unknown> = {}) {
  return {
    id: "vp1", partner_id: "p1", name: "Voucher A", original_price: 100000,
    selling_price: 80000, discount_rate: 20, total_quantity: 100, remaining_quantity: 80,
    approval_status: "approved", status: "active", sale_start_date: "2026-01-01",
    sale_end_date: "2026-12-31", validity_days: 30, ...overrides,
  };
}

describe("Voucher Product Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listVoucherProducts", () => {
    it("returns paginated sellable vouchers", async () => {
      mockPrisma.$transaction.mockResolvedValue([[makeVoucher()], 1]);
      const result = await voucherProductService.listVoucherProducts({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });
  });

  describe("createVoucherProduct", () => {
    it("creates voucher for approved partner", async () => {
      const created = { ...makeVoucher(), approval_status: "pending", remaining_quantity: 100 };
      vi.mocked(prisma.voucherProduct.create).mockResolvedValue(created as any);

      const result = await voucherProductService.createVoucherProduct(PARTNER_OWNER, {
        name: "Voucher A", original_price: 100000, selling_price: 80000, total_quantity: 100,
      });
      expect(result.approval_status).toBe("pending");
      expect(result.remaining_quantity).toBe(100);
    });

    it("rejects if selling_price > original_price", async () => {
      await expect(
        voucherProductService.createVoucherProduct(PARTNER_OWNER, {
          name: "Voucher A", original_price: 50000, selling_price: 80000, total_quantity: 100,
        })
      ).rejects.toThrow(HttpError);
    });

    it("rejects if partner not approved (no partnerId on user)", async () => {
      const userNoPartner: CurrentUser = { id: "u-owner", role: "partner_owner" };
      vi.mocked(prisma.partner.findFirst).mockResolvedValue({
        id: "p1", approval_status: "pending", status: "active",
      } as any);

      await expect(
        voucherProductService.createVoucherProduct(userNoPartner, {
          name: "Voucher A", original_price: 100000, selling_price: 80000, total_quantity: 100,
        })
      ).rejects.toThrow(HttpError);
    });

    it("rejects if partner not found in DB", async () => {
      const userNoPartner: CurrentUser = { id: "u-ghost", role: "partner_owner" };
      vi.mocked(prisma.partner.findFirst).mockResolvedValue(null);

      await expect(
        voucherProductService.createVoucherProduct(userNoPartner, {
          name: "Voucher A", original_price: 100000, selling_price: 80000, total_quantity: 100,
        })
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
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ approval_status: "draft" }) as any);
      vi.mocked(prisma.voucherProduct.update).mockResolvedValue(makeVoucher({ approval_status: "pending" }) as any);

      const result = await voucherProductService.submitVoucherProduct(PARTNER_OWNER, "vp1");
      expect(result.approval_status).toBe("pending");
    });
  });

  describe("approveVoucherProduct", () => {
    it("approves voucher with admin id", async () => {
      vi.mocked(prisma.voucherProduct.update).mockResolvedValue(makeVoucher() as any);

      const result = await voucherProductService.approveVoucherProduct("u-admin", "vp1", "approved");
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
      vi.mocked(prisma.voucherProductBranch.create).mockResolvedValue({} as any);

      await voucherProductService.createVoucherBranch(PARTNER_OWNER, "vp1", "b1");
      expect(prisma.voucherProductBranch.create).toHaveBeenCalled();
    });

    it("deleteVoucherBranch", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.voucherProductBranch.deleteMany).mockResolvedValue({ count: 1 } as any);

      await voucherProductService.deleteVoucherBranch(PARTNER_OWNER, "vp1", "b1");
      expect(prisma.voucherProductBranch.deleteMany).toHaveBeenCalled();
    });
  });
});
