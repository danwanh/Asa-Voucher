import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { adminRoles, isPartnerStaff, type UserRole } from "../types/auth.types.js";
import { requireData } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";
import {
  capturePayPalPayment,
  createPayPalPayment,
  createVnpayPayment,
  createSimulatedPayment,
  refundVnpayPayment,
  refundPayPalPayment,
  verifyVnpayReturn,
  formatVnpayDate,
  safeParseJson,
  extractPaypalCaptureId,
  type PaymentProvider,
} from "./payment-provider.service.js";
import { env } from "../config/env.js";
import { buildPaginatedResult } from "../utils/pagination.js";
import { generateVoucherCode } from "../utils/code.util.js";

type CurrentUser = { id: string; role: UserRole; partnerId?: string };
type Voucher = Record<string, unknown> & {
  id: string;
  original_price: number | string;
  selling_price: number | string;
  discount_rate: number;
  remaining_quantity: number;
  approval_status: string;
  status: string;
  sale_start_date: Date | string;
  sale_end_date: Date | string;
  validity_days: number;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function dateToIsoDate(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function isAdmin(user: CurrentUser) {
  return adminRoles.includes(user.role);
}

type PaymentRecord = { status: string };

const ORDER_STATUS_VALUES = ["pending_payment", "payment_failed", "confirmed", "completed", "cancelled", "refunded"] as const;
type OrderStatus = typeof ORDER_STATUS_VALUES[number];
const ORDER_PAYMENT_STATUS_VALUES = ["pending", "paid", "failed", "refunded"] as const;
type OrderPaymentStatus = typeof ORDER_PAYMENT_STATUS_VALUES[number];

type CreateOrderInput = {
  items?: Array<{ voucher_product_id: string; quantity: number }>;
  cart_item_ids?: string[];
  payment_method: string;
  recipient_identifier?: string;
  is_gift?: boolean;
  expected_prices?: Record<string, number>;
  note?: string;
};

function normalizeOrderStatus(status: unknown): OrderStatus {
  if (status === "pending") return "pending_payment";
  if (status === "used") return "completed";
  if (status === "pending_manual") return "confirmed";
  return ORDER_STATUS_VALUES.includes(status as OrderStatus) ? status as OrderStatus : "pending_payment";
}

function storedStatuses(status: string) {
  if (status === "pending_payment") return ["pending_payment", "pending"];
  if (status === "confirmed") return ["confirmed", "pending_manual"];
  if (status === "completed") return ["completed", "used"];
  return [status];
}

function derivePaymentStatus(payments: PaymentRecord[] | undefined): "pending" | "paid" | "failed" | "refunded" {
  const list = payments ?? [];
  if (list.some((p) => p.status === "refunded")) return "refunded";
  if (list.some((p) => p.status === "success")) return "paid";
  if (list.length > 0 && list.every((p) => p.status === "failed")) return "failed";
  return "pending";
}

function orderCode() {
  return `ORD${Date.now()}${crypto.randomInt(1000, 9999)}`;
}

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { user_id: userId },
    update: {},
    create: { user_id: userId }
  }) as unknown as Record<string, unknown>;
}

async function getSellableVoucher(id: string, quantity: number) {
  const voucher = requireData<Voucher>(await prisma.voucherProduct.findUnique({ where: { id } }) as unknown as Voucher | null, "Voucher product not found");
  const today = todayIsoDate();
  if (voucher.approval_status !== "approved" || voucher.status !== "active" || dateToIsoDate(voucher.sale_start_date) > today || dateToIsoDate(voucher.sale_end_date) < today) {
    throw new HttpError(422, "Voucher product is not sellable", "VOUCHER_NOT_SELLABLE");
  }
  if (Number(voucher.remaining_quantity) < quantity) {
    throw new HttpError(409, "Insufficient voucher quantity", "INSUFFICIENT_STOCK");
  }
  return voucher;
}

export async function getCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  const items = await prisma.cartItem.findMany({
    where: { cart_id: cart.id as string },
    include: { voucher_products: true },
    orderBy: { created_at: "desc" }
  });
  return { ...cart, items };
}

export async function addCartItem(userId: string, input: { voucher_product_id: string; quantity: number }) {
  const [voucher, cart] = await Promise.all([
    getSellableVoucher(input.voucher_product_id, input.quantity),
    getOrCreateCart(userId)
  ]);
  const existing = await prisma.cartItem.findFirst({ where: { cart_id: cart.id as string, voucher_product_id: input.voucher_product_id } }) as unknown as Record<string, unknown> | null;

  if (existing) {
    const quantity = Number(existing.quantity) + input.quantity;
    if (Number(voucher.remaining_quantity) < quantity) {
      throw new HttpError(409, "Insufficient voucher quantity", "INSUFFICIENT_STOCK");
    }
    const item = await prisma.cartItem.update({ where: { id: existing.id as string }, data: { quantity, updated_at: new Date() } });
    return { item, created: false };
  }

  const item = await prisma.cartItem.create({ data: { cart_id: cart.id as string, ...input } });
  return { item, created: true };
}

async function assertCartItemOwner(userId: string, cartItemId: string) {
  const item = requireData<Record<string, unknown>>(await prisma.cartItem.findUnique({ where: { id: cartItemId }, include: { carts: true } }) as unknown as Record<string, unknown> | null, "Cart item not found");
  if ((item.carts as Record<string, unknown>).user_id !== userId) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
  return item;
}

export async function updateCartItem(userId: string, cartItemId: string, quantity: number) {
  const item = await assertCartItemOwner(userId, cartItemId);
  await getSellableVoucher(item.voucher_product_id as string, quantity);
  return prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity, updated_at: new Date() } });
}

export async function deleteCartItem(userId: string, cartItemId: string) {
  await assertCartItemOwner(userId, cartItemId);
  await prisma.cartItem.delete({ where: { id: cartItemId } });
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cart_id: cart.id as string } });
}

