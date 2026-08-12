import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { adminRoles, isAdminRole, isPartnerStaff, type UserRole } from "../types/auth.types.js";
import { requireData } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";
import {
  capturePayPalPayment,
  createPayPalPayment,
  createVnpayPayment,
  createSimulatedPayment,
  verifyVnpayReturn,
  type PaymentProvider,
} from "./payment-provider.service.js";
import { env } from "../config/env.js";

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
    const orderData: any = { order_code: orderCode(), user_id: userId, subtotal, discount_amount: 0, total_amount: subtotal, payment_method: paymentMethod, note };
    const order = await tx.order.create({ data: orderData });
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
    include: {
      users: { select: { full_name: true } },
      complaints: true,
      order_items: {
        include: {
          voucher_products: {
            select: {
              id: true,
              name: true,
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

export async function listOrders(
  user: CurrentUser,
  query?: { status?: string; search?: string }
) {
  const where: Record<string, unknown> = user.role === "buyer"
    ? { OR: [{ user_id: user.id }, { recipient_id: user.id }] }
    : {};

  if (query?.status) where.status = query.status;

  if (query?.search) {
    const searchOr = [
      { order_code: { contains: query.search, mode: "insensitive" } },
      { users: { full_name: { contains: query.search, mode: "insensitive" } } },
      { users: { email: { contains: query.search, mode: "insensitive" } } }
    ];
    // Nếu buyer đã có where.OR cho user_id/recipient_id, gộp bằng AND thay vì ghi đè
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchOr }];
      delete where.OR;
    } else {
      where.OR = searchOr;
    }
  }

  const data = await prisma.order.findMany({
    where,
    include: {
      users: { select: { full_name: true } },
      complaints: true,
      order_items: {
        include: {
          voucher_products: { include: { partners: true } },
          issued_vouchers: { include: { reviews: true, complaints: true } },
        },
      },
      payments: true
    },
    orderBy: { created_at: "desc" }
  });

  return data
    .filter((order: Record<string, unknown> & { payments?: PaymentRecord[] }) => {
      try {
        assertOrderAccess(user, order as unknown as Record<string, unknown>);
        return true;
      } catch {
        return false;
      }
    })
    .map((order: Record<string, unknown> & { payments?: PaymentRecord[] }) => ({
      ...order,
      payment_status: derivePaymentStatus(order.payments as PaymentRecord[])
    }));
}

export async function getOrderById(user: CurrentUser, id: string) {
  const order = await getOrder(id);
  assertOrderAccess(user, order);
  return { ...order, payment_status: derivePaymentStatus(order.payments as PaymentRecord[]) };
}

export async function updateOrder(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const order = await getOrder(id);
  assertOrderAccess(user, order);
  if (!isAdmin(user) && input.status) throw new HttpError(403, "Only admin can update order status", "FORBIDDEN");
  return prisma.order.update({ where: { id }, data: { ...input, updated_at: new Date() } as never });
}

export async function cancelOrder(user: CurrentUser, id: string, reason?: string) {
  const order = requireData<Record<string, unknown>>(
    await prisma.order.findUnique({
      where: { id },
      include: {
        order_items: { include: { issued_vouchers: { include: { voucher_usages: true } } } }
      }
    }) as unknown as Record<string, unknown> | null,
    "Order not found"
  );
  assertOrderAccess(user, order);
  if (["completed", "refunded"].includes(String(order.status))) throw new HttpError(409, "Completed order cannot be cancelled", "ORDER_ALREADY_COMPLETED");

  if (order.status === "cancelled" || order.status === "pending_manual") {
    throw new HttpError(409, "Order already cancelled", "ORDER_ALREADY_CANCELLED");
  }

  const orderItems = (order.order_items as Array<Record<string, unknown>>) ?? [];
  const hasUsedVoucher = orderItems.some((item) =>
    ((item.issued_vouchers as Array<Record<string, unknown>>) ?? []).some(
      (v) => ((v.voucher_usages as unknown[]) ?? []).length > 0
    )
  );

  const nextStatus = hasUsedVoucher ? "pending_manual" : "cancelled";

  return prisma.$transaction(async (tx) => {
    const data = await tx.order.update({
      where: { id },
      data: { status: nextStatus, updated_at: new Date() }
    });

    if (!hasUsedVoucher) {
      for (const item of orderItems) {
        await tx.issuedVoucher.updateMany({
          where: { order_item_id: item.id as string, status: "active" },
          data: { status: "refunded" }
        });
        await tx.voucherProduct.update({
          where: { id: item.voucher_product_id as string },
          data: { remaining_quantity: { increment: Number(item.quantity) } }
        });
      }
    }

    await tx.orderLog.create({
      data: {
        order_id: id,
        user_id: user.id,
        action: hasUsedVoucher ? "CANCEL_BLOCKED_MANUAL_REVIEW" : "CANCEL_ORDER",
        description: hasUsedVoucher
          ? "Voucher đã được sử dụng, chuyển sang chờ xử lý thủ công"
          : (reason ?? "Order cancelled")
      }
    });

    if (isAdmin(user)) {
      await tx.adminLog.create({
        data: {
          admin_id: user.id,
          target_order_id: id,
          action: hasUsedVoucher ? "order.cancel_blocked" : "order.cancel",
          description: `${hasUsedVoucher ? "Chờ xử lý thủ công" : "Hủy"} đơn ${order.order_code}`
        }
      });
    }

    return data;
  });
}

export async function refundOrder(user: CurrentUser, id: string, note?: string) {
  if (!isAdminRole(user.role) && !isPartnerStaff(user.role)) {
    throw new HttpError(403, "Không có quyền thực hiện hoàn tiền", "FORBIDDEN");
  }

  const order = await getOrder(id);
  const successPayment = (order.payments as Array<Record<string, unknown>> ?? []).find((p) => p.status === "success");

  if (!successPayment) {
    throw new HttpError(409, "Chỉ hoàn tiền cho đơn đã thanh toán", "ORDER_NOT_PAID");
  }

  return prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: successPayment.id as string },
      data: { status: "refunded" }
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
        description: note ?? "Admin ghi nhận hoàn tiền (mô phỏng)"
      }
    });

    await tx.adminLog.create({
      data: {
        admin_id: user.id,
        target_order_id: id,
        action: "order.refund",
        description: `Hoàn tiền đơn ${order.order_code}`
      }
    });

    return { ...order, payment_status: "refunded" as const };
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
    include: { orders: { include: { order_items: { include: { voucher_products: { select: { id: true, name: true, partner_id: true, partners: { select: { business_name: true } } } } } } } } }
  }) as unknown as Record<string, unknown> | null, "Order item not found");
  assertOrderAccess(user, item.orders as Record<string, unknown>);
  return item;
}

