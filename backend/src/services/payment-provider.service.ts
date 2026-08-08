import crypto from "node:crypto";

export type PaymentProvider = "vnpay" | "paypal";

export function createSimulatedPayment(provider: PaymentProvider, orderId: string) {
  const prefix = provider === "vnpay" ? "VNPAY" : "PAYPAL";
  return {
    transactionRef: `SIM-${prefix}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`,
    gatewayResponse: JSON.stringify({ provider, mode: "simulated", orderId }),
  };
}