async function buildOrderItems(
  items: Array<{ voucher_product_id: string; quantity: number }>,
  expectedPrices?: Record<string, number>,
) {
  const orderItems = [];
  for (const item of items) {
    const voucher = await getSellableVoucher(item.voucher_product_id, item.quantity);
    const unitPrice = Number(voucher.selling_price);
    const expectedPrice = expectedPrices?.[voucher.id];
    if (expectedPrice !== undefined && expectedPrice !== unitPrice) {
      throw new HttpError(409, "Voucher price has changed", "PRICE_CHANGED", {
        voucher_product_id: voucher.id,
        expected_price: expectedPrice,
        current_price: unitPrice,
      });
    }
    orderItems.push({
      voucher,
      quantity: item.quantity,
      orderItem: {
        voucher_product_id: voucher.id,
        quantity: item.quantity,
        unit_price: unitPrice,
        snapped_original_price: Number(voucher.original_price),
        snapped_selling_price: unitPrice,
        snapped_discount_rate: Number(voucher.discount_rate),
        subtotal: unitPrice * item.quantity
      }
    });
  }
  return orderItems;
}

async function resolveRecipient(userId: string, identifier: string | undefined, isGift: boolean) {
  if (!isGift) return userId;
  const value = identifier?.trim();
  if (!value) throw new HttpError(422, "Recipient identifier is required", "RECIPIENT_REQUIRED");
  const phone = value.replace(/\s/g, "");
  const normalizedPhone = phone.startsWith("+84") ? `0${phone.slice(3)}` : phone;
  const recipient = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: value, mode: "insensitive" } },
        { phone },
        { phone: normalizedPhone },
      ],
      is_active: true,
    },
    select: { id: true },
  });
  if (!recipient) throw new HttpError(404, "Recipient account was not found", "RECIPIENT_NOT_FOUND");
  if (recipient.id === userId) throw new HttpError(422, "Cannot gift voucher to yourself", "RECIPIENT_IS_SELF");
  return recipient.id;
}

async function createOrderFromItems(
  userId: string,
  items: Array<{ voucher_product_id: string; quantity: number }>,
  input: CreateOrderInput,
  cart?: { id: string; itemIds: string[] },
) {
  const [builtItems, recipientId] = await Promise.all([
    buildOrderItems(items, input.expected_prices),
    resolveRecipient(userId, input.recipient_identifier, Boolean(input.is_gift)),
  ]);
  const subtotal = builtItems.reduce((sum, item) => sum + Number(item.orderItem.subtotal), 0);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const orderData = {
      order_code: orderCode(),
      user_id: userId,
      recipient_id: recipientId,
      is_gift: Boolean(input.is_gift),
      subtotal,
      discount_amount: 0,
      total_amount: subtotal,
      payment_method: input.payment_method,
      payment_status: "pending",
      status: "pending_payment",
      payment_expires_at: expiresAt,
      note: input.note,
    };
    const order = await tx.order.create({ data: orderData });
    const orderItems = await Promise.all(builtItems.map((item) => tx.orderItem.create({ data: { ...item.orderItem, order_id: order.id } })));
    await tx.orderLog.create({ data: { order_id: order.id, user_id: userId, action: "CREATE_ORDER", description: "Order created" } });
    if (cart?.itemIds.length) {
      await tx.cartItem.deleteMany({ where: { cart_id: cart.id, id: { in: cart.itemIds } } });
    }
    return { ...order, items: orderItems };
  });
}

async function itemsFromCart(userId: string, cartItemIds?: string[]) {
  const cart = await getOrCreateCart(userId);
  const cartItems = await prisma.cartItem.findMany({
    where: { cart_id: cart.id as string, ...(cartItemIds?.length ? { id: { in: cartItemIds } } : {}) }
  });
  if (!cartItems.length) throw new HttpError(422, "Cart is empty", "EMPTY_CART");
  if (cartItemIds?.length && new Set(cartItemIds).size !== cartItems.length) {
    throw new HttpError(422, "One or more cart items are invalid", "INVALID_CART_ITEMS");
  }
  return { cart, cartItems: cartItems as unknown as Array<Record<string, unknown>> };
}

export async function checkout(userId: string, input: CreateOrderInput) {
  const { cart, cartItems } = await itemsFromCart(userId, input.cart_item_ids);
  return createOrderFromItems(
    userId,
    cartItems.map((item) => ({ voucher_product_id: item.voucher_product_id as string, quantity: Number(item.quantity) })),
    input,
    { id: cart.id as string, itemIds: cartItems.map((item) => item.id as string) },
  );
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  if (input.cart_item_ids?.length) {
    const { cart, cartItems } = await itemsFromCart(userId, input.cart_item_ids);
    return createOrderFromItems(
      userId,
      cartItems.map((item) => ({ voucher_product_id: item.voucher_product_id as string, quantity: Number(item.quantity) })),
      input,
      { id: cart.id as string, itemIds: cartItems.map((item) => item.id as string) },
    );
  }
  return createOrderFromItems(userId, input.items ?? [], input);
}

async function getOrder(id: string) {
  return requireData<Record<string, unknown>>(await prisma.order.findUnique({
    where: { id },
    include: {
      users: { select: { full_name: true } },
      complaints: true,
      order_items: {
        include: {
          voucher_products: {
            select: {
              id: true,
              name: true,
              thumbnail_url: true,
              partner_id: true,
              partners: {
                select: {
                  business_name: true,
                },
              },
            },
          },
          issued_vouchers: { include: { reviews: true, complaints: true } },
        },
      },
      payments: true,
    },
  }) as unknown as Record<string, unknown> | null, "Order not found");
}

function assertOrderAccess(user: CurrentUser, order: Record<string, unknown>) {
  if (isAdmin(user) || order.user_id === user.id) return;
  const items = (order.order_items as Array<Record<string, unknown>> | undefined) ?? [];
  if (user.partnerId && items.some((item) => (item.voucher_products as Record<string, unknown>)?.partner_id === user.partnerId)) return;
  throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
}

function assertCanMutateOrder(user: CurrentUser, order: Record<string, unknown>) {
  if (user.role === "admin_operations" || order.user_id === user.id) return;
  throw new HttpError(403, "Only the buyer who created the order can modify it", "FORBIDDEN");
}