export async function listPayments(user: CurrentUser, orderId: string) {
  const order = await getOrder(orderId);
  assertOrderAccess(user, order);
  return prisma.payment.findMany({ where: { order_id: orderId }, orderBy: { created_at: "desc" } });
}

export async function createPayment(
  user: CurrentUser,
  orderId: string,
  method?: string
) {
  const order = await getOrder(orderId);

  assertOrderAccess(user, order);

  if (
    ![
      "pending_payment",
      "payment_failed",
    ].includes(String(order.status))
  ) {
    const isPaid = [
      "confirmed",
      "completed",
      "refunded",
    ].includes(String(order.status));

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

  const payment = await prisma.$transaction(async (tx) => {
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
        updated_at: new Date(),
      },
    });

    return data;
  });

  try {
    if (provider === "simulated") {
      const legacy = createSimulatedPayment(provider, orderId);

      return {
        ...payment,
        transaction_ref: legacy.transactionRef,
        gateway_response: legacy.gatewayResponse,
        checkout_url: legacy.checkoutUrl,
      };
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
          gateway_response: JSON.stringify(
            gateway.gatewayResponse
          ),
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
    const data = await tx.order.update({
      where: { id: orderId },
      data: { status: "cancelled", payment_status: "failed", updated_at: new Date() }
    });
    await tx.orderLog.create({
      data: {
        order_id: orderId,
        user_id: userId,
        action: "CANCEL_ORDER_EXPIRED",
        description: "Order cancelled because the payment window expired"
      }
    });
    return data;
  });
}

