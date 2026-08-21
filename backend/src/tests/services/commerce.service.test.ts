import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { HttpError } from "../../utils/http-error.js";

const { mockPrisma, mockTx } = vi.hoisted(() => {
  const tx: Record<string, Record<string, Mock>> = {
    order: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    orderItem: { create: vi.fn() },
    orderLog: { create: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    payment: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    paymentLog: { create: vi.fn() },
    voucherProduct: { updateMany: vi.fn(), update: vi.fn() },
    issuedVoucher: { createMany: vi.fn() },
  };
  return {
    mockPrisma: {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      cart: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      cartItem: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      voucherProduct: {
        findUnique: vi.fn(),
      },
      order: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
        update: vi.fn(),
      },
      orderItem: {
        findUnique: vi.fn(),
      },
      payment: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((input: unknown) => Array.isArray(input) ? Promise.all(input) : (input as Function)(tx)),
    },
    mockTx: tx,
  };
});

vi.mock("../../config/prisma.js", () => ({ prisma: mockPrisma }));

import { prisma } from "../../config/prisma.js";
import * as commerceService from "../../services/commerce.service.js";
import type { UserRole } from "../../types/auth.types.js";

type CurrentUser = { id: string; role: UserRole; partnerId?: string };

const BUYER: CurrentUser = { id: "u-buyer", role: "buyer" };
const ADMIN: CurrentUser = { id: "u-admin", role: "admin_operations" };
const PARTNER: CurrentUser = { id: "u-partner", role: "partner_owner", partnerId: "p1" };

function makeVoucher(overrides: Record<string, unknown> = {}) {
  return {
    id: "vp1", original_price: 100000, selling_price: 80000, discount_rate: 20,
    remaining_quantity: 50, approval_status: "approved", status: "active",
    sale_start_date: "2026-01-01", sale_end_date: "2026-12-31", validity_days: 30,
    ...overrides,
  };
}

