import cron from "node-cron";
import { detectAnomalies } from "../services/security-alert.service.js";

export function startSecurityScanJob() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const result = await detectAnomalies();
      if (result.detected > 0) {
        console.log(`[security-scan] Phát hiện ${result.detected} cảnh báo mới`);
      }
    } catch (err) {
      console.error("[security-scan] Lỗi khi quét:", err);
    }
  });

  console.log("[security-scan] Đã khởi động job quét bảo mật định kỳ (mỗi 5 phút)");
}