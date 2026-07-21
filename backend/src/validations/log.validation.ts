import { z } from "zod";

const basePagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
};

export const authenticationLogQuerySchema = z.object({
  ...basePagination,
  user_id: z.string().uuid().optional(),
  action: z.string().optional(),
  status: z.string().optional(),
});
export type AuthenticationLogQuery = z.infer<typeof authenticationLogQuerySchema>;

export const adminLogQuerySchema = z.object({
  ...basePagination,
  admin_id: z.string().uuid().optional(),
  target_user_id: z.string().uuid().optional(),
  target_partner_id: z.string().uuid().optional(),
  target_voucher_id: z.string().uuid().optional(),
  action: z.string().optional(),
});
export type AdminLogQuery = z.infer<typeof adminLogQuerySchema>;

export const orderLogQuerySchema = z.object({
  ...basePagination,
  order_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  action: z.string().optional(),
});
export type OrderLogQuery = z.infer<typeof orderLogQuerySchema>;

export const paymentLogQuerySchema = z.object({
  ...basePagination,
  payment_id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  status: z.string().optional(),
});
export type PaymentLogQuery = z.infer<typeof paymentLogQuerySchema>;
