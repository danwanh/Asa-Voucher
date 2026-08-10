import { z } from "zod";

const reasonEnum = z.enum([
  "not_as_described",
  "cannot_redeem",
  "expired_early",
  "wrong_value",
  "other",
]);
const statusEnum = z.enum(["open", "under_review", "resolved", "closed"]);
const resolutionTypeEnum = z.enum(["refund", "reissue", "no_action", "partner_penalized"]);

export const listComplaintsQuerySchema = z.object({
  status: statusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createComplaintSchema = z
  .object({
    order_id: z.string().uuid().optional(),
    issued_voucher_id: z.string().uuid().optional(),
    reason: reasonEnum,
    description: z.string().min(1).max(2000),
    evidence_urls: z.array(z.string().url()).max(10).optional(),
  })
  .refine((data) => Boolean(data.order_id || data.issued_voucher_id), {
    message: "order_id hoặc issued_voucher_id là bắt buộc",
  })
  .refine((data) => !data.issued_voucher_id || Boolean(data.order_id), {
    message: "Khiếu nại theo voucher bắt buộc phải có order_id",
  });
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const updateComplaintSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  evidence_urls: z.array(z.string().url()).max(10).optional(),
  status: statusEnum.optional(),
});
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;

export const assignComplaintSchema = z.object({
  assigned_to: z.string().uuid(),
});
export type AssignComplaintInput = z.infer<typeof assignComplaintSchema>;

export const resolveComplaintSchema = z.object({
  resolution_note: z.string().min(1).max(2000),
  resolution_type: resolutionTypeEnum,
});
export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;

export const createComplaintResponseSchema = z.object({
  content: z.string().min(1).max(2000),
});
export type CreateComplaintResponseInput = z.infer<typeof createComplaintResponseSchema>;
