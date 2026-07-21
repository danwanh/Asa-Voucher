import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { adminRoles, type UserRole } from "../types/auth.types.js";
import { requireData } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";

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

function orderCode() {
  return `ORD${Date.now()}${crypto.randomInt(1000, 9999)}`;
}

function voucherCode() {
  return `VC${Date.now()}${crypto.randomInt(100000, 999999)}`;
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
  await getSellableVoucher(input.voucher_product_id, input.quantity);
  const cart = await getOrCreateCart(userId);
  const existing = await prisma.cartItem.findFirst({ where: { cart_id: cart.id as string, voucher_product_id: input.voucher_product_id } }) as unknown as Record<string, unknown> | null;

  if (existing) {
    const quantity = Number(existing.quantity) + input.quantity;
    await getSellableVoucher(input.voucher_product_id, quantity);
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

async function buildOrderItems(items: Array<{ voucher_product_id: string; quantity: number }>) {
  const orderItems = [];
  for (const item of items) {
    const voucher = await getSellableVoucher(item.voucher_product_id, item.quantity);
    const unitPrice = Number(voucher.selling_price);
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

async function createOrderFromItems(userId: string, items: Array<{ voucher_product_id: string; quantity: number }>, paymentMethod: string, note?: string) {
  const builtItems = await buildOrderItems(items);
  const subtotal = builtItems.reduce((sum, item) => sum + Number(item.orderItem.subtotal), 0);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: { order_code: orderCode(), user_id: userId, subtotal, discount_amount: 0, total_amount: subtotal, payment_method: paymentMethod, note } });
    const orderItems = await Promise.all(builtItems.map((item) => tx.orderItem.create({ data: { ...item.orderItem, order_id: order.id } })));
    await tx.orderLog.create({ data: { order_id: order.id, user_id: userId, action: "CREATE_ORDER", description: "Order created" } });
    return { ...order, items: orderItems };
  });
}

async function itemsFromCart(userId: string, cartItemIds?: string[]) {
  const cart = await getOrCreateCart(userId);
  const cartItems = await prisma.cartItem.findMany({
    where: { cart_id: cart.id as string, ...(cartItemIds?.length ? { id: { in: cartItemIds } } : {}) }
  });
  if (!cartItems.length) throw new HttpError(422, "Cart is empty", "EMPTY_CART");
  return { cart, cartItems: cartItems as unknown as Array<Record<string, unknown>> };
}

export async function checkout(userId: string, input: { cart_item_ids?: string[]; payment_method: string; note?: string }) {
  const { cart, cartItems } = await itemsFromCart(userId, input.cart_item_ids);
  const order = await createOrderFromItems(
    userId,
    cartItems.map((item) => ({ voucher_product_id: item.voucher_product_id as string, quantity: Number(item.quantity) })),
    input.payment_method,
    input.note
  );
  await prisma.cartItem.deleteMany({ where: { cart_id: cart.id as string, id: { in: cartItems.map((item) => item.id as string) } } });
  return order;
}

export async function createOrder(userId: string, input: { items?: Array<{ voucher_product_id: string; quantity: number }>; cart_item_ids?: string[]; payment_method: string; note?: string }) {
  if (input.cart_item_ids?.length) {
    const { cartItems } = await itemsFromCart(userId, input.cart_item_ids);
    return createOrderFromItems(userId, cartItems.map((item) => ({ voucher_product_id: item.voucher_product_id as string, quantity: Number(item.quantity) })), input.payment_method, input.note);
  }
  return createOrderFromItems(userId, input.items ?? [], input.payment_method, input.note);
}

async function getOrder(id: string) {
  return requireData<Record<string, unknown>>(await prisma.order.findUnique({
    where: { id },
    include: { order_items: { include: { voucher_products: { select: { partner_id: true } } } } }
  }) as unknown as Record<string, unknown> | null, "Order not found");
}

function assertOrderAccess(user: CurrentUser, order: Record<string, unknown>) {
  if (isAdmin(user) || order.user_id === user.id) return;
  const items = (order.order_items as Array<Record<string, unknown>> | undefined) ?? [];
  if (user.partnerId && items.some((item) => (item.voucher_products as Record<string, unknown>)?.partner_id === user.partnerId)) return;
  throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
}

export async function listOrders(user: CurrentUser) {
  const data = await prisma.order.findMany({
    where: user.role === "buyer" ? { user_id: user.id } : {},
    include: { order_items: { include: { voucher_products: { select: { partner_id: true } } } } },
    orderBy: { created_at: "desc" }
  });
  return data.filter((order) => {
    try {
      assertOrderAccess(user, order as unknown as Record<string, unknown>);
      return true;
    } catch {
      return false;
    }
  });
}

export async function getOrderById(user: CurrentUser, id: string) {
  const order = await getOrder(id);
  assertOrderAccess(user, order);
  return order;
}

export async function updateOrder(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const order = await getOrder(id);
  assertOrderAccess(user, order);
  if (!isAdmin(user) && input.status) throw new HttpError(403, "Only admin can update order status", "FORBIDDEN");
  return prisma.order.update({ where: { id }, data: { ...input, updated_at: new Date() } as never });
}

