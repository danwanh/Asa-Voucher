import crypto from "node:crypto";
import { adminRoles, type UserRole } from "../types/role.js";
import { db, requireData, throwDbError } from "../utils/db.js";
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
  sale_start_date: string;
  sale_end_date: string;
  validity_days: number;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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
  const { data: existing, error } = await db().from("carts").select("*").eq("user_id", userId).maybeSingle();
  if (error) throwDbError(error);
  if (existing) return existing as Record<string, unknown>;

  const { data, error: insertError } = await db().from("carts").insert({ user_id: userId }).select("*").single();
  if (insertError) throwDbError(insertError);
  return data as Record<string, unknown>;
}

async function getSellableVoucher(id: string, quantity: number) {
  const { data, error } = await db().from("voucher_products").select("*").eq("id", id).single();
  const voucher = requireData<Voucher>(data, error, "Voucher product not found");
  const today = todayIsoDate();
  if (voucher.approval_status !== "approved" || voucher.status !== "active" || voucher.sale_start_date > today || voucher.sale_end_date < today) {
    throw new HttpError(422, "Voucher product is not sellable", "VOUCHER_NOT_SELLABLE");
  }
  if (Number(voucher.remaining_quantity) < quantity) {
    throw new HttpError(409, "Insufficient voucher quantity", "INSUFFICIENT_STOCK");
  }
  return voucher;
}

export async function getCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  const { data, error } = await db().from("cart_items").select("*, voucher_products(*)").eq("cart_id", cart.id as string).order("created_at", { ascending: false });
  if (error) throwDbError(error);
  return { ...cart, items: data ?? [] };
}

export async function addCartItem(userId: string, input: { voucher_product_id: string; quantity: number }) {
  await getSellableVoucher(input.voucher_product_id, input.quantity);
  const cart = await getOrCreateCart(userId);
  const { data: existing, error: existingError } = await db().from("cart_items").select("*").eq("cart_id", cart.id as string).eq("voucher_product_id", input.voucher_product_id).maybeSingle();
  if (existingError) throwDbError(existingError);

  if (existing) {
    const quantity = Number(existing.quantity) + input.quantity;
    await getSellableVoucher(input.voucher_product_id, quantity);
    const { data, error } = await db().from("cart_items").update({ quantity, updated_at: new Date().toISOString() }).eq("id", existing.id).select("*").single();
    if (error) throwDbError(error);
    return { item: data, created: false };
  }

  const { data, error } = await db().from("cart_items").insert({ cart_id: cart.id, ...input }).select("*").single();
  if (error) throwDbError(error);
  return { item: data, created: true };
}

async function assertCartItemOwner(userId: string, cartItemId: string) {
  const { data, error } = await db().from("cart_items").select("*, carts(*)").eq("id", cartItemId).single();
  const item = requireData<Record<string, unknown>>(data, error, "Cart item not found");
  if ((item.carts as Record<string, unknown>).user_id !== userId) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
  return item;
}

