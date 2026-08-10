import { z } from "zod";

export const voucherProductQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  partner_id: z.string().uuid().optional(),
  area: z.string().trim().min(1).optional(),
  search: z.string().trim().optional(),
  scope: z.enum(["mine"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export const createVoucherProductSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().trim().min(1),
  description: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
  original_price: z.number().positive(),
  selling_price: z.number().positive(),
  applicable_area: z.string().optional(),
  total_quantity: z.number().int().nonnegative(),
  terms_and_conditions: z.unknown().optional(),
  usage_instructions: z.unknown().optional(),
  sale_start_date: z.string(),
  sale_end_date: z.string(),
  validity_days: z.number().int().positive()
});

export const updateVoucherProductSchema = createVoucherProductSchema.partial();

export const approvalSchema = z.object({ approval_status: z.enum(["approved", "rejected"]) });
export const voucherStatusSchema = z.object({ status: z.enum(["draft", "active", "paused", "sold_out", "expired"]) });

export const createVoucherImageSchema = z.object({
  image_url: z.string().url(),
  is_primary: z.boolean().optional(),
  sort_order: z.number().int().optional()
});

export const updateVoucherImageSchema = createVoucherImageSchema.partial();
export const voucherBranchSchema = z.object({ branch_id: z.string().uuid() });
