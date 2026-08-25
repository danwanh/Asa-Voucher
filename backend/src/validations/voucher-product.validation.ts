import { z } from "zod";

export const voucherProductQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  partner_id: z.string().uuid().optional(),
  area: z.string().trim().min(1).optional(),
  search: z.string().trim().optional(),
  scope: z.enum(["mine"]).optional(),
  approval_status: z.enum(["pending", "approved"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

const voucherProductBaseSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(255, "Name must not exceed 255 characters"),
  description: z.string().max(2000, "Description must not exceed 2000 characters").optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  original_price: z.number().positive(),
  selling_price: z.number().positive(),
  applicable_area: z.string().max(255, "Applicable area must not exceed 255 characters").optional(),
  total_quantity: z.number().int().min(1, "Total quantity must be at least 1"),
  terms_and_conditions: z.unknown().optional(),
  usage_instructions: z.unknown().optional(),
  sale_start_date: z.string(),
  sale_end_date: z.string(),
  validity_days: z.number().int().min(1, "Validity days must be at least 1").max(3650, "Validity days must not exceed 3650"),
});

export const createVoucherProductSchema = voucherProductBaseSchema
  .refine(
    (data) => {
      if (!data.sale_start_date || !data.sale_end_date) return true;
      return new Date(data.sale_end_date) > new Date(data.sale_start_date);
    },
    { message: "Sale end date must be after sale start date", path: ["sale_end_date"] }
  )
  .refine(
    (data) => {
      if (!data.original_price || !data.selling_price) return true;
      return data.selling_price <= data.original_price;
    },
    { message: "Selling price must not exceed original price (RB-02)", path: ["selling_price"] }
  );

export const updateVoucherProductSchema = voucherProductBaseSchema
  .partial()
  .refine(
    (data) => {
      if (!data.sale_start_date || !data.sale_end_date) return true;
      return new Date(data.sale_end_date) > new Date(data.sale_start_date);
    },
    { message: "Sale end date must be after sale start date", path: ["sale_end_date"] }
  )
  .refine(
    (data) => {
      if (!data.original_price || !data.selling_price) return true;
      return data.selling_price <= data.original_price;
    },
    { message: "Selling price must not exceed original price (RB-02)", path: ["selling_price"] }
  );

export const approvalSchema = z.object({
  approval_status: z.enum(["approved", "rejected"]),
  reject_reason: z.string().min(1, "Lý do từ chối không được để trống").optional(),
 }).refine(
    (data) => data.approval_status === "approved" || (data.approval_status === "rejected" && data.reject_reason),
    {message: "Lý do từ chối là bắt buộc khi từ chối voucher", path:["reject_reason"]}
 );

export const voucherStatusSchema = z.object({ status: z.enum(["draft", "active", "paused", "sold_out", "expired"]) });

export const createVoucherImageSchema = z.object({
  image_url: z.string().url(),
  is_primary: z.boolean().optional(),
  sort_order: z.number().int().optional()
});

export const updateVoucherImageSchema = createVoucherImageSchema.partial();
export const voucherBranchSchema = z.object({ branch_id: z.string().uuid() });
