import cron from "node-cron";
import { expirePendingOrders } from "../services/commerce.service.js";

export function startOrderExpirationJob() {
  cron.schedule("* * * * *", async () => {
    try {
      await expirePendingOrders();
    } catch (error) {
      console.error("Unable to expire pending orders", error);
    }
  });
}