function buildOrderListWhere(user: CurrentUser, query?: { status?: string; payment_status?: string; search?: string }) {
  const and: Record<string, unknown>[] = [];

  if (user.role === "buyer") {
    and.push({ user_id: user.id });
  } else if (isPartnerStaff(user.role)) {
    and.push(user.partnerId
      ? { order_items: { some: { voucher_products: { partner_id: user.partnerId } } } }
      : { id: "__no_access__" });
  }

  if (query?.search) {
    and.push({
      OR: [
        { order_code: { contains: query.search, mode: "insensitive" } },
        { users: { full_name: { contains: query.search, mode: "insensitive" } } },
        { users: { email: { contains: query.search, mode: "insensitive" } } },
        { order_items: { some: { voucher_products: {
          ...(isPartnerStaff(user.role) && user.partnerId ? { partner_id: user.partnerId } : {}),
          name: { contains: query.search, mode: "insensitive" },
        } } } },
      ],
    });
  }

  const where: Record<string, unknown> = and.length > 0 ? { AND: and } : {};
  if (query?.status) {
    if (query.status === "complaining") {
      where.complaints = { some: { status: "open" } };
    } else {
      where.status = { in: storedStatuses(query.status) };
    }
  }
  if (query?.payment_status) where.payment_status = query.payment_status;
  return where;
}

function buildCountsByStatus(grouped: Array<{ status: string; _count: { _all: number } }>) {
  const counts: Record<string, number> = { all: 0 };
  for (const status of ORDER_STATUS_VALUES) counts[status] = 0;
  for (const row of grouped) {
    const status = normalizeOrderStatus(row.status);
    counts[status] += row._count._all;
    counts.all += row._count._all;
  }
  return counts;
}

function buildCountsByPaymentStatus(grouped: Array<{ payment_status: string; _count: { _all: number } }>) {
  const counts: Record<string, number> = { all: 0 };
  for (const status of ORDER_PAYMENT_STATUS_VALUES) counts[status] = 0;
  for (const row of grouped) {
    const status = row.payment_status as OrderPaymentStatus;
    if (ORDER_PAYMENT_STATUS_VALUES.includes(status)) counts[status] += row._count._all;
    counts.all += row._count._all;
  }
  return counts;
}

