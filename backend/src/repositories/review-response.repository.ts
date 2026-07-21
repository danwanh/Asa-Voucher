import { prisma } from "../config/prisma.js";
import type { ReviewResponseRow } from "../types/review.types.js";

export async function listResponsesByReview(reviewId: string): Promise<ReviewResponseRow[]> {
  return prisma.reviewResponse.findMany({
    where: { review_id: reviewId },
    orderBy: { created_at: "asc" },
  }) as Promise<ReviewResponseRow[]>;
}

export async function createReviewResponse(
  reviewId: string,
  respondedBy: string,
  content: string,
): Promise<ReviewResponseRow> {
  return prisma.reviewResponse.create({
    data: { review_id: reviewId, responded_by: respondedBy, content },
  }) as Promise<ReviewResponseRow>;
}
