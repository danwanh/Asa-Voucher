import { z } from "zod";

export const listIssuedVouchersQuerySchema = z.object({
  status: z.enum(["active", "used", "expired", "revoked", "cancelled"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListIssuedVouchersQuery = z.infer<typeof listIssuedVouchersQuerySchema>;

export const updateIssuedVoucherStatusSchema = z.object({
  status: z.enum(["expired", "revoked"]),
  note: z.string().max(500).optional(),
});
export type UpdateIssuedVoucherStatusInput = z.infer<typeof updateIssuedVoucherStatusSchema>;

export const listVoucherUsagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const checkVoucherSchema = z.object({
  voucher_code: z.string().min(1, "Mã voucher không được để trống").optional(),
  qr_code_payload: z.string().min(1).optional(),
}).refine(
  (data) => Boolean(data.voucher_code || data.qr_code_payload),
  {
    message: "voucher_code hoặc qr_code_payload là bắt buộc",
  }
);
export type CheckVoucherInput = z.infer<typeof checkVoucherSchema>;

export const confirmVoucherSchema = z.object({
  voucher_code: z.string().min(1, "Mã voucher không được để trống"),
  note: z.string().max(500).optional(),
});
export type ConfirmVoucherInput = z.infer<typeof confirmVoucherSchema>;