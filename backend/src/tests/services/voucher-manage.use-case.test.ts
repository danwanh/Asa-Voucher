/**
 * Use Case: "Quản lý Voucher" — Full unit tests
 *
 * Main Flow — List, Detail, Update (sold/used preservation + updatedBy)
 * A2       — Unauthorized / Forbidden
 * A5       — Not Found
 * A10      — Field Locking (status-based edit restrictions)
 * A13      — Validation Failures
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    voucherProduct: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
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
    $transaction: vi.fn(),
  },
}));

vi.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));

import * as svc from "../../services/voucher-product.service.js";
import type { UserRole } from "../../types/auth.types.js";

type CU = { id: string; role: UserRole; partnerId?: string; branchId?: string };

const PARTNER_A: CU = { id: "owner-a", role: "partner_owner", partnerId: "partner-a" };
const PARTNER_B: CU = { id: "owner-b", role: "partner_owner", partnerId: "partner-b" };
const STAFF_A: CU = { id: "staff-a", role: "partner_voucher_staff", branchId: "branch-a1" };
const ADMIN_C: CU = { id: "admin-c", role: "admin_content" };
const BUYER: CU = { id: "buyer-1", role: "buyer" };
const ADMIN_OPS: CU = { id: "admin-o", role: "admin_operations" };

const APPROVED_PARTNER = { id: "partner-a", approval_status: "approved", status: "active" };

function vp(overrides: Record<string, unknown> = {}) {
  return {
    id: "vp-1", partner_id: "partner-a", category_id: "cat-1",
    name: "Voucher A", description: "Test",
    original_price: 100000, selling_price: 80000, discount_rate: 20,
    total_quantity: 100, remaining_quantity: 80,
    status: "active", approval_status: "approved",
    sale_start_date: "2026-01-01", sale_end_date: "2026-12-31",
    validity_days: 30, terms_and_conditions: ["T&C"],
    submitted_at: null, submitted_by: null,
    approved_by: null, approved_at: null, updated_by: null,
    created_at: new Date("2026-01-01"), updated_at: new Date("2026-01-01"),
    partners: { business_name: "Highlands" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.partner.findUnique.mockResolvedValue(APPROVED_PARTNER as any);
  mockPrisma.partner.findFirst.mockResolvedValue(APPROVED_PARTNER as any);
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FLOW — List, Detail, Update
// ═══════════════════════════════════════════════════════════════════════════════
describe("Main Flow — Xem danh sach", () => {
  it("public sees only approved+active vouchers", async () => {
    mockPrisma.$transaction.mockResolvedValue([[vp()], 1]);
    const result = await svc.listVoucherProducts(undefined, { page: 1, limit: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.count).toBe(1);
    expect(mockPrisma.voucherProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ approval_status: "approved", status: "active" }),
      })
    );
  });

  it("partner_owner with scope=mine sees all own vouchers", async () => {
    mockPrisma.$transaction.mockResolvedValue([
      [vp({ status: "draft", approval_status: "pending" }), vp()],
      2,
    ]);
    const result = await svc.listVoucherProducts(PARTNER_A, { page: 1, limit: 20, scope: "mine" });
    expect(result.items).toHaveLength(2);
    expect(mockPrisma.voucherProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ partner_id: "partner-a" }) })
    );
  });

  it("supports search filter", async () => {
    mockPrisma.$transaction.mockResolvedValue([[vp({ name: "Highlands" })], 1]);
    await svc.listVoucherProducts(undefined, { page: 1, limit: 20, search: "Highlands" });
    expect(mockPrisma.voucherProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: { contains: "Highlands", mode: "insensitive" } }),
      })
    );
  });

  it("voucher_staff with scope=mine resolves partner via branch", async () => {
    vi.mocked(mockPrisma.partnerBranch.findUnique).mockResolvedValue({ partner_id: "partner-a" } as any);
    mockPrisma.$transaction.mockResolvedValue([[vp()], 1]);
    const result = await svc.listVoucherProducts(STAFF_A, { page: 1, limit: 20, scope: "mine" });
    expect(result.items).toHaveLength(1);
  });
});

describe("Main Flow — Xem chi tiet", () => {
  it("returns detail with workflow_status", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp() as any);
    const result = await svc.getVoucherProduct(PARTNER_A, "vp-1");
    expect(result.id).toBe("vp-1");
    expect(result.workflow_status).toBe("active");
  });

  it("public can view approved+active voucher", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp() as any);
    const result = await svc.getVoucherProduct(undefined, "vp-1");
    expect(result.id).toBe("vp-1");
  });
});

describe("Main Flow — Chinh sua & Cap nhat", () => {
  it("owner updates own voucher and sets updated_by", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp() as any);
    vi.mocked(mockPrisma.voucherProduct.update).mockResolvedValue(
      vp({ name: "Updated", updated_by: "owner-a" }) as any
    );
    const result = await svc.updateVoucherProduct(PARTNER_A, "vp-1", { name: "Updated" });
    expect(result.name).toBe("Updated");
    expect(mockPrisma.voucherProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ updated_by: "owner-a", updated_at: expect.any(Date) }),
      })
    );
  });

  it("preserves soldQuantity when total_quantity changes (RB-11)", async () => {
    // total=100, remaining=80 => sold=20. Change total to 120 => remaining=100
    // Use draft status so total_quantity is not locked
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(
      vp({ status: "draft", total_quantity: 100, remaining_quantity: 80 }) as any
    );
    vi.mocked(mockPrisma.voucherProduct.update).mockResolvedValue(
      vp({ status: "draft", total_quantity: 120, remaining_quantity: 100 }) as any
    );
    await svc.updateVoucherProduct(PARTNER_A, "vp-1", { total_quantity: 120 });
    expect(mockPrisma.voucherProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ total_quantity: 120, remaining_quantity: 100 }),
      })
    );
  });

  it("rejects total_quantity < already sold (RB-11)", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(
      vp({ status: "draft", total_quantity: 100, remaining_quantity: 80 }) as any
    );
    await expect(
      svc.updateVoucherProduct(PARTNER_A, "vp-1", { total_quantity: 15 })
    ).rejects.toThrow(HttpError);
  });

  it("recalculates discount_rate on price update", async () => {
    // Use draft status so selling_price is not locked
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(
      vp({ status: "draft", original_price: 100000, selling_price: 80000 }) as any
    );
    vi.mocked(mockPrisma.voucherProduct.update).mockResolvedValue(
      vp({ status: "draft", selling_price: 70000, discount_rate: 30 }) as any
    );
    await svc.updateVoucherProduct(PARTNER_A, "vp-1", { selling_price: 70000 });
    expect(mockPrisma.voucherProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ discount_rate: 30 }) })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// A2 — KHONG CO QUYEN (Unauthorized / Forbidden)
// ═══════════════════════════════════════════════════════════════════════════════
describe("A2 — Unauthorized / Forbidden", () => {
  it("buyer cannot update voucher (403)", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp() as any);
    await expect(svc.updateVoucherProduct(BUYER, "vp-1", { name: "X" })).rejects.toThrow(HttpError);
  });

  it("partner_owner cannot update another partner voucher (403)", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp() as any);
    await expect(svc.updateVoucherProduct(PARTNER_B, "vp-1", { name: "X" })).rejects.toThrow(HttpError);
  });

  it("admin_content cannot update voucher (403)", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp() as any);
    await expect(svc.updateVoucherProduct(ADMIN_C, "vp-1", { name: "X" })).rejects.toThrow(HttpError);
  });

  it("admin_operations cannot update voucher (403)", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp() as any);
    vi.mocked(mockPrisma.partner.findFirst).mockResolvedValue(null as any);
    await expect(svc.updateVoucherProduct(ADMIN_OPS, "vp-1", { name: "X" })).rejects.toThrow(HttpError);
  });

  it("scope=mine without partnerId throws 403", async () => {
    vi.mocked(mockPrisma.partner.findFirst).mockResolvedValue(null as any);
    await expect(
      svc.listVoucherProducts({ id: "u", role: "partner_owner" } as any, { page: 1, limit: 20, scope: "mine" })
    ).rejects.toThrow(HttpError);
  });

  it("submit by non-owner throws 403", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(
      vp({ status: "draft", approval_status: "pending", submitted_at: null }) as any
    );
    // Make partner.findUnique return partner-b for PARTNER_B's partnerId
    vi.mocked(mockPrisma.partner.findUnique).mockImplementation(async (args: any) => {
      if (args?.where?.id === "partner-b") return { id: "partner-b", approval_status: "approved", status: "active" } as any;
      return APPROVED_PARTNER as any;
    });
    vi.mocked(mockPrisma.voucherProductBranch.count).mockResolvedValue(1);
    await expect(svc.submitVoucherProduct(PARTNER_B, "vp-1")).rejects.toThrow(HttpError);
  });

  it("delete other partner voucher throws 403", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp() as any);
    await expect(svc.deleteVoucherProduct(PARTNER_B, "vp-1")).rejects.toThrow(HttpError);
  });

  it("updateStatus by non-owner throws 403", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp() as any);
    await expect(svc.updateVoucherStatus(PARTNER_B, "vp-1", "paused")).rejects.toThrow(HttpError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// A5 — KHONG TIM THAY (Not Found)
// ═══════════════════════════════════════════════════════════════════════════════
describe("A5 — Not Found", () => {
  it("getVoucherProduct non-existent throws 404", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(null as any);
    await expect(svc.getVoucherProduct(PARTNER_A, "no-id")).rejects.toThrow(HttpError);
  });

  it("getVoucherProduct public non-existent throws 404", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(null as any);
    await expect(svc.getVoucherProduct(undefined, "no-id")).rejects.toThrow(HttpError);
  });

  it("updateVoucherProduct non-existent throws 404", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(null as any);
    await expect(svc.updateVoucherProduct(PARTNER_A, "no-id", { name: "X" })).rejects.toThrow(HttpError);
  });

  it("deleteVoucherProduct non-existent throws 404", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(null as any);
    await expect(svc.deleteVoucherProduct(PARTNER_A, "no-id")).rejects.toThrow(HttpError);
  });

  it("submitVoucherProduct non-existent throws 404", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(null as any);
    await expect(svc.submitVoucherProduct(PARTNER_A, "no-id")).rejects.toThrow(HttpError);
  });

  it("updateVoucherStatus non-existent throws 404", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(null as any);
    await expect(svc.updateVoucherStatus(PARTNER_A, "no-id", "active")).rejects.toThrow(HttpError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// A10 — FIELD LOCKING (status-based edit restrictions)
// ═══════════════════════════════════════════════════════════════════════════════
describe("A10 — Field Locking", () => {
  it("draft: all fields editable", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp({ status: "draft" }) as any);
    vi.mocked(mockPrisma.voucherProduct.update).mockResolvedValue(vp({ status: "draft", name: "B" }) as any);
    await expect(svc.updateVoucherProduct(PARTNER_A, "vp-1", { name: "B" })).resolves.toBeDefined();
  });

  it("approved: total_quantity locked", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp({ status: "active", approval_status: "approved" }) as any);
    await expect(
      svc.updateVoucherProduct(PARTNER_A, "vp-1", { total_quantity: 200 })
    ).rejects.toThrow(HttpError);
  });

  it("active: selling_price locked", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp({ status: "active" }) as any);
    await expect(
      svc.updateVoucherProduct(PARTNER_A, "vp-1", { selling_price: 50000 })
    ).rejects.toThrow(HttpError);
  });

  it("active: original_price locked", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp({ status: "active" }) as any);
    await expect(
      svc.updateVoucherProduct(PARTNER_A, "vp-1", { original_price: 200000 })
    ).rejects.toThrow(HttpError);
  });

  it("active: name still editable", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp({ status: "active" }) as any);
    vi.mocked(mockPrisma.voucherProduct.update).mockResolvedValue(vp({ name: "New" }) as any);
    await expect(svc.updateVoucherProduct(PARTNER_A, "vp-1", { name: "New" })).resolves.toBeDefined();
  });

  it("sold_out: name locked", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp({ status: "sold_out" }) as any);
    await expect(
      svc.updateVoucherProduct(PARTNER_A, "vp-1", { name: "X" })
    ).rejects.toThrow(HttpError);
  });

  it("sold_out: category_id locked", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp({ status: "sold_out" }) as any);
    await expect(
      svc.updateVoucherProduct(PARTNER_A, "vp-1", { category_id: "cat-2" })
    ).rejects.toThrow(HttpError);
  });

  it("expired: all fields locked (wildcard)", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp({ status: "expired" }) as any);
    await expect(
      svc.updateVoucherProduct(PARTNER_A, "vp-1", { name: "X" })
    ).rejects.toThrow(HttpError);
  });

  it("pending_approval: all fields editable", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(
      vp({ status: "draft", approval_status: "pending", submitted_at: null }) as any
    );
    vi.mocked(mockPrisma.voucherProduct.update).mockResolvedValue(vp({ name: "B" }) as any);
    await expect(svc.updateVoucherProduct(PARTNER_A, "vp-1", { name: "B" })).resolves.toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// A13 — DU LIEU KHONG HOP LE (Validation Failures)
// ═══════════════════════════════════════════════════════════════════════════════
describe("A13 — Validation Failures", () => {
  const validInput = () => ({
    category_id: "cat-1",
    name: "Test Voucher",
    description: "Desc",
    original_price: 100000,
    selling_price: 80000,
    total_quantity: 100,
    sale_start_date: "2026-06-01",
    sale_end_date: "2026-12-31",
    validity_days: 30,
    terms_and_conditions: ["Term 1"],
  });

  it("selling_price >= original_price rejected", async () => {
    // First: valid create works
    vi.mocked(mockPrisma.voucherProduct.create).mockResolvedValue(vp() as any);
    await expect(
      svc.createVoucherProduct(PARTNER_A, validInput() as any)
    ).resolves.toBeDefined();

    // Second: selling_price === original_price rejected
    const badPriceInput = { ...validInput(), selling_price: 100000, original_price: 100000 };
    await expect(
      svc.createVoucherProduct(PARTNER_A, badPriceInput as any)
    ).rejects.toThrow(HttpError);
    expect(mockPrisma.voucherProduct.create).toHaveBeenCalledTimes(1); // only the first valid call
  });

  it("selling_price > original_price rejected", async () => {
    const badInput = { ...validInput(), selling_price: 150000, original_price: 100000 };
    await expect(svc.createVoucherProduct(PARTNER_A, badInput as any)).rejects.toThrow(HttpError);
  });

  it("sale_start > sale_end rejected", async () => {
    const badInput = { ...validInput(), sale_start_date: "2026-12-31", sale_end_date: "2026-01-01" };
    await expect(svc.createVoucherProduct(PARTNER_A, badInput as any)).rejects.toThrow(HttpError);
  });

  it("negative original_price rejected", async () => {
    const badInput = { ...validInput(), original_price: -100000 };
    await expect(svc.createVoucherProduct(PARTNER_A, badInput as any)).rejects.toThrow(HttpError);
  });

  it("zero total_quantity rejected", async () => {
    const badInput = { ...validInput(), total_quantity: 0 };
    await expect(svc.createVoucherProduct(PARTNER_A, badInput as any)).rejects.toThrow(HttpError);
  });

  it("empty name rejected", async () => {
    const badInput = { ...validInput(), name: "" };
    await expect(svc.createVoucherProduct(PARTNER_A, badInput as any)).rejects.toThrow(HttpError);
  });

  it("empty terms_and_conditions rejected", async () => {
    const badInput = { ...validInput(), terms_and_conditions: [] };
    await expect(svc.createVoucherProduct(PARTNER_A, badInput as any)).rejects.toThrow(HttpError);
  });

  it("invalid sale_start_date rejected", async () => {
    const badInput = { ...validInput(), sale_start_date: "not-a-date" };
    await expect(svc.createVoucherProduct(PARTNER_A, badInput as any)).rejects.toThrow(HttpError);
  });

  it("update: selling_price >= original_price rejected", async () => {
    vi.mocked(mockPrisma.voucherProduct.findUnique).mockResolvedValue(vp({ original_price: 100000 }) as any);
    await expect(
      svc.updateVoucherProduct(PARTNER_A, "vp-1", { selling_price: 100000 })
    ).rejects.toThrow(HttpError);
  });

  it("no prisma write on validation failure", async () => {
    const badInput = { ...validInput(), selling_price: 150000, original_price: 100000 };
    await expect(svc.createVoucherProduct(PARTNER_A, badInput as any)).rejects.toThrow();
    expect(mockPrisma.voucherProduct.create).not.toHaveBeenCalled();
  });
});
