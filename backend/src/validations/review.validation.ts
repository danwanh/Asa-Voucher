import { z } from "zod";

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createReviewSchema = z.object({
  issued_voucher_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  media_urls: z.array(z.string().url()).max(10).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  comment: z.string().max(2000).optional(),
  media_urls: z.array(z.string().url()).max(10).optional(),
  is_published: z.boolean().optional(),
});
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const createReviewResponseSchema = z.object({
  content: z.string().min(1).max(2000),
});
export type CreateReviewResponseInput = z.infer<typeof createReviewResponseSchema>;
