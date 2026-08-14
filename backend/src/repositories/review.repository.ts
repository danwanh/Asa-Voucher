import { prisma } from "../config/prisma.js";
import type { ReviewListFilter, ReviewRow } from "../types/review.types.js";
import type { CreateReviewInput, UpdateReviewInput } from "../validations/review.validation.js";

const INCLUDE = {
  voucher_products: { select: { id: true, name: true, partner_id: true } },
  users: { select: { full_name: true, avatar_url: true } },
} as const;

export async function listReviews(
  filter: ReviewListFilter,
): Promise<{ rows: ReviewRow[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filter.voucherProductId) where.voucher_product_id = filter.voucherProductId;
  if (filter.onlyPublished) where.is_published = true;

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const [rows, total] = await Promise.all([
    prisma.review.findMany({ where, include: INCLUDE, orderBy: { created_at: "desc" }, skip, take }),
    prisma.review.count({ where }),
  ]);

  return { rows: rows as unknown as ReviewRow[], total };
}

export async function findReviewById(id: string) {
  return prisma.review.findUnique({ where: { id }, include: INCLUDE }) as Promise<(ReviewRow & { voucher_products: { partner_id: string } }) | null>;
}

export async function findReviewByUserAndIssuedVoucherId(userId: string, issuedVoucherId: string) {
  return prisma.review.findUnique({
    where: { user_id_issued_voucher_id: { user_id: userId, issued_voucher_id: issuedVoucherId } },
    select: { id: true },
  });
}

export async function getReviewStats(voucherProductId: string) {
  return prisma.review.aggregate({
    where: { voucher_product_id: voucherProductId, is_published: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
}

export async function createReview(userId: string, voucherProductId: string, input: CreateReviewInput) {
  return prisma.review.create({
    data: {
      voucher_product_id: voucherProductId,
      user_id: userId,
      issued_voucher_id: input.issued_voucher_id,
      rating: input.rating,
      comment: input.comment ?? null,
      media_urls: input.media_urls ?? undefined,
    },
  }) as Promise<ReviewRow>;
}

export async function updateReview(id: string, input: UpdateReviewInput) {
  return prisma.review.update({
    where: { id },
    data: { ...input, updated_at: new Date() },
  }) as Promise<ReviewRow>;
}

export async function setReviewPublished(id: string, isPublished: boolean) {
  return updateReview(id, { is_published: isPublished });
}
