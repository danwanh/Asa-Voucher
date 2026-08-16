import crypto from "node:crypto";

/** Sinh mã voucher theo đúng logic mã voucher thật: `VC<timestamp><6 chữ số ngẫu nhiên>`. */
export function generateVoucherCode() {
  return `VC${Date.now()}${crypto.randomInt(100000, 999999)}`;
}
