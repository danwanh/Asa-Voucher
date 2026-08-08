import { z } from "zod";

export const cartItemSchema = z.object({
  voucher_product_id: z.string().uuid(),
  quantity: z.number().int().positive()
});

export const updateCartItemSchema = z.object({ quantity: z.number().int().positive() });

export const checkoutSchema = z.object({
  cart_item_ids: z.array(z.string().uuid()).optional(),
  payment_method: z.enum(["vnpay", "paypal"]).default("vnpay"),
  recipient_identifier: z.string().trim().min(3).max(255),
  is_gift: z.boolean().default(false),
  expected_prices: z.record(z.string().uuid(), z.number().nonnegative()).optional(),
  note: z.string().optional()
});

export const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1).optional(),
  cart_item_ids: z.array(z.string().uuid()).optional(),
  payment_method: z.enum(["vnpay", "paypal"]).default("vnpay"),
  recipient_identifier: z.string().trim().min(3).max(255),
  is_gift: z.boolean().default(false),
  expected_prices: z.record(z.string().uuid(), z.number().nonnegative()).optional(),
  note: z.string().optional()
}).refine((value) => value.items?.length || value.cart_item_ids?.length, {
  message: "items or cart_item_ids is required"
});

export const updateOrderSchema = z.object({
  note: z.string().nullable().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional()
});

export const createPaymentSchema = z.object({
  method: z.enum(["vnpay", "paypal"]).optional()
});
