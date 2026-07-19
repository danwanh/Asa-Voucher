import { z } from "zod";

export const partnerQuerySchema = z.object({
  approval_status: z.enum(["pending", "approved", "rejected"]).optional(),
  status: z.enum(["active", "suspended", "closed"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export const createPartnerSchema = z.object({
  representative_user_id: z.string().uuid().optional(),
  business_name: z.string().trim().min(1),
  business_code: z.string().trim().min(1),
  business_type: z.enum(["restaurant", "spa", "entertainment", "hotel", "other"]).optional(),
  tax_number: z.string().trim().optional(),
  logo_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  description: z.string().optional()
});

export const updatePartnerSchema = createPartnerSchema.partial().omit({ representative_user_id: true });

export const partnerApprovalSchema = z.object({
  approval_status: z.enum(["approved", "rejected"])
});

export const partnerStatusSchema = z.object({ status: z.enum(["active", "suspended", "closed"]) });

export const createBranchSchema = z.object({
  branch_name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1),
  district: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  is_active: z.boolean().optional()
});

export const updateBranchSchema = createBranchSchema.partial();
