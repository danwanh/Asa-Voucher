import { z } from "zod";

export const listIssuedVouchersQuerySchema = z.object({
  status: z.enum(["active", "used", "expired", "refunded"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListIssuedVouchersQuery = z.infer<typeof listIssuedVouchersQuerySchema>;

export const updateIssuedVoucherStatusSchema = z.object({
  status: z.enum(["expired", "refunded"]),
  note: z.string().max(500).optional(),
});
export type UpdateIssuedVoucherStatusInput = z.infer<typeof updateIssuedVoucherStatusSchema>;

export const validateVoucherSchema = z
  .object({
    voucher_code: z.string().min(1).optional(),
    qr_code_payload: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.voucher_code || data.qr_code_payload), {
    message: "voucher_code hoặc qr_code_payload là bắt buộc",
  });
export type ValidateVoucherInput = z.infer<typeof validateVoucherSchema>;

export const redeemVoucherSchema = z.object({
  branch_id: z.string().uuid(),
  redemption_code: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
});
export type RedeemVoucherInput = z.infer<typeof redeemVoucherSchema>;

export const listVoucherUsagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
