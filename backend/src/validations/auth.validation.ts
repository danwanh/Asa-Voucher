import { z } from "zod";

const registrationFields = z.object({
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().regex(/^(0|\+84)[0-9]{8,9}$/).optional(),
  password: z.string().min(8).max(64).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  confirm_password: z.string(),
  full_name: z.string().trim().min(1).max(100),
  city: z.string().trim().optional(),
  district: z.string().trim().optional(),
  address: z.string().trim().optional()
});

export const registerSchema = registrationFields.refine((value) => value.password === value.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

export const partnerRegisterSchema = registrationFields.extend({
  business_name: z.string().trim().min(1).max(255),
  business_type: z.enum(["restaurant", "spa", "entertainment", "hotel", "other"]).optional(),
  tax_number: z.string().trim().min(1).max(20),
  website_url: z.string().url().optional(),
  description: z.string().trim().max(2000).optional()
}).refine((value) => value.password === value.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

export const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1)
});

export const verifyEmailSchema = z.object({ token: z.string().min(20) });
export const resendVerificationSchema = z.object({ email: z.string().trim().email().toLowerCase() });
export const forgotPasswordSchema = z.object({ identifier: z.string().trim().email().toLowerCase() });
export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  new_password: z.string().min(8).max(64).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  confirm_password: z.string()
}).refine((value) => value.new_password === value.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(64).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  confirm_password: z.string()
}).refine((value) => value.new_password === value.confirm_password, { path: ["confirm_password"] });

export const createUserSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(64).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  full_name: z.string().trim().min(1).max(100),
  role: z.enum(["buyer", "partner_owner", "partner_voucher_staff", "partner_store_staff", "admin_content", "admin_operations", "admin_security"]),
  phone: z.string().trim().regex(/^(0|\+84)[0-9]{8,9}$/).optional(),
  partner_branches_id: z.string().uuid().optional()
});

export const updateUserSchema = z.object({
  phone: z.string().trim().nullable().optional(),
  full_name: z.string().trim().min(1).max(100).optional(),
  avatar_url: z.string().url().nullable().optional(),
  dob: z.string().date().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  role: z.enum(["buyer", "partner_owner", "partner_voucher_staff", "partner_store_staff", "admin_content", "admin_operations", "admin_security"]).optional(),
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  partner_branches_id: z.string().uuid().nullable().optional()
});

export const userQuerySchema = z.object({
  role: z.enum(["buyer", "partner_owner", "partner_voucher_staff", "partner_store_staff", "admin_content", "admin_operations", "admin_security"]).optional(),
  is_active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});