export async function cancelOrder(user: CurrentUser, id: string) {
  const order = await getOrder(id);
  assertOrderAccess(user, order);
  if (order.payment_status === "paid") throw new HttpError(409, "Paid order cannot be cancelled", "ORDER_ALREADY_PAID");
  return prisma.$transaction(async (tx) => {
    const data = await tx.order.update({ where: { id }, data: { status: "cancelled", updated_at: new Date() } });
    await tx.orderLog.create({ data: { order_id: id, user_id: user.id, action: "CANCEL_ORDER", description: "Order cancelled" } });
    return data;
  });
}

export async function listOrderItems(user: CurrentUser, orderId: string) {
  const order = await getOrder(orderId);
  assertOrderAccess(user, order);
  return order.order_items ?? [];
}

export async function getOrderItem(user: CurrentUser, id: string) {
  const item = requireData<Record<string, unknown>>(await prisma.orderItem.findUnique({
    where: { id },
    include: { orders: { include: { order_items: { include: { voucher_products: { select: { partner_id: true } } } } } } }
  }) as unknown as Record<string, unknown> | null, "Order item not found");
  assertOrderAccess(user, item.orders as Record<string, unknown>);
  return item;
}

export async function listPayments(user: CurrentUser, orderId: string) {
  const order = await getOrder(orderId);
  assertOrderAccess(user, order);
  return prisma.payment.findMany({ where: { order_id: orderId }, orderBy: { created_at: "desc" } });
}

export async function createPayment(user: CurrentUser, orderId: string, method?: string) {
  const order = await getOrder(orderId);
  assertOrderAccess(user, order);
  if (order.payment_status === "paid") throw new HttpError(409, "Order already paid", "ORDER_ALREADY_PAID");
  return prisma.$transaction(async (tx) => {
    const data = await tx.payment.create({ data: { order_id: orderId, method: method ?? (order.payment_method as string), amount: order.total_amount as never } });
    await tx.paymentLog.create({ data: { payment_id: data.id, order_id: orderId, user_id: user.id, action: "PAYMENT_CREATED", status: "pending", amount: data.amount } });
    return data;
  });
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
  return payment;
}

export async function simulatePaymentSuccess(user: CurrentUser, id: string) {
  const payment = await getPayment(id);
  const order = payment.orders as Record<string, unknown>;
  assertOrderAccess(user, order);
  if (payment.status === "success" || order.payment_status === "paid") throw new HttpError(409, "Payment already completed", "PAYMENT_ALREADY_COMPLETED");
  const orderItems = (order.order_items as Array<Record<string, unknown>>) ?? [];
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    for (const item of orderItems) {
      const voucher = item.voucher_products as Voucher;
      await getSellableVoucher(voucher.id, Number(item.quantity));
      const stockUpdate = await tx.voucherProduct.updateMany({
        where: { id: voucher.id, remaining_quantity: { gte: Number(item.quantity) } },
        data: { remaining_quantity: { decrement: Number(item.quantity) } }
      });
      if (stockUpdate.count === 0) throw new HttpError(409, "Insufficient voucher quantity", "INSUFFICIENT_STOCK");

      const issued = Array.from({ length: Number(item.quantity) }, () => {
        const code = voucherCode();
        const issuedDate = new Date();
        const expiredDate = new Date(issuedDate);
        expiredDate.setDate(expiredDate.getDate() + Number(voucher.validity_days));
        return {
          voucher_code: code,
          qr_code_payload: code,
          order_item_id: item.id as string,
          voucher_product_id: voucher.id,
          owner_id: order.user_id as string,
          issued_date: issuedDate,
          expired_date: expiredDate,
          status: "active"
        };
      });
      await tx.issuedVoucher.createMany({ data: issued });
    }

    const data = await tx.payment.update({ where: { id }, data: { status: "success", paid_at: now, transaction_ref: `SIM-${Date.now()}`, gateway_response: "simulated success" } });
    await tx.order.update({ where: { id: order.id as string }, data: { payment_status: "paid", status: "confirmed", updated_at: now } });
    await tx.paymentLog.create({ data: { payment_id: id, order_id: order.id as string, user_id: user.id, action: "PAYMENT_SUCCESS", status: "success", amount: payment.amount as never } });
    return data;
  });
}

export async function simulatePaymentFailed(user: CurrentUser, id: string) {
  const payment = await getPayment(id);
  const order = payment.orders as Record<string, unknown>;
  assertOrderAccess(user, order);
  return prisma.$transaction(async (tx) => {
    const data = await tx.payment.update({ where: { id }, data: { status: "failed", gateway_response: "simulated failed" } });
    await tx.order.update({ where: { id: order.id as string }, data: { payment_status: "failed", updated_at: new Date() } });
    await tx.paymentLog.create({ data: { payment_id: id, order_id: order.id as string, user_id: user.id, action: "PAYMENT_FAILED", status: "failed", amount: payment.amount as never } });
    return data;
  });
}
