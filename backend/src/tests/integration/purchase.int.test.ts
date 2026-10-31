import crypto from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  API, accounts, api, bearer, buyVouchers, createOrder, createPayment, createTestBuyer, ids, prisma, tokenFor,
} from "./helpers.js";

const product = ids.vouchers.highlandsBogo;

async function remainingStock(productId: string) {
  const row = await prisma.voucherProduct.findUniqueOrThrow({ where: { id: productId } });
  return Number(row.remaining_quantity);
}

// Builds a VNPay return query signed the same way VNPay does (see payment-provider.service.ts).
function signedVnpayReturn(paymentId: string, amountVnd: number, overrides: Record<string, string> = {}) {
  const params: Record<string, string> = {
    vnp_Amount: String(Math.round(amountVnd) * 100),
    vnp_ResponseCode: "00",
    vnp_TransactionStatus: "00",
    vnp_TmnCode: process.env.VNPAY_TMN_CODE!,
    vnp_TxnRef: `ASA${paymentId.replace(/-/g, "")}`,
    vnp_TransactionNo: "14000001",
    ...overrides,
  };
  const encode = (value: string) => encodeURIComponent(value).replace(/%20/g, "+");
  const signData = Object.keys(params).sort().map((key) => `${encode(key)}=${encode(params[key])}`).join("&");
  const hash = crypto.createHmac("sha512", process.env.VNPAY_HASH_SECRET!).update(signData).digest("hex");
  return { ...params, vnp_SecureHash: hash };
}

describe("cart", () => {
  it("adds an item, then merges the quantity when the same item is added again", async () => {
    const user = await createTestBuyer();
    const token = await tokenFor(user.email);

    const first = await api().post(`${API}/cart/items`).set(bearer(token)).send({ voucher_product_id: product, quantity: 1 });
    expect(first.status).toBe(201);

    const second = await api().post(`${API}/cart/items`).set(bearer(token)).send({ voucher_product_id: product, quantity: 2 });
    expect(second.status).toBe(200);
    expect(second.body.data.quantity).toBe(3);

    const cart = await api().get(`${API}/cart`).set(bearer(token));
    expect(cart.body.data.items).toHaveLength(1);
  });

  it("checks out selected cart items into an order", async () => {
    const user = await createTestBuyer();
    const token = await tokenFor(user.email);
    const added = await api().post(`${API}/cart/items`).set(bearer(token)).send({ voucher_product_id: product, quantity: 2 });

    const res = await api()
      .post(`${API}/cart/checkout`)
      .set(bearer(token))
      .send({ cart_item_ids: [added.body.data.id], payment_method: "vnpay" });

    expect(res.status).toBe(201);
    expect(res.body.data.items).toHaveLength(1);
    const cart = await api().get(`${API}/cart`).set(bearer(token));
    expect(cart.body.data.items).toHaveLength(0);
  });
});

describe("orders and payment", () => {
  let buyer: string;
  beforeAll(async () => {
    buyer = await tokenFor(accounts.buyer);
  });

  it("creates an order waiting for payment", async () => {
    const res = await api()
      .post(`${API}/orders`)
      .set(bearer(buyer))
      .send({ items: [{ voucher_product_id: product, quantity: 2 }], payment_method: "vnpay" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: "pending_payment", payment_status: "pending" });
    expect(Number(res.body.data.total_amount)).toBeGreaterThan(0);
  });

  it("rejects ordering more than the remaining stock", async () => {
    const stock = await remainingStock(product);
    const res = await api()
      .post(`${API}/orders`)
      .set(bearer(buyer))
      .send({ items: [{ voucher_product_id: product, quantity: stock + 1 }], payment_method: "vnpay" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
  });

  it("rejects ordering a voucher that is not on sale", async () => {
    const res = await api()
      .post(`${API}/orders`)
      .set(bearer(buyer))
      .send({ items: [{ voucher_product_id: ids.vouchers.highlandsCombo, quantity: 1 }], payment_method: "vnpay" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VOUCHER_NOT_SELLABLE");
  });

  it("creates a VNPay payment with a checkout link", async () => {
    const orderId = await createOrder(buyer, product);
    const payment = await createPayment(buyer, orderId);

    expect(payment.checkout_url).toContain("vnp_SecureHash=");
  });

  it("issues vouchers and reduces stock once payment succeeds", async () => {
    const before = await remainingStock(product);
    const { orderId, vouchers } = await buyVouchers(buyer, product, 3);

    expect(vouchers).toHaveLength(3);
    expect(vouchers.every((voucher) => voucher.status === "active")).toBe(true);
    expect(new Set(vouchers.map((voucher) => voucher.voucher_code)).size).toBe(3);
    expect(await remainingStock(product)).toBe(before - 3);

    const order = await api().get(`${API}/orders/${orderId}`).set(bearer(buyer));
    expect(order.body.data).toMatchObject({ status: "confirmed", payment_status: "paid" });
  });

  it("does not let a payment complete twice", async () => {
    const { paymentId } = await buyVouchers(buyer, product);
    const again = await api().patch(`${API}/payments/${paymentId}/simulate-success`).set(bearer(buyer));
    expect(again.status).toBe(409);
  });

  it("does not let another buyer pay or cancel my order", async () => {
    const orderId = await createOrder(buyer, product);
    const payment = await createPayment(buyer, orderId);
    const otherBuyer = await tokenFor(accounts.otherBuyer);

    const pay = await api().patch(`${API}/payments/${payment.id}/simulate-success`).set(bearer(otherBuyer));
    expect(pay.status).toBe(403);
    const cancel = await api().patch(`${API}/orders/${orderId}/cancel`).set(bearer(otherBuyer)).send({});
    expect(cancel.status).toBe(403);
  });

  it("cancels an unpaid order, which can then no longer be paid", async () => {
    const orderId = await createOrder(buyer, product);
    const payment = await createPayment(buyer, orderId);

    const cancel = await api().patch(`${API}/orders/${orderId}/cancel`).set(bearer(buyer)).send({ reason: "Đổi ý" });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe("cancelled");

    const pay = await api().patch(`${API}/payments/${payment.id}/simulate-success`).set(bearer(buyer));
    expect(pay.status).toBe(409);
  });
});

describe("VNPay return", () => {
  it("completes the order when VNPay returns a valid signed success", async () => {
    const buyer = await tokenFor(accounts.buyer);
    const orderId = await createOrder(buyer, product, 2);
    const payment = await createPayment(buyer, orderId);
    const stored = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });

    const res = await api().get(`${API}/payments/vnpay/return`).query(signedVnpayReturn(payment.id, Number(stored.amount)));

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(`orderId=${orderId}`);
    expect(res.headers.location).toContain("status=success");
    const vouchers = await prisma.issuedVoucher.count({ where: { order_items: { order_id: orderId } } });
    expect(vouchers).toBe(2);
  });

  it("rejects a VNPay return whose amount was tampered with", async () => {
    const buyer = await tokenFor(accounts.buyer);
    const orderId = await createOrder(buyer, product);
    const payment = await createPayment(buyer, orderId);
    const stored = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });

    const query = signedVnpayReturn(payment.id, Number(stored.amount));
    query.vnp_Amount = "100"; // changed after signing

    const res = await api().get(`${API}/payments/vnpay/return`).query(query);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("status=failed");
    const vouchers = await prisma.issuedVoucher.count({ where: { order_items: { order_id: orderId } } });
    expect(vouchers).toBe(0);
  });
});
