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
      groupBy: vi.fn(),
      aggregate: vi.fn(),
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
    issuedVoucher: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    partner: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    partnerBranch: {
      findUnique: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));

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
      mockPrisma.voucherProduct.findMany.mockResolvedValue([makeVoucher()]);
      mockPrisma.voucherProduct.count.mockResolvedValue(1);
      const result = await voucherProductService.listVoucherProducts(undefined, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });

    it("only returns approved+active vouchers already on sale", async () => {
      mockPrisma.voucherProduct.findMany.mockResolvedValue([makeVoucher()]);
      mockPrisma.voucherProduct.count.mockResolvedValue(1);

      const result = await voucherProductService.listVoucherProducts(undefined, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(prisma.voucherProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            approval_status: "approved",
            status: "active",
            remaining_quantity: { gt: 0 },
            sale_start_date: expect.objectContaining({ lte: expect.any(Date) }),
            sale_end_date: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        })
      );
    });

    it("resolves mine scope partner from voucher staff branch", async () => {
      vi.mocked(prisma.partnerBranch.findUnique).mockResolvedValue({ partner_id: "p1" } as any);
      mockPrisma.voucherProduct.findMany.mockResolvedValue([makeVoucher({ status: "draft", approval_status: "pending" })]);
      mockPrisma.voucherProduct.count.mockResolvedValue(1);

      const result = await voucherProductService.listVoucherProducts(VOUCHER_STAFF_WITH_BRANCH, { page: 1, limit: 20, scope: "mine" });

      expect(result.items).toHaveLength(1);
      expect(prisma.partnerBranch.findUnique).toHaveBeenCalledWith({ where: { id: "b1" }, select: { partner_id: true } });
      expect(prisma.voucherProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ partner_id: "p1" }) })
      );
    });

    it("returns only pending approval vouchers for approval_status=pending", async () => {
      mockPrisma.voucherProduct.findMany.mockResolvedValue([makeVoucher({ status: "draft", approval_status: "pending", submitted_at: new Date() })]);
      mockPrisma.voucherProduct.count.mockResolvedValue(1);

      const result = await voucherProductService.listVoucherProducts(ADMIN_CONTENT, { page: 1, limit: 20, approval_status: "pending" });

      expect(result.items).toHaveLength(1);
      expect(prisma.voucherProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            approval_status: "pending",
          }),
        })
      );
    });

    it("returns approved vouchers for approval_status=approved without sellable filters", async () => {
      mockPrisma.voucherProduct.findMany.mockResolvedValue([makeVoucher({ status: "active", approval_status: "approved" })]);
      mockPrisma.voucherProduct.count.mockResolvedValue(1);

      const result = await voucherProductService.listVoucherProducts(ADMIN_CONTENT, { page: 1, limit: 20, approval_status: "approved" });

      expect(result.items).toHaveLength(1);
      expect(prisma.voucherProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            approval_status: "approved",
          }),
        })
      );
      const findManyCall = vi.mocked(prisma.voucherProduct.findMany).mock.calls[0];
      expect(findManyCall).toBeDefined();
      const where = findManyCall![0]!.where as Record<string, unknown>;
      expect(where.status).toBeUndefined();
      expect(where.remaining_quantity).toBeUndefined();
      expect(where.sale_start_date).toBeUndefined();
      expect(where.sale_end_date).toBeUndefined();
    });

    it("applies area filter through branch city relation", async () => {
      mockPrisma.voucherProduct.findMany.mockResolvedValue([makeVoucher()]);
      mockPrisma.voucherProduct.count.mockResolvedValue(1);

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

  describe("getPublicHomepageSummary", () => {
    it("returns aggregate counts for public homepage data", async () => {
      mockPrisma.voucherProduct.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(8);
      mockPrisma.partner.count.mockResolvedValue(4);
      mockPrisma.user.count.mockResolvedValue(8);
      mockPrisma.voucherProduct.groupBy.mockResolvedValue([
        { category_id: "cat1", _count: { category_id: 7 } },
        { category_id: "cat2", _count: { category_id: 5 } },
      ]);
      mockPrisma.voucherProduct.aggregate.mockResolvedValue({ _max: { discount_rate: 42.4 } });

      const result = await voucherProductService.getPublicHomepageSummary();

      expect(result).toEqual({
        vouchers: 12,
        partners: 4,
        customers: 8,
        max_discount: 42,
        category_counts: [
          { category_id: "cat1", count: 7 },
          { category_id: "cat2", count: 5 },
        ],
      });
      expect(prisma.voucherProduct.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          approval_status: "approved",
          status: "active",
          remaining_quantity: { gt: 0 },
          sale_start_date: expect.objectContaining({ lte: expect.any(Date) }),
          sale_end_date: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      });
      expect(prisma.partner.count).toHaveBeenCalledWith({
        where: { approval_status: "approved", status: "active" },
      });
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { role: "buyer", is_active: true },
      });
      expect(prisma.voucherProduct.groupBy).toHaveBeenCalledWith({
        by: ["category_id"],
        where: expect.objectContaining({
          approval_status: "approved",
          status: "active",
          remaining_quantity: { gt: 0 },
          sale_start_date: expect.objectContaining({ lte: expect.any(Date) }),
          sale_end_date: expect.objectContaining({ gte: expect.any(Date) }),
        }),
        orderBy: { category_id: "asc" },
        _count: { category_id: true },
      });
      expect(prisma.voucherProduct.aggregate).toHaveBeenCalledWith({
        where: expect.objectContaining({
          approval_status: "approved",
          status: "active",
          remaining_quantity: { gt: 0 },
          sale_start_date: expect.objectContaining({ lte: expect.any(Date) }),
          sale_end_date: expect.objectContaining({ gte: expect.any(Date) }),
        }),
        _max: { discount_rate: true },
      });
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

    it("maps raw active voucher past sale end to expired workflow", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ sale_end_date: "2020-01-01" }) as any);

      const result = await voucherProductService.getVoucherProduct(PARTNER_OWNER, "vp1");

      expect(result.workflow_status).toBe("expired");
      expect(result.workflow_label).toBe("Hết hạn");
    });

    it("does not treat raw active voucher past sale end as public active", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ sale_end_date: "2020-01-01" }) as any);

      await expect(voucherProductService.getVoucherProduct(undefined, "vp1")).rejects.toThrow(HttpError);
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

    it("locks raw active voucher past sale end as expired", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ sale_end_date: "2020-01-01" }) as any);

      await expect(voucherProductService.updateVoucherProduct(PARTNER_OWNER, "vp1", { name: "B" })).rejects.toThrow(HttpError);
      expect(prisma.voucherProduct.update).not.toHaveBeenCalled();
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
      const update = vi.fn().mockResolvedValue(makeVoucher({ approval_status: "approved", status: "active" }));
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: never) => Promise<unknown>) => {
        return fn({
          voucherProduct: { update },
          adminLog: { create: vi.fn() },
        } as never);
      });

      const result = await voucherProductService.approveVoucherProduct("u-admin", "vp1", { approval_status: "approved" });
      expect(result.approval_status).toBe("approved");
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ approval_status: "approved", status: "active" }),
        })
      );
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

  describe("generateVoucherTestCode", () => {
    it("generates a VC- code using the real voucher code logic and stores a test record", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.issuedVoucher.create).mockResolvedValue({} as any);
      vi.mocked(prisma.issuedVoucher.deleteMany).mockResolvedValue({ count: 0 } as any);

      const result = await voucherProductService.generateVoucherTestCode(PARTNER_OWNER, "vp1");

      expect(result.test_code).toMatch(/^VC\d+\d{6}$/);
      expect(result.qr_code_payload).toBe(result.test_code);
      expect(result.voucher.id).toBe("vp1");
      expect(prisma.issuedVoucher.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ voucher_code: result.test_code, qr_code_payload: result.test_code, voucher_product_id: "vp1", status: "active", is_test: true }),
        })
      );
      expect(prisma.voucherProduct.update).not.toHaveBeenCalled();
      expect(prisma.voucherProduct.create).not.toHaveBeenCalled();
    });

    it("allows generating a test code for a voucher not yet on sale", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ sale_start_date: "2099-01-01" }) as any);
      vi.mocked(prisma.issuedVoucher.create).mockResolvedValue({} as any);
      vi.mocked(prisma.issuedVoucher.deleteMany).mockResolvedValue({ count: 0 } as any);

      const result = await voucherProductService.generateVoucherTestCode(PARTNER_OWNER, "vp1");

      expect(result.test_code).toMatch(/^VC\d+\d{6}$/);
      expect(prisma.issuedVoucher.create).toHaveBeenCalled();
    });

    it("rejects generating test code for an unapproved voucher", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ approval_status: "pending" }) as any);

      await expect(voucherProductService.generateVoucherTestCode(PARTNER_OWNER, "vp1")).rejects.toThrow(HttpError);
      expect(prisma.issuedVoucher.create).not.toHaveBeenCalled();
    });

    it("rejects generating test code for a paused voucher", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ status: "paused" }) as any);

      await expect(voucherProductService.generateVoucherTestCode(PARTNER_OWNER, "vp1")).rejects.toThrow(HttpError);
    });

    it("rejects generating test code for an out-of-stock voucher", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ remaining_quantity: 0 }) as any);

      await expect(voucherProductService.generateVoucherTestCode(PARTNER_OWNER, "vp1")).rejects.toThrow(HttpError);
    });

    it("rejects generating test code by non-owner", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);

      await expect(voucherProductService.generateVoucherTestCode(OTHER_PARTNER, "vp1")).rejects.toThrow(HttpError);
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
