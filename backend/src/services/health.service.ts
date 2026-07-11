import { getDatabaseStatus } from "../repositories/health.repository.js";

export async function getHealthStatus() {
  const database = await getDatabaseStatus();

  return {
    status: "ok",
    service: "asa-voucher-backend",
    database
  };
}
