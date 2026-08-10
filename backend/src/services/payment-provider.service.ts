import crypto from "node:crypto";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

export type PaymentProvider = "vnpay" | "paypal";

export function createSimulatedPayment(provider: string, orderId: string) {
  return {
    transactionRef: `SIM-${provider.toUpperCase()}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`,
    checkoutUrl: `${env.FRONTEND_URL}/checkout/payment/result?orderId=${encodeURIComponent(orderId)}&status=success`,
    gatewayResponse: JSON.stringify({ provider, mode: "legacy-simulation", orderId }),
  };
}

type PaymentRequest = {
  paymentId: string;
  orderCode: string;
  amountVnd: number;
};

type PayPalOrder = {
  id: string;
  links?: Array<{ href: string; rel: string }>;
};

type PayPalCaptureResponse = {
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { currency_code?: string; value?: string };
      }>;
    };
  }>;
};

function requireConfig(value: string | undefined, name: string) {
  if (!value) throw new HttpError(503, `${name} is not configured`, "PAYMENT_PROVIDER_NOT_CONFIGURED");
  return value;
}

function paypalBaseUrl() {
  return env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function paypalAmount(amountVnd: number) {
  if (!Number.isFinite(amountVnd) || amountVnd <= 0) {
    throw new HttpError(422, "Payment amount must be greater than zero", "PAYMENT_AMOUNT_INVALID");
  }
  const converted = amountVnd / env.PAYPAL_VND_TO_USD_RATE;
  return converted.toFixed(2);
}

async function paypalAccessToken() {
  const clientId = requireConfig(env.PAYPAL_CLIENT_ID, "PAYPAL_CLIENT_ID");
  const clientSecret = requireConfig(env.PAYPAL_CLIENT_SECRET, "PAYPAL_CLIENT_SECRET");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new HttpError(502, "Unable to authenticate with PayPal", "PAYPAL_AUTH_FAILED");
  const body = await response.json() as { access_token?: string };
  return requireConfig(body.access_token, "PAYPAL_ACCESS_TOKEN");
}

export async function createPayPalPayment(input: PaymentRequest) {
  const token = await paypalAccessToken();
  const returnUrl = requireConfig(env.PAYPAL_RETURN_URL, "PAYPAL_RETURN_URL");
  const cancelUrl = requireConfig(env.PAYPAL_CANCEL_URL, "PAYPAL_CANCEL_URL");
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": input.paymentId,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        invoice_id: input.paymentId,
        custom_id: input.paymentId,
        description: `Asa Voucher ${input.orderCode}`,
        amount: { currency_code: env.PAYPAL_CURRENCY, value: paypalAmount(input.amountVnd) },
      }],
      application_context: {
        brand_name: "Asa Voucher",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
  const body = await response.json() as PayPalOrder & { message?: string; name?: string; details?: unknown };
  if (!response.ok) {
    console.error(JSON.stringify({
      event: "payment.provider.response",
      provider: "paypal",
      operation: "create_order",
      httpStatus: response.status,
      paymentId: input.paymentId,
      orderCode: input.orderCode,
      errorName: body.name,
      errorMessage: body.message,
      details: body.details,
    }));
  }
  if (!response.ok || !body.id) {
    throw new HttpError(502, body.message ?? "Unable to create PayPal order", "PAYPAL_CREATE_FAILED", body.details ?? body);
  }
  const approvalUrl = body.links?.find((link) => link.rel === "approve")?.href;
  if (!approvalUrl) throw new HttpError(502, "PayPal approval URL is missing", "PAYPAL_CREATE_FAILED");
  return { transactionRef: body.id, checkoutUrl: approvalUrl, gatewayResponse: body };
}

export async function capturePayPalPayment(paypalOrderId: string, amountVnd: number) {
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await response.json() as PayPalCaptureResponse;
  if (!response.ok) throw new HttpError(502, "PayPal capture failed", "PAYPAL_CAPTURE_FAILED", body);
  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
  const expected = paypalAmount(amountVnd);
  if (body.status !== "COMPLETED" || capture?.status !== "COMPLETED" || capture?.amount?.currency_code !== env.PAYPAL_CURRENCY || capture?.amount?.value !== expected) {
    throw new HttpError(502, "PayPal payment was not completed", "PAYPAL_PAYMENT_NOT_COMPLETED", body);
  }
  return { transactionRef: capture.id ?? paypalOrderId, gatewayResponse: body };
}

function encodeVnpay(value: string) {
  // VNPay signs values using application/x-www-form-urlencoded semantics.
  return encodeURIComponent(value).replace(/%20/g, "+");
}

function vnpaySignData(params: Record<string, string>) {
  return Object.keys(params).sort().map((key) => `${encodeVnpay(key)}=${encodeVnpay(params[key])}`).join("&");
}

export function createVnpayPayment(input: PaymentRequest) {
  const url = requireConfig(env.VNPAY_URL, "VNPAY_URL");
  const tmnCode = requireConfig(env.VNPAY_TMN_CODE, "VNPAY_TMN_CODE");
  const secret = requireConfig(env.VNPAY_HASH_SECRET, "VNPAY_HASH_SECRET");
  const returnUrl = requireConfig(env.VNPAY_RETURN_URL, "VNPAY_RETURN_URL");
  const transactionRef = `ASA${input.paymentId.replace(/-/g, "")}`;
  const transactionDate = formatVnpayDate(new Date());
  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: String(Math.round(input.amountVnd) * 100),
    vnp_CreateDate: transactionDate,
    vnp_CurrCode: "VND",
    vnp_IpAddr: "127.0.0.1",
    vnp_Locale: "vn",
    vnp_OrderInfo: `Thanh toan don hang ${input.orderCode}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: transactionRef,
    vnp_ExpireDate: formatVnpayDate(new Date(Date.now() + 15 * 60 * 1000)),
  };
  const query = vnpaySignData(params);
  const hash = crypto.createHmac("sha512", secret).update(query).digest("hex");
  return {
    transactionRef,
    checkoutUrl: `${url}?${query}&vnp_SecureHash=${hash}`,
    gatewayResponse: { provider: "vnpay", params },
  };
}

export function verifyVnpayReturn(query: Record<string, unknown>) {
  const secret = requireConfig(env.VNPAY_HASH_SECRET, "VNPAY_HASH_SECRET");
  const receivedHash = String(query.vnp_SecureHash ?? "");
  const params = Object.fromEntries(Object.entries(query)
    .filter(([key, value]) => key.startsWith("vnp_") && !["vnp_SecureHash", "vnp_SecureHashType"].includes(key) && value !== undefined)
    .map(([key, value]) => [key, String(value)]));
  const expectedHash = crypto.createHmac("sha512", secret).update(vnpaySignData(params)).digest("hex");
  const validSignature = receivedHash.length === expectedHash.length && crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expectedHash));
  return {
    validSignature,
    validTmnCode: String(query.vnp_TmnCode ?? "") === env.VNPAY_TMN_CODE,
    transactionRef: String(query.vnp_TxnRef ?? ""),
    responseCode: String(query.vnp_ResponseCode ?? ""),
    transactionStatus: String(query.vnp_TransactionStatus ?? ""),
    amount: Number(query.vnp_Amount ?? 0) / 100,
    transactionNo: String(query.vnp_TransactionNo ?? ""),
    query,
  };
}

function formatVnpayDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}
