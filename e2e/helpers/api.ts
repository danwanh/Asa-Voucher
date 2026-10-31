import type { APIRequestContext } from "@playwright/test";
import { API_URL } from "../playwright.config";
import { PASSWORD } from "./accounts";
import { signedVnpayReturnQuery } from "./vnpay";

export async function apiLogin(request: APIRequestContext, email: string) {
  const res = await request.post(`${API_URL}/auth/login`, { data: { identifier: email, password: PASSWORD } });
  if (!res.ok()) throw new Error(`login failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).data.access_token as string;
}

/** Order -> payment -> signed VNPay return, all through the API. Returns the issued voucher codes. */
export async function buyVoucherViaApi(request: APIRequestContext, token: string, productId: string, quantity = 1) {
  const headers = { Authorization: `Bearer ${token}` };
  const orderRes = await request.post(`${API_URL}/orders`, {
    headers,
    data: { items: [{ voucher_product_id: productId, quantity }], payment_method: "vnpay" },
  });
  if (orderRes.status() !== 201) throw new Error(`create order failed: ${await orderRes.text()}`);
  const order = (await orderRes.json()).data;

  const payRes = await request.post(`${API_URL}/orders/${order.id}/payments`, { headers, data: { method: "vnpay" } });
  if (payRes.status() !== 201) throw new Error(`create payment failed: ${await payRes.text()}`);
  const payment = (await payRes.json()).data;

  const query = signedVnpayReturnQuery(new URL(payment.checkout_url).searchParams.get("vnp_TxnRef")!, Number(payment.amount));
  // maxRedirects 0: we only need the backend to process the return, not follow it to the frontend
  await request.get(`${API_URL}/payments/vnpay/return?${query}`, { maxRedirects: 0 });

  return listMyVoucherCodes(request, token, order.id);
}

export async function listMyVoucherCodes(request: APIRequestContext, token: string, orderId?: string) {
  const res = await request.get(`${API_URL}/issued-vouchers?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok()) throw new Error(`list vouchers failed: ${await res.text()}`);
  const body = await res.json();
  const items: Array<{ voucher_code: string; order_items?: { order_id?: string } }> = body.data?.items ?? body.data ?? [];
  return items.filter((v) => !orderId || v.order_items?.order_id === orderId).map((v) => v.voucher_code);
}