export async function listOrders(
  user: CurrentUser,
  query?: { status?: string; payment_status?: string; search?: string; page?: number; limit?: number }
) {
  const where = buildOrderListWhere(user, query);
  const countsWhere = buildOrderListWhere(user, { search: query?.search });

  const page = query?.page ?? 1;
  const limit = query?.limit ?? 20;
  const skip = (page - 1) * limit;
  const [data, total, groupedCounts, groupedPaymentCounts, complainingCount] = await prisma.$transaction([
    prisma.order.findMany({
    where,
    select: {
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
      complaints: {
        where: user.role === "buyer" ? { user_id: user.id } : {},
        select: { id: true },
        take: 1,
      },
      payments: { select: { status: true } },
      order_items: {
        where: isPartnerStaff(user.role) && user.partnerId ? { voucher_products: { partner_id: user.partnerId } } : undefined,
        select: {
          voucher_product_id: true,
          quantity: true,
          subtotal: true,
          voucher_products: { select: { name: true, partners: { select: { business_name: true } } } },
          _count: { select: { issued_vouchers: true } },
          issued_vouchers: {
            select: {
              reviews: user.role === "buyer"
                ? { where: { user_id: user.id }, select: { id: true } }
                : { select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" }
    , skip, take: limit }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], where: countsWhere, orderBy: { status: "asc" }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["payment_status"], where: countsWhere, orderBy: { payment_status: "asc" }, _count: { _all: true } }),
    prisma.order.count({
      where: {
        ...countsWhere,
        complaints: { some: { status: "open" } },
      },
    }),
  ]);

  const items = data.map((order) => {
    const { complaints, order_items, payments } = order;
    const summary = { ...order } as Record<string, unknown>;
    delete summary.complaints;
    delete summary.order_items;
    delete summary.payments;
    delete summary.subtotal;
    delete summary.discount_amount;
    return {
      ...summary,
      status: normalizeOrderStatus(order.status),
      payment_status: order.payment_status ?? derivePaymentStatus((payments ?? []) as PaymentRecord[]),
      total_amount: isPartnerStaff(user.role)
        ? order_items.reduce((sum, item) => sum + Number(item.subtotal), 0)
        : summary.total_amount,
      has_complaint: !isPartnerStaff(user.role) && (complaints ?? []).length > 0,
      order_items: order_items.map(({ issued_vouchers, _count, subtotal: _subtotal, ...item }) => ({
        ...item,
        issued_voucher_count: _count.issued_vouchers,
        has_review: (issued_vouchers ?? []).some((voucher) => (voucher.reviews ?? []).length > 0),
      })),
    };
  });

  return {
    ...buildPaginatedResult(items, total, { page, limit }),
    countsByStatus: {
      ...buildCountsByStatus(groupedCounts as Array<{ status: string; _count: { _all: number } }>),
      complaining: complainingCount as number,
    },
    countsByPaymentStatus: buildCountsByPaymentStatus(groupedPaymentCounts as Array<{ payment_status: string; _count: { _all: number } }>),
  };
}

function toSafePayment(payment: Record<string, unknown>) {
  return {
    id: payment.id,
    order_id: payment.order_id,
    method: payment.method,
    amount: payment.amount,
    status: payment.status,
    paid_at: payment.paid_at,
    refunded_at: payment.refunded_at,
    created_at: payment.created_at,
  };
}

function toPartnerPayment(payment: Record<string, unknown>) {
  return {
    id: payment.id,
    order_id: payment.order_id,
    method: payment.method,
    status: payment.status,
    paid_at: payment.paid_at,
    refunded_at: payment.refunded_at,
    created_at: payment.created_at,
  };
}

export async function getOrderById(user: CurrentUser, id: string): Promise<Record<string, unknown>> {
  const order = await getOrder(id);
  assertOrderAccess(user, order);
  const isBuyer = user.role === "buyer";
  const ownsIssuedVouchers = order.recipient_id ? order.recipient_id === user.id : order.user_id === user.id;
  const safePayments = ((order.payments as Array<Record<string, unknown>> | undefined) ?? []).map(toSafePayment);
  const buyerOrder = {
    ...order,
    payments: safePayments,
    complaints: ((order.complaints as Array<Record<string, unknown>> | undefined) ?? [])
      .filter((complaint) => complaint.user_id === user.id),
    order_items: ((order.order_items as Array<Record<string, unknown>> | undefined) ?? []).map((item) => ({
      ...item,
      issued_vouchers: ownsIssuedVouchers
        ? ((item.issued_vouchers as Array<Record<string, unknown>> | undefined) ?? []).map((voucher) => ({
            ...voucher,
            complaints: ((voucher.complaints as Array<Record<string, unknown>> | undefined) ?? [])
              .filter((complaint) => complaint.user_id === user.id),
          }))
        : [],
    })),
  };
  const partnerItems = ((order.order_items as Array<Record<string, unknown>> | undefined) ?? [])
    .filter((item) => (item.voucher_products as Record<string, unknown> | undefined)?.partner_id === user.partnerId);
  const partnerOrder = {
    ...order,
    subtotal: partnerItems.reduce((sum, item) => sum + Number(item.subtotal ?? 0), 0),
    discount_amount: 0,
    total_amount: partnerItems.reduce((sum, item) => sum + Number(item.subtotal ?? 0), 0),
    order_items: partnerItems,
    complaints: [],
    payments: ((order.payments as Array<Record<string, unknown>> | undefined) ?? []).map(toPartnerPayment),
  };
  const visibleOrder = isBuyer ? buyerOrder : isPartnerStaff(user.role) ? partnerOrder : order;
  return {
    ...visibleOrder,
    status: normalizeOrderStatus(order.status),
    payment_status: derivePaymentStatus(order.payments as PaymentRecord[]),
  };
}

export async function getOrderReviewTargets(userId: string, orderId: string) {
  const order = requireData(await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      user_id: true,
      status: true,
      order_items: {
        select: {
          id: true,
          voucher_product_id: true,
          quantity: true,
          unit_price: true,
          voucher_products: {
            select: {
              id: true,
              name: true,
              thumbnail_url: true,
              partners: { select: { business_name: true } },
            },
          },
          issued_vouchers: {
            select: {
              id: true,
              status: true,
              reviews: {
                where: { user_id: userId },
                select: {
                  id: true,
                  rating: true,
                  comment: true,
                  media_urls: true,
                  is_published: true,
                  created_at: true,
                  updated_at: true,
                },
              },
            },
          },
        },
      },
    },
  }), "Order not found");

  if (order.user_id !== userId) {
    throw new HttpError(403, "Only the buyer who created the order can view review targets", "FORBIDDEN");
  }

  const paidOrder = ["confirmed", "completed"].includes(normalizeOrderStatus(order.status));
  return {
    order_id: order.id,
    order_items: order.order_items.map((item) => ({
      order_item_id: item.id,
      voucher_product_id: item.voucher_product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      voucher_product: item.voucher_products,
      issued_vouchers: item.issued_vouchers.map((voucher) => ({
        issued_voucher_id: voucher.id,
        review: voucher.reviews[0] ?? null,
        reviewable: (paidOrder || voucher.status === "used") && voucher.reviews.length === 0,
      })),
    })),
  };
}

export async function updateOrder(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const order = await getOrder(id);
  assertOrderAccess(user, order);
  assertCanMutateOrder(user, order);
  if (input.status) {
    throw new HttpError(409, "Order status must be changed through its dedicated action", "INVALID_STATUS_TRANSITION");
  }
  return prisma.order.update({ where: { id }, data: { note: input.note as string | null | undefined, updated_at: new Date() } });
}

export async function cancelOrder(user: CurrentUser, id: string, reason?: string) {
  const order = requireData<Record<string, unknown>>(
    await prisma.order.findUnique({
      where: { id },
      include: {
        payments: true,
        order_items: { include: { issued_vouchers: { include: { voucher_usages: true } } } }
      }
    }) as unknown as Record<string, unknown> | null,
    "Order not found"
  );
  assertOrderAccess(user, order);
  assertCanMutateOrder(user, order);
  const status = normalizeOrderStatus(order.status);

  if (["completed", "refunded"].includes(status)) {
    throw new HttpError(409, "Completed or refunded orders cannot be cancelled", "ORDER_CANNOT_CANCEL");
  }

  if (status === "cancelled") {
    throw new HttpError(409, "Đơn hàng đã bị hủy", "ORDER_ALREADY_CANCELLED");
  }

  if (status === "confirmed" && user.role !== "admin_operations") {
    throw new HttpError(403, "Only operations administrators can cancel a paid order", "FORBIDDEN");
  }

  const orderItems = (order.order_items as Array<Record<string, unknown>>) ?? [];
  const hasUsedVoucher = orderItems.some((item) =>
    ((item.issued_vouchers as Array<Record<string, unknown>>) ?? []).some(
      (v) => ((v.voucher_usages as unknown[]) ?? []).length > 0
    )
  );
  if (hasUsedVoucher) {
    throw new HttpError(409, "An order with used vouchers cannot be cancelled", "ORDER_HAS_USED_VOUCHERS");
  }
  const wasPaid = ((order.payments as Array<Record<string, unknown>>) ?? []).some((payment) => payment.status === "success");
  const pendingPayments = ((order.payments as Array<Record<string, unknown>>) ?? [])
    .filter((payment) => payment.status === "pending" || payment.status === "processing");

  return prisma.$transaction(async (tx) => {
    const data = await tx.order.update({
      where: { id },
      data: { status: "cancelled", payment_status: wasPaid ? "paid" : "failed", updated_at: new Date() }
    });

    if (pendingPayments.length > 0) {
      await tx.payment.updateMany({
        where: { id: { in: pendingPayments.map((payment) => payment.id as string) } },
        data: { status: "failed", gateway_response: reason ?? "ORDER_CANCELLED" },
      });
      for (const payment of pendingPayments) {
        await tx.paymentLog.create({
          data: {
            payment_id: payment.id as string,
            order_id: id,
            user_id: user.id,
            action: "PAYMENT_CANCELLED_WITH_ORDER",
            status: "failed",
            amount: payment.amount as never,
          },
        });
      }
    }

    if (wasPaid) {
      for (const item of orderItems) {
        const activeVoucherCount = ((item.issued_vouchers as Array<Record<string, unknown>>) ?? [])
          .filter((voucher) => voucher.status === "active").length;
        if (activeVoucherCount === 0) continue;
        await tx.issuedVoucher.updateMany({
          where: { order_item_id: item.id as string, status: "active" },
          data: { status: "refunded" }
        });
        await tx.voucherProduct.update({
          where: { id: item.voucher_product_id as string },
          data: { remaining_quantity: { increment: activeVoucherCount } }
        });
      }
    }

    await tx.orderLog.create({
      data: {
        order_id: id,
        user_id: user.id,
        action: "CANCEL_ORDER",
        description: reason ?? "Order cancelled"
      }
    });

    if (user.role === "admin_operations") {
      await tx.adminLog.create({
        data: {
          admin_id: user.id,
          target_order_id: id,
          action: "order.cancel",
          description: `Hủy đơn ${order.order_code}`
        }
      });
    }

    return data;
  });
}

export async function refundOrder(user: CurrentUser, id: string, note?: string) {
  if (user.role !== "admin_operations") {
    throw new HttpError(403, "Không có quyền thực hiện hoàn tiền", "FORBIDDEN");
  }

  const order = await getOrder(id);
  const orderStatus = String(order.status);

  if (orderStatus !== "cancelled") {
    throw new HttpError(409, "Chỉ hoàn tiền cho đơn hàng đã hủy", "ORDER_NOT_CANCELLED");
  }

  const payments = (order.payments as Array<Record<string, unknown>>) ?? [];
  if (payments.some((payment) => payment.status === "refunded")) {
    throw new HttpError(409, "Đơn hàng đã được hoàn tiền", "ORDER_ALREADY_REFUNDED");
  }
  const successPayment = payments.find((payment) => payment.status === "success");

  if (!successPayment) {
    throw new HttpError(409, "Chỉ hoàn tiền cho đơn đã thanh toán", "ORDER_NOT_PAID");
  }

  const provider = String(successPayment.method);
  const transactionRef = String(successPayment.transaction_ref || "");

  let refundResult: { refundId: string; gatewayResponse: unknown };

  // Simulated payment → simulate refund (don't call real gateway)
  if (transactionRef.startsWith("SIM-")) {
    refundResult = {
      refundId: `SIM-REFUND-${Date.now()}`,
      gatewayResponse: { provider, mode: "simulated-refund", transactionRef },
    };
  } else if (provider === "paypal" && transactionRef) {
    const gatewayData = providerResponse(successPayment.gateway_response);
    const realCaptureId = extractPaypalCaptureId(gatewayData) ?? transactionRef;
    refundResult = await refundPayPalPayment({
      captureId: realCaptureId,
      amountVnd: Number(order.total_amount),
      orderCode: String(order.order_code),
      note,
    });
  } else if (provider === "vnpay" && transactionRef) {
    const gatewayData = providerResponse(successPayment.gateway_response);
    const transactionNo = String(gatewayData.vnp_TransactionNo || "");
    if (!transactionNo) {
      throw new HttpError(422, "Thiếu vnp_TransactionNo của giao dịch gốc, không thể hoàn tiền", "VNPAY_TRANSACTION_NO_MISSING");
    }
    const transactionDate = successPayment.paid_at
      ? formatVnpayDate(new Date(successPayment.paid_at as string | Date))
      : "";
    refundResult = await refundVnpayPayment({
      transactionRef,
      transactionNo,
      transactionDate,
      amountVnd: Number(order.total_amount),
      orderCode: String(order.order_code),
      createdBy: user.id,
      reason: note,
    });
  } else {
    throw new HttpError(422, `Không hỗ trợ hoàn tiền cho phương thức ${provider}`, "UNSUPPORTED_REFUND_PROVIDER");
  }

  return prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: successPayment.id as string },
      data: {
        status: "refunded",
        refund_ref: refundResult.refundId,
        refunded_at: new Date(),
        gateway_response: JSON.stringify(refundResult.gatewayResponse),
      }
    });

    await tx.order.update({
      where: { id },
      data: { status: "refunded", payment_status: "refunded", updated_at: new Date() }
    });

    await tx.paymentLog.create({
      data: {
        payment_id: successPayment.id as string,
        order_id: id,
        user_id: user.id,
        action: "REFUND",
        status: "refunded",
        amount: order.total_amount as never
      }
    });

    await tx.orderLog.create({
      data: {
        order_id: id,
        user_id: user.id,
        action: "REFUND_ORDER",
        description: `Hoàn tiền (gateway ref: ${refundResult.refundId}): ${note || "Admin ghi nhận hoàn tiền"}`
      }
    });

    await tx.adminLog.create({
      data: {
        admin_id: user.id,
        target_order_id: id,
        action: "order.refund",
        description: `Hoàn tiền đơn ${order.order_code} (${refundResult.refundId})`
      }
    });

    return {
      ...order,
      status: "refunded",
      payment_status: "refunded" as const,
      refund_ref: refundResult.refundId,
      refunded_at: new Date(),
    };
  });
}