async function markPaymentFailed(paymentId: string, userId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "failed", gateway_response: reason }
    });
    await tx.order.update({
      where: { id: payment.order_id as string },
      data: { payment_status: "failed", status: "payment_failed", updated_at: new Date() }
    });
    await tx.paymentLog.create({
      data: {
        payment_id: paymentId,
        order_id: payment.order_id as string,
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

    const data = await tx.payment.update({ where: { id: paymentId }, data: { status: "success", paid_at: now } });
    await tx.order.update({ where: { id: order.id as string }, data: { payment_status: "paid", status: "confirmed", updated_at: now } });
    await tx.paymentLog.create({ data: { payment_id: paymentId, order_id: order.id as string, user_id: userId, action: "PAYMENT_SUCCESS", status: "success", amount: payment.amount as never } });
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
  return payment;
}

export async function simulatePaymentSuccess(user: CurrentUser, id: string) {
  const payment = await getPayment(id);
  const order = payment.orders as Record<string, unknown>;
  assertOrderAccess(user, order);
  if (payment.status === "success" || ["confirmed", "completed", "refunded"].includes(String(order.status))) throw new HttpError(409, "Payment already completed", "PAYMENT_ALREADY_COMPLETED");
  if (!["pending", "pending_payment", "payment_failed"].includes(String(order.status))) throw new HttpError(409, "Order is not payable", "ORDER_NOT_PAYABLE");
  if (order.payment_expires_at && new Date(order.payment_expires_at as string | Date) <= new Date()) {
    await cancelExpiredOrder(order.id as string, user.id);
    throw new HttpError(409, "Order payment window has expired", "ORDER_PAYMENT_EXPIRED");
  }
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
  const successfulReturn = result.validSignature && result.validTmnCode && result.responseCode === "00" && result.transactionStatus === "00" && result.amount === Number(payment.amount);
  if (successfulReturn && paymentWindowExpired(order)) {
    await markPaymentFailed(payment.id as string, order.user_id as string, "VNPAY_PAYMENT_EXPIRED");
    await cancelExpiredOrder(order.id as string, order.user_id as string);
    return redirectResult(order.id as string, "failed");
  }
  if (successfulReturn) {
    try {
      await completePayment(payment.id as string, order.user_id as string, payment, order, order.order_items as Array<Record<string, unknown>>);
      return redirectResult(order.id as string, "success");
    } catch (error) {
      console.error("VNPay fulfillment failed", error instanceof Error ? error.message : "UnknownError");
      try {
        await markPaymentFailed(payment.id as string, order.user_id as string, "VNPAY_FULFILLMENT_FAILED");
      } catch (markError) {
        console.error("Unable to record VNPay failure", markError instanceof Error ? markError.message : "UnknownError");
      }
      return redirectResult(order.id as string, "failed");
    }
  }
  await markPaymentFailed(payment.id as string, order.user_id as string, `VNPAY_FAILED_${result.responseCode}`);
  return redirectResult(order.id as string, "failed");
}

export async function handlePayPalReturn(token: string) {
  const payment = await paymentByTransactionRef(token);
  const order = payment.orders as Record<string, unknown>;
  if (payment.status === "success" || ["confirmed", "completed", "refunded"].includes(String(order.status))) return redirectResult(order.id as string, "success");
  if (paymentWindowExpired(order)) {
    await markPaymentFailed(payment.id as string, order.user_id as string, "PAYPAL_PAYMENT_EXPIRED");
    await cancelExpiredOrder(order.id as string, order.user_id as string);
    return redirectResult(order.id as string, "failed");
  }
  try {
    const captured = await capturePayPalPayment(token, Number(payment.amount));
    await prisma.payment.update({ where: { id: payment.id as string }, data: { gateway_response: JSON.stringify(captured.gatewayResponse) } });
    await completePayment(payment.id as string, order.user_id as string, payment, order, order.order_items as Array<Record<string, unknown>>);
    return redirectResult(order.id as string, "success");
  } catch (error) {
    console.error(JSON.stringify({
      event: "payment.paypal.callback.failed",
      provider: "paypal",
      paymentId: payment.id,
      orderId: order.id,
      transactionRef: token,
      stage: "capture_or_fulfillment",
      error: errorForLog(error),
    }));
    await markPaymentFailed(payment.id as string, order.user_id as string, "PAYPAL_PAYMENT_FAILED");
    if (error instanceof HttpError && error.code === "PAYMENT_ALREADY_COMPLETED") return redirectResult(order.id as string, "success");
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