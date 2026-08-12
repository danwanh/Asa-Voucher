import { z } from "zod";

const alertStatusEnum = z.enum(["open", "reviewed", "locked"]);
const alertTypeEnum = z.enum(["brute_force", "unusual_ip", "multiple_device", "suspicious_time"]);

export const listAlertsQuerySchema = z.object({
  status: alertStatusEnum.optional(),
  alert_type: alertTypeEnum.optional(),
  user_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});
export type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;

export const idParamSchema = z.object({
  id: z.string().uuid(),
});
