import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpError } from "../../utils/http-error.js";

const { mockPrisma, mockTx } = vi.hoisted(() => {
  const tx: Record<string, Record<string, vi.Mock>> = {
    order: { create: vi.fn(), update: vi.fn() },
    orderItem: { create: vi.fn() },
    orderLog: { create: vi.fn() },
    payment: { create: vi.fn(), update: vi.fn() },
    paymentLog: { create: vi.fn() },
    voucherProduct: { updateMany: vi.fn() },
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
        recipient_email: "recipient@example.com",
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
        recipient_email: "missing@example.com",
        is_gift: true,
      })).rejects.toThrow(HttpError);
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
    it("buyer sees only own orders", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([
        { id: "o1", user_id: "u-buyer", order_items: [] },
      ] as any);
      vi.mocked(prisma.order.count).mockResolvedValue(1 as any);
      vi.mocked(prisma.order.groupBy).mockResolvedValue([
        { status: "payment_failed", _count: { _all: 1 } },
      ] as any);

      const result = await commerceService.listOrders(BUYER);
      expect(result.items).toHaveLength(1);
      expect(result.countsByStatus.all).toBe(1);
      expect(result.countsByStatus.payment_failed).toBe(1);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { AND: [{ OR: [{ user_id: "u-buyer" }, { recipient_id: "u-buyer" }] }] } })
      );
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
        expect.objectContaining({ where: expect.objectContaining({ status: "cancelled" }) })
      );
      expect(prisma.order.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { AND: [{ OR: [{ user_id: "u-buyer" }, { recipient_id: "u-buyer" }] }] } })
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

      const result = await commerceService.createPayment(BUYER, "o1");
      expect(result.amount).toBe(100000);
    });

    it("rejects payment for already paid order", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "o1", user_id: "u-buyer", status: "confirmed", order_items: [],
      } as any);

      await expect(commerceService.createPayment(BUYER, "o1")).rejects.toThrow(HttpError);
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

      const result = await commerceService.simulatePaymentFailed(BUYER, "pay1");
      expect(result.status).toBe("failed");
    });
  });
});
