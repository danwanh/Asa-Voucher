import cron from "node-cron";
import { expireIssuedVouchers } from "../services/issued-voucher.service.js";

export function startVoucherExpirationJob() {
  cron.schedule("0 0 * * *", async () => {
    try {
      const count = await expireIssuedVouchers();
      if (count > 0) {
        console.log(`[voucher-expiration] Marked ${count} issued voucher(s) as expired`);
      }
    } catch (error) {
      console.error("[voucher-expiration] Unable to expire issued vouchers", error);
    }
  });
}
