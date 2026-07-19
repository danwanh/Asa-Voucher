import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8),
  full_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  district: z.string().trim().optional(),
  address: z.string().trim().optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1)
});

export const forgotPasswordSchema = z.object({ email: z.string().trim().email().toLowerCase() });

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8)
});

export const createUserSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8),
  full_name: z.string().trim().min(1).max(100),
  role: z.enum(["buyer", "partner_owner", "partner_voucher_staff", "partner_store_staff", "admin_content", "admin_account", "admin_security"]),
  phone: z.string().trim().optional(),
  partner_branches_id: z.string().uuid().optional()
});

export const updateUserSchema = z.object({
  phone: z.string().trim().nullable().optional(),
  full_name: z.string().trim().min(1).max(100).optional(),
  avatar_url: z.string().url().nullable().optional(),
  dob: z.string().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  role: z.enum(["buyer", "partner_owner", "partner_voucher_staff", "partner_store_staff", "admin_content", "admin_account", "admin_security"]).optional(),
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  partner_branches_id: z.string().uuid().nullable().optional()
});

export const userQuerySchema = z.object({
  role: z.enum(["buyer", "partner_owner", "partner_voucher_staff", "partner_store_staff", "admin_content", "admin_account", "admin_security"]).optional(),
  is_active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});
