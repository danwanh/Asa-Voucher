import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startSecurityScanJob } from "./jobs/security-scan.job.js";
import { startOrderExpirationJob } from "./jobs/order-expiration.job.js";
import { startVoucherExpirationJob } from "./jobs/voucher-expiration.job.js";

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Asa Voucher API listening on port ${env.PORT}`);
  startSecurityScanJob();
  startOrderExpirationJob();
  startVoucherExpirationJob();
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${env.PORT} is already in use. Stop the existing server or change PORT in .env.`);
  } else {
    console.error("Unable to start the API server.", error);
  }
  process.exit(1);
});