export async function listOrderItems(user: CurrentUser, orderId: string) {
  const order = await getOrderById(user, orderId);
  return order.order_items ?? [];
}

export async function getOrderItem(user: CurrentUser, id: string) {
  const item = requireData<Record<string, unknown>>(await prisma.orderItem.findUnique({
    where: { id },
    include: { orders: { include: { order_items: { include: { voucher_products: { select: { id: true, name: true, partner_id: true, partners: { select: { business_name: true } } } } } } } } }
  }) as unknown as Record<string, unknown> | null, "Order item not found");
  const order = item.orders as Record<string, unknown>;
  assertOrderAccess(user, order);
  if (isPartnerStaff(user.role)) {
    const orderItems = (order.order_items as Array<Record<string, unknown>> | undefined) ?? [];
    const targetItem = orderItems.find((orderItem) => orderItem.id === item.id);
    if ((targetItem?.voucher_products as Record<string, unknown> | undefined)?.partner_id !== user.partnerId) {
      throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
    }
    const partnerOrderItems = orderItems.filter((orderItem) => (orderItem.voucher_products as Record<string, unknown> | undefined)?.partner_id === user.partnerId);
    const partnerTotal = partnerOrderItems.reduce((sum, orderItem) => sum + Number(orderItem.subtotal ?? 0), 0);
    return {
      ...item,
      orders: {
        ...order,
        subtotal: partnerTotal,
        discount_amount: 0,
        total_amount: partnerTotal,
        order_items: partnerOrderItems,
      },
    };
  }
  return item;
}

export async function listPayments(user: CurrentUser, orderId: string) {
  const order = await getOrderById(user, orderId);
  return order.payments ?? [];
}

