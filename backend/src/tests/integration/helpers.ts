import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/prisma.js";
import { hashPassword, signAccessToken } from "../../utils/auth.js";
import { TEST_PASSWORD as SEED_PASSWORD } from "../../../prisma/seed/shared.js";

export { prisma };
export { ids, TEST_PASSWORD } from "../../../prisma/seed/shared.js";

export const API = "/api/v1";

const app = createApp();
export const api = () => request(app);

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

// Seed accounts used across the suite
export const accounts = {
  buyer: "buyer@asa.test",
  otherBuyer: "le.hoang.nam@asa.test",
  giftRecipient: "nguyen.bao.vy@asa.test",
  adminContent: "admin.content@asa.test",
  adminOperations: "admin.operations@asa.test",
  highlandsOwner: "partner.owner@asa.test",
  highlandsVoucherStaff: "voucher.staff@asa.test",
  highlandsStoreQ1: "store.staff@asa.test",
  highlandsStoreTDB: "store.highlands.tdb@asa.test",
  cgvStoreVincom: "store.cgv.vincom@asa.test",
} as const;

/**
 * Signs an access token the same way login does (see issueTokens in auth.service),
 * so tests do not hit the login rate limit.
 */
export async function tokenFor(email: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const owned = await prisma.partner.findFirst({ where: { representative_user_id: user.id }, select: { id: true } });
  let partnerId = owned?.id;
  if (!partnerId && user.partner_branches_id) {
    const branch = await prisma.partnerBranch.findUnique({ where: { id: user.partner_branches_id }, select: { partner_id: true } });
    partnerId = branch?.partner_id ?? undefined;
  }
  return signAccessToken({
    user_id: user.id,
    email: user.email,
    role: user.role,
    partner_id: partnerId,
    branch_id: user.partner_branches_id ?? undefined,
    auth_version: user.auth_version ?? 0,
  });
}

/**
 * Creates a fresh verified buyer for tests that change account state
 * (wrong passwords, logout), so shared seed accounts stay usable.
 */
export async function createTestBuyer() {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return prisma.user.create({
    data: {
      email: `tmp-${suffix}@asa.test`,
      password_hash: await hashPassword(SEED_PASSWORD),
      full_name: "Test Buyer",
      role: "buyer",
      is_active: true,
      is_verified: true,
    },
  });
}

/** Creates an order for one product and returns its id. */
export async function createOrder(token: string, productId: string, quantity = 1, extra: Record<string, unknown> = {}) {
  const res = await api()
    .post(`${API}/orders`)
    .set(bearer(token))
    .send({ items: [{ voucher_product_id: productId, quantity }], payment_method: "vnpay", ...extra });
  if (res.status !== 201) throw new Error(`createOrder failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.id as string;
}

/** Creates a VNPay payment for an order and returns the payment id. */
export async function createPayment(token: string, orderId: string) {
  const res = await api().post(`${API}/orders/${orderId}/payments`).set(bearer(token)).send({ method: "vnpay" });
  if (res.status !== 201) throw new Error(`createPayment failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data as { id: string; amount: number | string; transaction_ref: string; checkout_url: string };
}

/** Full purchase: order → payment → simulated success. Returns the issued vouchers. */
export async function buyVouchers(token: string, productId: string, quantity = 1, extra: Record<string, unknown> = {}) {
  const orderId = await createOrder(token, productId, quantity, extra);
  const payment = await createPayment(token, orderId);
  const res = await api().patch(`${API}/payments/${payment.id}/simulate-success`).set(bearer(token));
  if (res.status !== 200) throw new Error(`simulate-success failed: ${res.status} ${JSON.stringify(res.body)}`);
  const vouchers = await prisma.issuedVoucher.findMany({ where: { order_items: { order_id: orderId } } });
  return { orderId, paymentId: payment.id, vouchers };
}
