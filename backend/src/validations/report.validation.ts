import { z } from "zod";

export const reportQuerySchema = z.object({
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  partner_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  voucher_product_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;