export async function createPayment(
  user: CurrentUser,
  orderId: string,
  method?: string
): Promise<Record<string, unknown> & { checkout_url: string }> {
  const order = await getOrder(orderId);

  assertOrderAccess(user, order);
  assertCanMutateOrder(user, order);
  const orderStatus = normalizeOrderStatus(order.status);

  if (
    ![
      "pending_payment",
      "payment_failed",
    ].includes(orderStatus)
  ) {
    const isPaid = [
      "confirmed",
      "completed",
      "refunded",
    ].includes(orderStatus);

    throw new HttpError(
      409,
      isPaid ? "Order already paid" : "Order is not payable",
      isPaid ? "ORDER_ALREADY_PAID" : "ORDER_NOT_PAYABLE"
    );
  }

  if (
    order.payment_expires_at &&
    new Date(order.payment_expires_at as string | Date) <= new Date()
  ) {
    await cancelExpiredOrder(orderId, user.id);

    throw new HttpError(
      409,
      "Order payment window has expired",
      "ORDER_PAYMENT_EXPIRED"
    );
  }

  const provider = (
    method ?? order.payment_method
  ) as PaymentProvider | "simulated";

  if (
    provider !== "vnpay" &&
    provider !== "paypal" &&
    provider !== "simulated"
  ) {
    throw new HttpError(
      422,
      "Unsupported payment provider",
      "PAYMENT_METHOD_INVALID"
    );
  }

  const hasSuccessPayment = (
    order.payments as PaymentRecord[] ?? []
  ).some((p) => p.status === "success");

  if (hasSuccessPayment) {
    throw new HttpError(
      409,
      "Order already paid",
      "ORDER_ALREADY_PAID"
    );
  }

  const pendingPayment = ((order.payments as Array<Record<string, unknown>>) ?? [])
    .find((candidate) => candidate.status === "pending" && candidate.method === provider);
  if (pendingPayment) {
    const gatewayData = safeParseJson(pendingPayment.gateway_response);
    const checkoutUrl = typeof gatewayData.checkout_url === "string" ? gatewayData.checkout_url : undefined;
    if (checkoutUrl) return { ...pendingPayment, checkout_url: checkoutUrl };
    throw new HttpError(409, "Payment session is still being initialized", "PAYMENT_INITIALIZING");
  }

  const paymentAttempt = await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findFirst({
      where: { order_id: orderId, method: provider, status: "pending" },
      orderBy: { created_at: "desc" },
    });
    if (existing) return { payment: existing, reused: true };

    const data = await tx.payment.create({
      data: {
        order_id: orderId,
        method: provider,
        amount: order.total_amount as never,
      },
    });

    await tx.paymentLog.create({
      data: {
        payment_id: data.id,
        order_id: orderId,
        user_id: user.id,
        action: "PAYMENT_CREATED",
        status: "pending",
        amount: data.amount,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: {
        payment_method: provider,
        payment_status: "pending",
        updated_at: new Date(),
      },
    });

    return { payment: data, reused: false };
  }, { isolationLevel: "Serializable" });

  const payment = paymentAttempt.payment;
  if (paymentAttempt.reused) {
    const gatewayData = safeParseJson(payment.gateway_response);
    const checkoutUrl = typeof gatewayData.checkout_url === "string" ? gatewayData.checkout_url : undefined;
    if (checkoutUrl) return { ...payment, checkout_url: checkoutUrl };
    throw new HttpError(409, "Payment session is still being initialized", "PAYMENT_INITIALIZING");
  }

  try {
    if (provider === "simulated") {
      const legacy = createSimulatedPayment(provider, orderId);
      const data = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          transaction_ref: legacy.transactionRef,
          gateway_response: JSON.stringify({ provider_response: safeParseJson(legacy.gatewayResponse), checkout_url: legacy.checkoutUrl }),
        },
      });
      return { ...data, checkout_url: legacy.checkoutUrl };
    }

    const request = {
      paymentId: payment.id,
      orderCode: String(order.order_code),
      amountVnd: Number(order.total_amount),
    };

    const gateway =
      provider === "paypal"
        ? await createPayPalPayment(request)
        : createVnpayPayment(request);

    return prisma.payment
      .update({
        where: { id: payment.id },
        data: {
          transaction_ref: gateway.transactionRef,
          gateway_response: JSON.stringify({ provider_response: gateway.gatewayResponse, checkout_url: gateway.checkoutUrl }),
        },
      })
      .then((data) => ({
        ...data,
        checkout_url: gateway.checkoutUrl,
      }));
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "payment.provider.create.failed",
        provider,
        paymentId: payment.id,
        orderId,
        orderCode: order.order_code,
        stage: "provider.create_or_payment.update",
        error: errorForLog(error),
      })
    );

    try {
      await markPaymentFailed(
        payment.id,
        user.id,
        "PAYMENT_PROVIDER_CREATE_FAILED"
      );
    } catch (markError) {
      console.error(
        JSON.stringify({
          event: "payment.failure.log.failed",
          provider,
          paymentId: payment.id,
          orderId,
          stage: "mark_payment_failed",
          error: errorForLog(markError),
        })
      );
    }

    throw error;
  }
}

async function cancelExpiredOrder(orderId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["pending", "pending_payment", "payment_failed"] } },
      data: { status: "cancelled", payment_status: "failed", updated_at: new Date() }
    });
    if (updated.count === 0) return null;
    await tx.payment.updateMany({
      where: { order_id: orderId, status: { in: ["pending", "processing"] } },
      data: { status: "failed", gateway_response: "ORDER_PAYMENT_EXPIRED" },
    });
    await tx.orderLog.create({
      data: {
        order_id: orderId,
        user_id: userId,
        action: "CANCEL_ORDER_EXPIRED",
        description: "Order cancelled because the payment window expired"
      }
    });
    return tx.order.findUnique({ where: { id: orderId } });
  });
}

export async function expirePendingOrders(now = new Date()) {
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: { in: ["pending", "pending_payment", "payment_failed"] },
      payment_expires_at: { lte: now },
    },
    select: { id: true, user_id: true },
  });
  for (const order of expiredOrders) {
    await cancelExpiredOrder(order.id, order.user_id);
  }
  return expiredOrders.length;
}

