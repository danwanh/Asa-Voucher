import { z } from "zod";

export const partnerStaffQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(100).optional()
});

export const partnerStaffUpdateSchema = z
  .object({
    full_name: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().regex(/^(0|\+84)[0-9]{8,9}$/).nullable().optional(),
    role: z.enum(["partner_voucher_staff", "partner_store_staff"]).optional(),
    partner_branches_id: z.string().uuid().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });
  
export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
})