export async function updateCartItem(userId: string, cartItemId: string, quantity: number) {
  const item = await assertCartItemOwner(userId, cartItemId);
  await getSellableVoucher(item.voucher_product_id as string, quantity);
  const { data, error } = await db().from("cart_items").update({ quantity, updated_at: new Date().toISOString() }).eq("id", cartItemId).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function deleteCartItem(userId: string, cartItemId: string) {
  await assertCartItemOwner(userId, cartItemId);
  const { error } = await db().from("cart_items").delete().eq("id", cartItemId);
  if (error) throwDbError(error);
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  const { error } = await db().from("cart_items").delete().eq("cart_id", cart.id as string);
  if (error) throwDbError(error);
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
  const { data: order, error: orderError } = await db()
    .from("orders")
    .insert({ order_code: orderCode(), user_id: userId, subtotal, discount_amount: 0, total_amount: subtotal, payment_method: paymentMethod, note })
    .select("*")
    .single();
  if (orderError) throwDbError(orderError);

  const { data: orderItems, error: itemsError } = await db().from("order_items").insert(builtItems.map((item) => ({ ...item.orderItem, order_id: order.id }))).select("*");
  if (itemsError) throwDbError(itemsError);

  await db().from("order_logs").insert({ order_id: order.id, user_id: userId, action: "CREATE_ORDER", description: "Order created" });
  return { ...order, items: orderItems ?? [] };
}

async function itemsFromCart(userId: string, cartItemIds?: string[]) {
  const cart = await getOrCreateCart(userId);
  let query = db().from("cart_items").select("*").eq("cart_id", cart.id as string);
  if (cartItemIds?.length) query = query.in("id", cartItemIds);
  const { data, error } = await query;
  if (error) throwDbError(error);
  if (!data?.length) throw new HttpError(422, "Cart is empty", "EMPTY_CART");
  return { cart, cartItems: data as Array<Record<string, unknown>> };
}

export async function checkout(userId: string, input: { cart_item_ids?: string[]; payment_method: string; note?: string }) {
  const { cart, cartItems } = await itemsFromCart(userId, input.cart_item_ids);
  const order = await createOrderFromItems(
    userId,
    cartItems.map((item) => ({ voucher_product_id: item.voucher_product_id as string, quantity: Number(item.quantity) })),
    input.payment_method,
    input.note
  );
  await db().from("cart_items").delete().eq("cart_id", cart.id as string).in("id", cartItems.map((item) => item.id as string));
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
  const { data, error } = await db().from("orders").select("*, order_items(*, voucher_products(partner_id))").eq("id", id).single();
  return requireData<Record<string, unknown>>(data, error, "Order not found");
}

function assertOrderAccess(user: CurrentUser, order: Record<string, unknown>) {
  if (isAdmin(user) || order.user_id === user.id) return;
  const items = (order.order_items as Array<Record<string, unknown>> | undefined) ?? [];
  if (user.partnerId && items.some((item) => (item.voucher_products as Record<string, unknown>)?.partner_id === user.partnerId)) return;
  throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
}

export async function listOrders(user: CurrentUser) {
  let query = db().from("orders").select("*, order_items(*, voucher_products(partner_id))").order("created_at", { ascending: false });
  if (user.role === "buyer") query = query.eq("user_id", user.id);
  const { data, error } = await query;
  if (error) throwDbError(error);
  return (data ?? []).filter((order) => {
    try {
      assertOrderAccess(user, order as Record<string, unknown>);
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
  const { data, error } = await db().from("orders").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function cancelOrder(user: CurrentUser, id: string) {
  const order = await getOrder(id);
  assertOrderAccess(user, order);
  if (order.payment_status === "paid") throw new HttpError(409, "Paid order cannot be cancelled", "ORDER_ALREADY_PAID");
  const { data, error } = await db().from("orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) throwDbError(error);
  await db().from("order_logs").insert({ order_id: id, user_id: user.id, action: "CANCEL_ORDER", description: "Order cancelled" });
  return data;
}

export async function listOrderItems(user: CurrentUser, orderId: string) {
  const order = await getOrder(orderId);
  assertOrderAccess(user, order);
  return order.order_items ?? [];
}

export async function getOrderItem(user: CurrentUser, id: string) {
  const { data, error } = await db().from("order_items").select("*, orders(*, order_items(*, voucher_products(partner_id)))").eq("id", id).single();
  const item = requireData<Record<string, unknown>>(data, error, "Order item not found");
  assertOrderAccess(user, item.orders as Record<string, unknown>);
  return item;
}

export async function listPayments(user: CurrentUser, orderId: string) {
  const order = await getOrder(orderId);
  assertOrderAccess(user, order);
  const { data, error } = await db().from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
  if (error) throwDbError(error);
  return data ?? [];
}

export async function createPayment(user: CurrentUser, orderId: string, method?: string) {
  const order = await getOrder(orderId);
  assertOrderAccess(user, order);
  if (order.payment_status === "paid") throw new HttpError(409, "Order already paid", "ORDER_ALREADY_PAID");
  const { data, error } = await db().from("payments").insert({ order_id: orderId, method: method ?? order.payment_method, amount: order.total_amount }).select("*").single();
  if (error) throwDbError(error);
  await db().from("payment_logs").insert({ payment_id: data.id, order_id: orderId, user_id: user.id, action: "PAYMENT_CREATED", status: "pending", amount: data.amount });
  return data;
}

async function getPayment(id: string) {
  const { data, error } = await db().from("payments").select("*, orders(*, order_items(*, voucher_products(*)))").eq("id", id).single();
  return requireData<Record<string, unknown>>(data, error, "Payment not found");
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
  for (const item of orderItems) {
    const voucher = item.voucher_products as Voucher;
    await getSellableVoucher(voucher.id, Number(item.quantity));
    await db().from("voucher_products").update({ remaining_quantity: Number(voucher.remaining_quantity) - Number(item.quantity) }).eq("id", voucher.id);
    const issued = Array.from({ length: Number(item.quantity) }, () => {
      const code = voucherCode();
      const issuedDate = new Date();
      const expiredDate = new Date(issuedDate);
      expiredDate.setDate(expiredDate.getDate() + Number(voucher.validity_days));
      return {
        voucher_code: code,
        qr_code_payload: code,
        order_item_id: item.id,
        voucher_product_id: voucher.id,
        owner_id: order.user_id,
        issued_date: issuedDate.toISOString().slice(0, 10),
        expired_date: expiredDate.toISOString().slice(0, 10),
        status: "active"
      };
    });
    const { error: issueError } = await db().from("issued_vouchers").insert(issued);
    if (issueError) throwDbError(issueError);
  }
  const now = new Date().toISOString();
  const { data, error } = await db().from("payments").update({ status: "success", paid_at: now, transaction_ref: `SIM-${Date.now()}`, gateway_response: "simulated success" }).eq("id", id).select("*").single();
  if (error) throwDbError(error);
  await db().from("orders").update({ payment_status: "paid", status: "confirmed", updated_at: now }).eq("id", order.id);
  await db().from("payment_logs").insert({ payment_id: id, order_id: order.id, user_id: user.id, action: "PAYMENT_SUCCESS", status: "success", amount: payment.amount });
  return data;
}

export async function simulatePaymentFailed(user: CurrentUser, id: string) {
  const payment = await getPayment(id);
  const order = payment.orders as Record<string, unknown>;
  assertOrderAccess(user, order);
  const { data, error } = await db().from("payments").update({ status: "failed", gateway_response: "simulated failed" }).eq("id", id).select("*").single();
  if (error) throwDbError(error);
  await db().from("orders").update({ payment_status: "failed", updated_at: new Date().toISOString() }).eq("id", order.id);
  await db().from("payment_logs").insert({ payment_id: id, order_id: order.id, user_id: user.id, action: "PAYMENT_FAILED", status: "failed", amount: payment.amount });
  return data;
}