async function markPaymentFailed(paymentId: string, userId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: { in: ["pending", "processing"] } },
      data: { status: "failed", gateway_response: reason }
    });
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new HttpError(404, "Payment not found", "PAYMENT_NOT_FOUND");
    if (claimed.count === 0) return payment;
    await tx.order.updateMany({
      where: { id: payment.order_id, status: { in: ["pending", "pending_payment", "payment_failed"] } },
      data: { payment_status: "failed", status: "payment_failed", updated_at: new Date() }
    });
    await tx.paymentLog.create({
      data: {
        payment_id: paymentId,
        order_id: payment.order_id,
        user_id: userId,
        action: "PAYMENT_FAILED",
        status: "failed",
        amount: payment.amount as never
      }
    });
    return payment;
  });
}

async function completePayment(
  paymentId: string,
  userId: string,
  payment: Record<string, unknown>,
  order: Record<string, unknown>,
  orderItems: Array<Record<string, unknown>>
) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const orderClaim = await tx.order.updateMany({
      where: { id: order.id as string, status: { in: ["pending", "pending_payment", "payment_failed"] } },
      data: { payment_status: "paid", status: "confirmed", updated_at: now },
    });
    if (orderClaim.count === 0) {
      const currentOrder = await tx.order.findUnique({ where: { id: order.id as string }, select: { status: true } });
      if (currentOrder && ["confirmed", "completed", "refunded"].includes(normalizeOrderStatus(currentOrder.status))) {
        throw new HttpError(409, "Payment already completed", "PAYMENT_ALREADY_COMPLETED");
      }
      throw new HttpError(409, "Order is not payable", "ORDER_NOT_PAYABLE");
    }

    for (const item of orderItems) {
      const voucher = item.voucher_products as Voucher;
      await getSellableVoucher(voucher.id, Number(item.quantity));
      const stockUpdate = await tx.voucherProduct.updateMany({
        where: { id: voucher.id, remaining_quantity: { gte: Number(item.quantity) } },
        data: { remaining_quantity: { decrement: Number(item.quantity) } }
      });
      if (stockUpdate.count === 0) throw new HttpError(409, "Insufficient voucher quantity", "INSUFFICIENT_STOCK");

      const issued = Array.from({ length: Number(item.quantity) }, () => {
        const code = generateVoucherCode();
        const issuedDate = new Date();
        const expiredDate = new Date(issuedDate);
        expiredDate.setDate(expiredDate.getDate() + Number(voucher.validity_days));
        return {
          voucher_code: code,
          qr_code_payload: code,
          order_item_id: item.id as string,
          voucher_product_id: voucher.id,
          owner_id: order.recipient_id as string,
          issued_date: issuedDate,
          expired_date: expiredDate,
          status: "active"
        };
      });
      await tx.issuedVoucher.createMany({ data: issued });
    }

    const data = await tx.payment.update({ where: { id: paymentId }, data: { status: "success", paid_at: now } });
    await tx.paymentLog.create({ data: { payment_id: paymentId, order_id: order.id as string, user_id: userId, action: "PAYMENT_SUCCESS", status: "success", amount: payment.amount as never } });
    await tx.orderLog.create({ data: { order_id: order.id as string, user_id: userId, action: "PAYMENT_SUCCESS", description: "Payment completed and vouchers issued" } });
    return data;
  });
}

export async function getCartCount(userId: string) {
  const cart = await getOrCreateCart(userId);
  return prisma.cartItem.count({ where: { cart_id: cart.id as string } });
}

function errorForLog(error: unknown) {
  if (error instanceof HttpError) return { name: error.name, message: error.message, code: error.code, details: error.details, stack: error.stack };
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  return { name: "UnknownError", message: String(error) };
}

async function getPayment(id: string) {
  return requireData<Record<string, unknown>>(await prisma.payment.findUnique({
    where: { id },
    include: { orders: { include: { order_items: { include: { voucher_products: true } } } } }
  }) as unknown as Record<string, unknown> | null, "Payment not found");
}

export async function getPaymentById(user: CurrentUser, id: string) {
  const payment = await getPayment(id);
  assertOrderAccess(user, payment.orders as Record<string, unknown>);
  if (isAdmin(user)) return payment;
  if (isPartnerStaff(user.role)) return toPartnerPayment(payment);
  return toSafePayment(payment);
}

export async function simulatePaymentSuccess(user: CurrentUser, id: string) {
  const payment = await getPayment(id);
  const order = payment.orders as Record<string, unknown>;
  assertOrderAccess(user, order);
  assertCanMutateOrder(user, order);
  if (payment.status === "success" || ["confirmed", "completed", "refunded"].includes(String(order.status))) throw new HttpError(409, "Payment already completed", "PAYMENT_ALREADY_COMPLETED");
  if (!["pending_payment", "payment_failed"].includes(normalizeOrderStatus(order.status))) throw new HttpError(409, "Order is not payable", "ORDER_NOT_PAYABLE");
  if (order.payment_expires_at && new Date(order.payment_expires_at as string | Date) <= new Date()) {
    await cancelExpiredOrder(order.id as string, user.id);
    throw new HttpError(409, "Order payment window has expired", "ORDER_PAYMENT_EXPIRED");
  }
  const orderItems = (order.order_items as Array<Record<string, unknown>>) ?? [];
  await prisma.payment.update({
    where: { id },
    data: { transaction_ref: `SIM-${Date.now()}`, gateway_response: "simulated success" },
  });
  return completePayment(id, user.id, payment, order, orderItems);
}

function providerResponse(value: unknown): Record<string, unknown> {
  const parsed = safeParseJson(value);
  return parsed.provider_response && typeof parsed.provider_response === "object"
    ? parsed.provider_response as Record<string, unknown>
    : parsed;
}

async function markCapturedPaymentUnfulfilled(paymentId: string, userId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "success", paid_at: new Date() },
    });
    await tx.order.updateMany({
      where: { id: payment.order_id, status: { in: ["pending", "pending_payment", "payment_failed"] } },
      data: { status: "cancelled", payment_status: "paid", updated_at: new Date() },
    });
    await tx.paymentLog.create({
      data: { payment_id: paymentId, order_id: payment.order_id, user_id: userId, action: "PAYMENT_CAPTURED_FULFILLMENT_FAILED", status: "success", amount: payment.amount },
    });
    await tx.orderLog.create({
      data: { order_id: payment.order_id, user_id: userId, action: "CANCEL_ORDER_FULFILLMENT_FAILED", description: reason },
    });
    return payment;
  });
}