describe("Commerce Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.order.updateMany.mockResolvedValue({ count: 1 });
    mockTx.payment.updateMany.mockResolvedValue({ count: 1 });
  });

  describe("getCart", () => {
    it("returns cart with items", async () => {
      vi.mocked(prisma.cart.upsert).mockResolvedValue({ id: "cart1", user_id: "u-buyer" } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValue([
        { id: "ci1", voucher_product_id: "vp1", quantity: 2, voucher_products: makeVoucher() },
      ] as any);

      const result = await commerceService.getCart("u-buyer");
      expect(result.items).toHaveLength(1);
    });
  });

  describe("addCartItem", () => {
    it("adds new item to cart", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.cart.upsert).mockResolvedValue({ id: "cart1" } as any);
      vi.mocked(prisma.cartItem.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.cartItem.create).mockResolvedValue({ id: "ci1" } as any);

      const result = await commerceService.addCartItem("u-buyer", { voucher_product_id: "vp1", quantity: 1 });
      expect(result.created).toBe(true);
    });

    it("merges quantity if item exists", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ remaining_quantity: 100 }) as any);
      vi.mocked(prisma.cart.upsert).mockResolvedValue({ id: "cart1" } as any);
      vi.mocked(prisma.cartItem.findFirst).mockResolvedValue({ id: "ci1", quantity: 2 } as any);
      vi.mocked(prisma.cartItem.update).mockResolvedValue({ id: "ci1", quantity: 3 } as any);

      const result = await commerceService.addCartItem("u-buyer", { voucher_product_id: "vp1", quantity: 1 });
      expect(result.created).toBe(false);
    });

    it("rejects if voucher not sellable", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ approval_status: "pending" }) as any);
      vi.mocked(prisma.cart.upsert).mockResolvedValue({ id: "cart1" } as any);

      await expect(
        commerceService.addCartItem("u-buyer", { voucher_product_id: "vp1", quantity: 1 })
      ).rejects.toThrow(HttpError);
    });

    it("rejects if insufficient stock", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher({ remaining_quantity: 1 }) as any);
      vi.mocked(prisma.cart.upsert).mockResolvedValue({ id: "cart1" } as any);

      await expect(
        commerceService.addCartItem("u-buyer", { voucher_product_id: "vp1", quantity: 5 })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("updateCartItem", () => {
    it("updates quantity if owner", async () => {
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValue({
        id: "ci1", voucher_product_id: "vp1", carts: { user_id: "u-buyer" },
      } as any);
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      vi.mocked(prisma.cartItem.update).mockResolvedValue({ id: "ci1", quantity: 3 } as any);

      const result = await commerceService.updateCartItem("u-buyer", "ci1", 3);
      expect(result.quantity).toBe(3);
    });

    it("rejects if not owner", async () => {
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValue({
        id: "ci1", voucher_product_id: "vp1", carts: { user_id: "u-other" },
      } as any);

      await expect(commerceService.updateCartItem("u-buyer", "ci1", 3)).rejects.toThrow(HttpError);
    });
  });

  describe("deleteCartItem", () => {
    it("deletes if owner", async () => {
      vi.mocked(prisma.cartItem.findUnique).mockResolvedValue({
        id: "ci1", voucher_product_id: "vp1", carts: { user_id: "u-buyer" },
      } as any);
      vi.mocked(prisma.cartItem.delete).mockResolvedValue({} as any);

      await commerceService.deleteCartItem("u-buyer", "ci1");
      expect(prisma.cartItem.delete).toHaveBeenCalled();
    });
  });

  describe("clearCart", () => {
    it("clears all items from cart", async () => {
      vi.mocked(prisma.cart.upsert).mockResolvedValue({ id: "cart1" } as any);
      vi.mocked(prisma.cartItem.deleteMany).mockResolvedValue({ count: 3 } as any);

      await commerceService.clearCart("u-buyer");
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cart_id: "cart1" } });
    });
  });

  describe("checkout", () => {
    it("creates order from cart items", async () => {
      vi.mocked(prisma.cart.upsert).mockResolvedValue({ id: "cart1" } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValue([
        { id: "ci1", voucher_product_id: "vp1", quantity: 2 },
      ] as any);
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      mockTx.order.create.mockResolvedValue({ id: "order1", order_code: "ORD1", total_amount: 160000 });
      mockTx.orderItem.create.mockResolvedValue({ id: "oi1" });
      mockTx.orderLog.create.mockResolvedValue({});

      const result = await commerceService.checkout("u-buyer", { payment_method: "simulated" });
      expect(result.total_amount).toBe(160000);
      expect(mockTx.orderLog.create).toHaveBeenCalled();
      expect(mockTx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cart_id: "cart1", id: { in: ["ci1"] } } });
    });

    it("rejects empty cart", async () => {
      vi.mocked(prisma.cart.upsert).mockResolvedValue({ id: "cart1" } as any);
      vi.mocked(prisma.cartItem.findMany).mockResolvedValue([]);

      await expect(commerceService.checkout("u-buyer", { payment_method: "simulated" })).rejects.toThrow(HttpError);
    });
  });

  describe("createOrder", () => {
    it("creates order from direct items", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      mockTx.order.create.mockResolvedValue({ id: "order1", total_amount: 80000 });
      mockTx.orderItem.create.mockResolvedValue({ id: "oi1" });
      mockTx.orderLog.create.mockResolvedValue({});

      const result = await commerceService.createOrder("u-buyer", {
        items: [{ voucher_product_id: "vp1", quantity: 1 }],
        payment_method: "simulated",
      });
      expect(result.total_amount).toBe(80000);
      expect(mockTx.order.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          user_id: "u-buyer",
          recipient_id: "u-buyer",
          status: "pending_payment",
          payment_status: "pending",
          payment_expires_at: expect.any(Date),
        }),
      }));
    });

    it("resolves a gift recipient and stores the recipient on the order", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "u-recipient" } as any);
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);
      mockTx.order.create.mockResolvedValue({ id: "order1", total_amount: 80000 });
      mockTx.orderItem.create.mockResolvedValue({ id: "oi1" });
      mockTx.orderLog.create.mockResolvedValue({});

      await commerceService.createOrder("u-buyer", {
        items: [{ voucher_product_id: "vp1", quantity: 1 }],
        payment_method: "vnpay",
        recipient_identifier: "recipient@example.com",
        is_gift: true,
      });

      expect(mockTx.order.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ recipient_id: "u-recipient", is_gift: true }),
      }));
    });

    it("rejects a gift recipient that does not exist", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await expect(commerceService.createOrder("u-buyer", {
        items: [{ voucher_product_id: "vp1", quantity: 1 }],
        payment_method: "vnpay",
        recipient_identifier: "missing@example.com",
        is_gift: true,
      })).rejects.toThrow(HttpError);
    });

    it("rejects gifting a voucher to yourself", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "u-buyer" } as unknown as { id: string });

      await expect(commerceService.createOrder("u-buyer", {
        items: [{ voucher_product_id: "vp1", quantity: 1 }],
        payment_method: "vnpay",
        recipient_identifier: "buyer@example.com",
        is_gift: true,
      })).rejects.toMatchObject({ statusCode: 422, code: "RECIPIENT_IS_SELF" });
    });

    it("rejects a stale cart price", async () => {
      vi.mocked(prisma.voucherProduct.findUnique).mockResolvedValue(makeVoucher() as any);

      await expect(commerceService.createOrder("u-buyer", {
        items: [{ voucher_product_id: "vp1", quantity: 1 }],
        payment_method: "vnpay",
        expected_prices: { vp1: 70000 },
      })).rejects.toThrow(HttpError);
    });
  });

  describe("listOrders", () => {
    it("selects a narrow summary using payment statuses and issued voucher counts", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([
        {
          id: "o1",
          user_id: "u-buyer",
          recipient_id: "u-buyer",
          status: "pending",
          payments: [{ status: "success" }],
          order_items: [{
            voucher_product_id: "vp1",
            quantity: 2,
            subtotal: 200000,
            voucher_products: { name: "Spa voucher", partners: { business_name: "Partner One" } },
            _count: { issued_vouchers: 2 },
            issued_vouchers: [{ status: "active", reviews: [{ id: "review-1" }] }],
          }],
          complaints: [{ id: "complaint-1" }],
        },
      ] as any);
      vi.mocked(prisma.order.count).mockResolvedValue(1 as any);
      vi.mocked(prisma.order.groupBy).mockResolvedValue([
        { status: "payment_failed", _count: { _all: 1 } },
      ] as any);

      const result = await commerceService.listOrders(BUYER);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({ status: "pending_payment", payment_status: "paid" });
      expect(result.items[0]).not.toHaveProperty("payments");
      expect(result.items[0].order_items[0].issued_voucher_count).toBe(2);
      expect(result.items[0].order_items[0].invalidated_voucher_count).toBe(0);
      expect(result.items[0].order_items[0].has_review).toBe(true);
      expect(result.items[0].has_complaint).toBe(true);
      expect(result.countsByStatus.all).toBe(1);
      expect(result.countsByStatus.payment_failed).toBe(1);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { AND: [{ user_id: "u-buyer" }] } })
      );

      const select = vi.mocked(prisma.order.findMany).mock.calls[0][0]?.select as any;
      expect(select).toEqual(expect.objectContaining({
        id: true,
        user_id: true,
        recipient_id: true,
        is_gift: true,
        order_code: true,
        subtotal: true,
        discount_amount: true,
        total_amount: true,
        status: true,
        payment_status: true,
        payment_method: true,
        payment_expires_at: true,
        created_at: true,
        users: { select: { full_name: true } },
      }));
      expect(select.payments).toEqual({ select: { status: true } });
      expect(select).not.toHaveProperty("updated_at");
      expect(select.order_items.select.issued_vouchers).toEqual({
        select: { status: true, reviews: { where: { user_id: "u-buyer" }, select: { id: true } } },
      });
      expect(select.order_items.select._count).toEqual({ select: { issued_vouchers: true } });
      expect(select.order_items.select).not.toHaveProperty("unit_price");
      expect(select.order_items.select.subtotal).toBe(true);
      expect(select.order_items.select.voucher_products.select).toEqual({
        name: true,
        partners: { select: { business_name: true } },
      });
    });

    it("does not include orders received as gifts in buyer history or counts", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.order.count).mockResolvedValue(0 as any);
      vi.mocked(prisma.order.groupBy).mockResolvedValue([] as any);

      const result = await commerceService.listOrders(BUYER);

      expect(result.items).toHaveLength(0);
      expect(result.countsByStatus.all).toBe(0);
      expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { AND: [{ user_id: "u-buyer" }] },
      }));
    });

    it("admin sees all orders", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([
        { id: "o1", user_id: "u-buyer", order_items: [] },
        { id: "o2", user_id: "u-other", order_items: [] },
      ] as any);
      vi.mocked(prisma.order.count).mockResolvedValue(2 as any);
      vi.mocked(prisma.order.groupBy).mockResolvedValue([
        { status: "cancelled", _count: { _all: 2 } },
      ] as any);

      const result = await commerceService.listOrders(ADMIN);
      expect(result.items).toHaveLength(2);
      expect(result.countsByStatus.cancelled).toBe(2);
    });

    it("scopes partner staff listings to their partner", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([
        { id: "o1", user_id: "u-buyer", status: "confirmed", payment_status: "paid", order_items: [] },
      ] as any);
      vi.mocked(prisma.order.count).mockResolvedValue(1 as any);
      vi.mocked(prisma.order.groupBy).mockResolvedValue([
        { status: "confirmed", _count: { _all: 1 } },
      ] as any);

      const result = await commerceService.listOrders(PARTNER);

      expect(result.items).toHaveLength(1);
      expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { AND: [{ order_items: { some: { voucher_products: { partner_id: "p1" } } } }] },
      }));
      const select = vi.mocked(prisma.order.findMany).mock.calls[0][0]?.select as any;
      expect(select.order_items.where).toEqual({ voucher_products: { partner_id: "p1" } });
      expect(select.order_items.select.issued_vouchers.select.reviews).toEqual({ select: { id: true } });
    });

    it("does not apply status filter to badge counts", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([
        { id: "o1", user_id: "u-buyer", status: "cancelled", order_items: [] },
      ] as any);
      vi.mocked(prisma.order.count).mockResolvedValue(1 as any);
      vi.mocked(prisma.order.groupBy).mockResolvedValue([
        { status: "payment_failed", _count: { _all: 1 } },
        { status: "cancelled", _count: { _all: 1 } },
      ] as any);

      const result = await commerceService.listOrders(BUYER, { status: "cancelled" });

      expect(result.items).toHaveLength(1);
      expect(result.countsByStatus.all).toBe(2);
      expect(result.countsByStatus.payment_failed).toBe(1);
      expect(result.countsByStatus.cancelled).toBe(1);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: { in: ["cancelled"] } }) })
      );
      expect(prisma.order.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { AND: [{ user_id: "u-buyer" }] } })
      );
    });
  });

  describe("getOrderById", () => {
    it("owner can get own order", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-buyer", order_items: [],
      } as any);

      const result = await commerceService.getOrderById(BUYER, "o1");
      expect(result.id).toBe("o1");
    });

    it("rejects other buyer's order", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-other", order_items: [],
      } as any);

      await expect(commerceService.getOrderById(BUYER, "o1")).rejects.toThrow(HttpError);
    });

    it("rejects a gift recipient viewing the creator's order", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1",
        user_id: "u-other",
        recipient_id: "u-buyer",
        status: "confirmed",
        complaints: [{ id: "own", user_id: "u-buyer" }, { id: "other", user_id: "u-other" }],
        order_items: [{ issued_vouchers: [{ id: "iv1", voucher_code: "CODE", complaints: [{ id: "own-voucher", user_id: "u-buyer" }] }] }],
        payments: [{ id: "pay1", status: "success", transaction_ref: "PRIVATE-TXN", gateway_response: { payer: "private" }, paid_at: new Date() }],
      } as any);

      await expect(commerceService.getOrderById(BUYER, "o1")).rejects.toThrow(HttpError);
      expect(prisma.order.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        include: expect.objectContaining({
          payments: true,
          order_items: {
            include: expect.objectContaining({
              issued_vouchers: { include: { reviews: true, complaints: true } },
            }),
          },
        }),
      }));
    });

    it("keeps safe payments available to the order creator", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-buyer", recipient_id: "u-buyer", order_items: [], complaints: [],
        payments: [{ id: "pay1", status: "success", transaction_ref: "PRIVATE", gateway_response: "PRIVATE" }],
      } as any);

      const result = await commerceService.getOrderById(BUYER, "o1");

      expect((result.payments as any[])[0]).not.toHaveProperty("transaction_ref");
      expect((result.payments as any[])[0]).not.toHaveProperty("gateway_response");
    });

    it("does not expose a gift recipient's voucher codes to the sender", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1",
        user_id: "u-buyer",
        recipient_id: "u-other",
        status: "confirmed",
        complaints: [{ id: "own", user_id: "u-buyer" }, { id: "other", user_id: "u-other" }],
        order_items: [{ issued_vouchers: [{ id: "iv1", voucher_code: "SECRET-CODE", qr_code_payload: "SECRET-QR", complaints: [] }] }],
        payments: [],
      } as any);

      const result = await commerceService.getOrderById(BUYER, "o1");

      expect(result.complaints).toEqual([{ id: "own", user_id: "u-buyer" }]);
      expect((result.order_items as any[])[0].issued_vouchers).toEqual([]);
    });

    it("scopes mixed-partner order details to the current partner", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1",
        user_id: "u-buyer",
        total_amount: 100000,
        status: "confirmed",
        complaints: [{ id: "complaint-other" }],
        order_items: [
          { id: "own", subtotal: 40000, voucher_products: { partner_id: "p1" }, issued_vouchers: [{ voucher_code: "OWN" }] },
          { id: "other", subtotal: 60000, voucher_products: { partner_id: "p2" }, issued_vouchers: [{ voucher_code: "SECRET" }] },
        ],
        payments: [{ id: "pay1", status: "success", transaction_ref: "PRIVATE-TXN" }],
      } as any);

      const result = await commerceService.getOrderById(PARTNER, "o1");

      expect((result.order_items as any[]).map((item) => item.id)).toEqual(["own"]);
      expect(result.total_amount).toBe(40000);
      expect(result.complaints).toEqual([]);
      expect((result.payments as any[])[0]).not.toHaveProperty("transaction_ref");
    });
  });

  describe("getOrderReviewTargets", () => {
    it("returns only opaque voucher ids and caller-filtered reviews to the creator", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1",
        user_id: "u-buyer",
        status: "confirmed",
        order_items: [{
          id: "oi1",
          voucher_product_id: "vp1",
          quantity: 2,
          voucher_products: { id: "vp1", name: "Spa", thumbnail_url: null, partners: { business_name: "Partner" } },
          issued_vouchers: [
            { id: "iv1", status: "active", reviews: [] },
            { id: "iv2", status: "active", reviews: [{ id: "review1", rating: 5 }] },
          ],
        }],
      } as any);

      const result = await commerceService.getOrderReviewTargets("u-buyer", "o1");

      expect(result.order_items[0].issued_vouchers).toEqual([
        { issued_voucher_id: "iv1", review: null, reviewable: true },
        { issued_voucher_id: "iv2", review: { id: "review1", rating: 5 }, reviewable: false },
      ]);
      expect(result.order_items[0].issued_vouchers[0]).not.toHaveProperty("status");
      const select = vi.mocked(prisma.order.findUnique).mock.calls[0][0]?.select as any;
      expect(select.order_items.select.issued_vouchers.select).not.toHaveProperty("voucher_code");
      expect(select.order_items.select.issued_vouchers.select).not.toHaveProperty("qr_code_payload");
      expect(select.order_items.select.issued_vouchers.select).not.toHaveProperty("owner_id");
      expect(select.order_items.select.issued_vouchers.select.reviews.where).toEqual({ user_id: "u-buyer" });
    });

    it("rejects the gift recipient and non-creator callers", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-other", status: "confirmed", order_items: [],
      } as any);

      await expect(commerceService.getOrderReviewTargets("u-buyer", "o1")).rejects.toThrow(HttpError);
    });

    it("marks targets unreviewable when the order is unpaid and voucher unused", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-buyer", status: "pending_payment",
        order_items: [{
          id: "oi1", voucher_product_id: "vp1", quantity: 1, voucher_products: {},
          issued_vouchers: [{ id: "iv1", status: "active", reviews: [] }],
        }],
      } as any);

      const result = await commerceService.getOrderReviewTargets("u-buyer", "o1");
      expect(result.order_items[0].issued_vouchers[0].reviewable).toBe(false);
    });
  });

  describe("customer order subresources", () => {
    it("rejects item and payment lists for a gift recipient", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-other", recipient_id: "u-buyer", order_items: [], payments: [],
      } as any);

      await expect(commerceService.listOrderItems(BUYER, "o1")).rejects.toThrow(HttpError);
      await expect(commerceService.listPayments(BUYER, "o1")).rejects.toThrow(HttpError);
    });

    it("allows the creator to list safe items and payments", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-buyer", recipient_id: "u-other", complaints: [],
        order_items: [{ id: "oi1", issued_vouchers: [] }],
        payments: [{ id: "pay1", status: "success", transaction_ref: "PRIVATE" }],
      } as any);

      const items = await commerceService.listOrderItems(BUYER, "o1");
      const payments = await commerceService.listPayments(BUYER, "o1") as any[];

      expect(items).toHaveLength(1);
      expect(payments[0]).not.toHaveProperty("transaction_ref");
    });
  });

  describe("cancelOrder", () => {
    it("cancels unpaid order", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-buyer", status: "pending_payment", order_items: [],
      } as any);
      mockTx.order.update.mockResolvedValue({ id: "o1", status: "cancelled" });
      mockTx.orderLog.create.mockResolvedValue({});

      const result = await commerceService.cancelOrder(BUYER, "o1");
      expect(result.status).toBe("cancelled");
      expect(mockTx.voucherProduct.update).not.toHaveBeenCalled();
    });

    it("rejects cancelling paid order", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-buyer", status: "confirmed", order_items: [],
      } as any);

      await expect(commerceService.cancelOrder(BUYER, "o1")).rejects.toThrow(HttpError);
    });
  });

  describe("createPayment", () => {
    it("creates payment for unpaid order", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-buyer", status: "pending_payment",
        total_amount: 100000, payment_method: "simulated", order_items: [],
      } as any);
      mockTx.payment.create.mockResolvedValue({ id: "pay1", amount: 100000 });
      mockTx.paymentLog.create.mockResolvedValue({});
      vi.mocked(prisma.payment.update).mockResolvedValue({ id: "pay1", amount: 100000 } as any);

      const result = await commerceService.createPayment(BUYER, "o1");
      expect(result.amount).toBe(100000);
    });

    it("rejects payment for already paid order", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-buyer", status: "confirmed", order_items: [],
      } as any);

      await expect(commerceService.createPayment(BUYER, "o1")).rejects.toThrow(HttpError);
    });

    it("rejects payment by a gift recipient", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-other", recipient_id: "u-buyer", status: "pending_payment", order_items: [], payments: [],
      } as any);

      await expect(commerceService.createPayment(BUYER, "o1")).rejects.toThrow(HttpError);
      expect(mockTx.payment.create).not.toHaveBeenCalled();
    });
  });

  describe("simulatePaymentSuccess", () => {
    it("simulates success, issues vouchers, updates order", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: "pay1", status: "pending", amount: 160000, orders: {
          id: "o1", user_id: "u-buyer", recipient_id: "u-recipient", status: "pending_payment",
          order_items: [{ id: "oi1", quantity: 2, voucher_products: makeVoucher() }],
        },
      } as any);
      mockTx.voucherProduct.updateMany.mockResolvedValue({ count: 1 });
      mockTx.issuedVoucher.createMany.mockResolvedValue({ count: 2 });
      mockTx.payment.update.mockResolvedValue({ id: "pay1", status: "success" });
      mockTx.order.update.mockResolvedValue({});
      mockTx.paymentLog.create.mockResolvedValue({});
      mockTx.orderLog.create.mockResolvedValue({});
      vi.mocked(prisma.payment.update).mockResolvedValue({ id: "pay1" } as any);

      const result = await commerceService.simulatePaymentSuccess(BUYER, "pay1");
      expect(result.status).toBe("success");
      expect(mockTx.issuedVoucher.createMany).toHaveBeenCalled();
      expect(mockTx.issuedVoucher.createMany.mock.calls[0][0].data[0].owner_id).toBe("u-recipient");
    });

    it("rejects if already paid", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: "pay1", status: "success", orders: {
          id: "o1", user_id: "u-buyer", status: "confirmed", order_items: [],
        },
      } as any);

      await expect(commerceService.simulatePaymentSuccess(BUYER, "pay1")).rejects.toThrow(HttpError);
    });
  });

  describe("simulatePaymentFailed", () => {
    it("simulates payment failure", async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: "pay1", status: "pending", amount: 100000, orders: {
          id: "o1", user_id: "u-buyer", status: "pending_payment", order_items: [],
        },
      } as any);
      mockTx.payment.update.mockResolvedValue({ id: "pay1", status: "failed" });
      mockTx.order.update.mockResolvedValue({});
      mockTx.paymentLog.create.mockResolvedValue({});
      mockTx.payment.findUnique.mockResolvedValue({ id: "pay1", order_id: "o1", amount: 100000, status: "failed" });

      const result = await commerceService.simulatePaymentFailed(BUYER, "pay1");
      expect(result.status).toBe("failed");
      expect(mockTx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "payment_failed" }),
      }));
    });
  });
});
