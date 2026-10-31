import crypto from "node:crypto";
import { VNPAY } from "../playwright.config";

/**
 * Builds the URL VNPay would send the shopper back to, signed the same way
 * VNPay does (see backend/src/services/payment-provider.service.ts).
 */
export function signedVnpayReturnQuery(txnRef: string, amountVnd: number, overrides: Record<string, string> = {}) {
  const params: Record<string, string> = {
    vnp_Amount: String(Math.round(amountVnd) * 100),
    vnp_ResponseCode: "00",
    vnp_TransactionStatus: "00",
    vnp_TmnCode: VNPAY.tmnCode,
    vnp_TxnRef: txnRef,
    vnp_TransactionNo: "14000001",
    ...overrides,
  };
  const encode = (value: string) => encodeURIComponent(value).replace(/%20/g, "+");
  const signData = Object.keys(params).sort().map((key) => `${encode(key)}=${encode(params[key])}`).join("&");
  const hash = crypto.createHmac("sha512", VNPAY.hashSecret).update(signData).digest("hex");
  return new URLSearchParams({ ...params, vnp_SecureHash: hash }).toString();
}