export async function simulatePaymentFailed(user: CurrentUser, id: string) {
  const payment = await getPayment(id);
  const order = payment.orders as Record<string, unknown>;
  assertOrderAccess(user, order);
  assertCanMutateOrder(user, order);
  if (payment.status === "success") throw new HttpError(409, "Payment already completed", "PAYMENT_ALREADY_COMPLETED");
  return markPaymentFailed(id, user.id, "SIMULATED_PAYMENT_FAILED");
}

async function paymentByTransactionRef(transactionRef: string) {
  return requireData<Record<string, unknown>>(await prisma.payment.findFirst({
    where: { transaction_ref: transactionRef },
    include: { orders: { include: { order_items: { include: { voucher_products: true } } } } },
  }) as unknown as Record<string, unknown> | null, "Payment not found");
}

function redirectResult(orderId: string, status: "success" | "failed") {
  return `${env.FRONTEND_URL}/checkout/payment/result?orderId=${encodeURIComponent(orderId)}&status=${status}`;
}

function paymentWindowExpired(order: Record<string, unknown>) {
  return Boolean(order.payment_expires_at && new Date(order.payment_expires_at as string | Date) <= new Date());
}

export async function handleVnpayReturn(query: Record<string, unknown>) {
  const result = verifyVnpayReturn(query);
  const payment = await paymentByTransactionRef(result.transactionRef);
  const order = payment.orders as Record<string, unknown>;
  if (payment.status === "success" || ["confirmed", "completed", "refunded"].includes(normalizeOrderStatus(order.status))) {
    return redirectResult(order.id as string, "success");
  }
  const successfulReturn = result.validSignature && result.validTmnCode && result.responseCode === "00" && result.transactionStatus === "00" && result.amount === Number(payment.amount);
  if (successfulReturn && normalizeOrderStatus(order.status) === "cancelled") {
    await markCapturedPaymentUnfulfilled(payment.id as string, order.user_id as string, "VNPAY payment returned after the order was cancelled");
    return redirectResult(order.id as string, "failed");
  }
  if (successfulReturn && paymentWindowExpired(order)) {
    await markCapturedPaymentUnfulfilled(payment.id as string, order.user_id as string, "VNPAY payment returned after the order expired");
    return redirectResult(order.id as string, "failed");
  }
  if (successfulReturn) {
    try {
      const existing = safeParseJson(payment.gateway_response);
      await prisma.payment.update({
        where: { id: payment.id as string },
        data: { gateway_response: JSON.stringify({
          ...existing,
          provider_response: { ...providerResponse(existing), vnp_TransactionNo: result.transactionNo, vnp_ResponseCode: result.responseCode },
        }) }
      });
      await completePayment(payment.id as string, order.user_id as string, payment, order, order.order_items as Array<Record<string, unknown>>);
      return redirectResult(order.id as string, "success");
    } catch (error) {
      console.error("VNPay fulfillment failed", error instanceof Error ? error.message : "UnknownError");
      if (error instanceof HttpError && error.code === "PAYMENT_ALREADY_COMPLETED") return redirectResult(order.id as string, "success");
      await markCapturedPaymentUnfulfilled(payment.id as string, order.user_id as string, "VNPAY_FULFILLMENT_FAILED");
      return redirectResult(order.id as string, "failed");
    }
  }
  await markPaymentFailed(payment.id as string, order.user_id as string, `VNPAY_FAILED_${result.responseCode}`);
  return redirectResult(order.id as string, "failed");
}

export async function handlePayPalReturn(token: string) {
  const payment = await paymentByTransactionRef(token);
  const order = payment.orders as Record<string, unknown>;
  if (payment.status === "success" || ["confirmed", "completed", "refunded"].includes(normalizeOrderStatus(order.status))) return redirectResult(order.id as string, "success");
  if (normalizeOrderStatus(order.status) === "cancelled") return redirectResult(order.id as string, "failed");
  if (paymentWindowExpired(order)) {
    await markPaymentFailed(payment.id as string, order.user_id as string, "PAYPAL_PAYMENT_EXPIRED");
    await cancelExpiredOrder(order.id as string, order.user_id as string);
    return redirectResult(order.id as string, "failed");
  }
  let captured: Awaited<ReturnType<typeof capturePayPalPayment>>;
  try {
    captured = await capturePayPalPayment(token, Number(payment.amount));
  } catch (error) {
    console.error(JSON.stringify({
      event: "payment.paypal.capture.failed",
      provider: "paypal",
      paymentId: payment.id,
      orderId: order.id,
      transactionRef: token,
      error: errorForLog(error),
    }));
    await markPaymentFailed(payment.id as string, order.user_id as string, "PAYPAL_CAPTURE_FAILED");
    return redirectResult(order.id as string, "failed");
  }

  try {
    const existing = safeParseJson(payment.gateway_response);
    await prisma.payment.update({
      where: { id: payment.id as string },
      data: { gateway_response: JSON.stringify({ ...existing, provider_response: captured.gatewayResponse }) },
    });
    await completePayment(payment.id as string, order.user_id as string, payment, order, order.order_items as Array<Record<string, unknown>>);
    return redirectResult(order.id as string, "success");
  } catch (error) {
    console.error(JSON.stringify({
      event: "payment.paypal.callback.failed",
      provider: "paypal",
      paymentId: payment.id,
      orderId: order.id,
      transactionRef: token,
      stage: "fulfillment",
      error: errorForLog(error),
    }));
    if (error instanceof HttpError && error.code === "PAYMENT_ALREADY_COMPLETED") return redirectResult(order.id as string, "success");
    await markCapturedPaymentUnfulfilled(payment.id as string, order.user_id as string, "PAYPAL_FULFILLMENT_FAILED");
    return redirectResult(order.id as string, "failed");
  }
}

export async function handlePayPalCancel(token?: string) {
  if (token) {
    const payment = await prisma.payment.findFirst({ where: { transaction_ref: token }, include: { orders: true } });
    if (payment) {
      await markPaymentFailed(payment.id, payment.orders.user_id, "PAYPAL_CANCELLED");
      return redirectResult(payment.order_id, "failed");
    }
  }
  return `${env.FRONTEND_URL}/orders`;
}
