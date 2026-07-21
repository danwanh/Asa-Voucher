import { HttpError } from "../utils/http-error.js";
import { buildPaginatedResult } from "../utils/pagination.js";
import * as reviewRepo from "../repositories/review.repository.js";
import * as reviewResponseRepo from "../repositories/review-response.repository.js";
import * as issuedVoucherRepo from "../repositories/issued-voucher.repository.js";
import type { AuthUser } from "../types/auth.types.js";
import type {
  CreateReviewInput,
  CreateReviewResponseInput,
  UpdateReviewInput,
} from "../validations/review.validation.js";

export async function listPublicReviews(
  voucherProductId: string,
  query: { page: number; limit: number },
) {
  const { rows, total } = await reviewRepo.listReviews({
    voucherProductId,
    onlyPublished: true,
    page: query.page,
    limit: query.limit,
  });
  return buildPaginatedResult(rows, total, query);
}

export async function getReviewById(user: AuthUser | undefined, id: string) {
  const review = await reviewRepo.findReviewById(id);
  if (!review) throw new HttpError(404, "Không tìm thấy đánh giá");

  if (!review.is_published) {
    const isOwner = user?.id === review.user_id;
    const isAdmin = user?.role === "admin_content";
    if (!isOwner && !isAdmin) throw new HttpError(404, "Không tìm thấy đánh giá");
  }

  return review;
}

export async function createReview(user: AuthUser, input: CreateReviewInput) {
  if (user.role !== "buyer") {
    throw new HttpError(403, "Chỉ khách hàng được tạo đánh giá");
  }

  const issuedVoucher = await issuedVoucherRepo.findIssuedVoucherById(input.issued_voucher_id);
  if (!issuedVoucher) throw new HttpError(404, "Không tìm thấy voucher đã mua");
  if (issuedVoucher.owner_id !== user.id) {
    throw new HttpError(403, "Bạn chỉ được đánh giá voucher của chính mình");
  }
  // RB-10: chỉ được đánh giá sau khi đã sử dụng
  if (issuedVoucher.status !== "used") {
    throw new HttpError(422, "Chỉ được đánh giá sau khi đã sử dụng voucher");
  }

  const existing = await reviewRepo.findReviewByIssuedVoucherId(input.issued_voucher_id);
  if (existing) throw new HttpError(409, "Voucher này đã được đánh giá trước đó");

  return reviewRepo.createReview(user.id, issuedVoucher.voucher_product_id, input);
}

export async function updateReview(user: AuthUser, id: string, input: UpdateReviewInput) {
  const review = await reviewRepo.findReviewById(id);
  if (!review) throw new HttpError(404, "Không tìm thấy đánh giá");

  const isOwner = review.user_id === user.id;
  const isAdminContent = user.role === "admin_content";

  if (!isOwner && !isAdminContent) {
    throw new HttpError(403, "Bạn không có quyền cập nhật đánh giá này");
  }

  // Chỉ admin_content được đổi trạng thái publish (kiểm duyệt)
  if (!isAdminContent && input.is_published !== undefined) {
    throw new HttpError(403, "Chỉ quản trị nội dung được thay đổi trạng thái hiển thị");
  }

  return reviewRepo.updateReview(id, input);
}

export async function hideReview(user: AuthUser, id: string) {
  const review = await reviewRepo.findReviewById(id);
  if (!review) throw new HttpError(404, "Không tìm thấy đánh giá");

  const isOwner = review.user_id === user.id;
  const isAdminContent = user.role === "admin_content";
  if (!isOwner && !isAdminContent) {
    throw new HttpError(403, "Bạn không có quyền xóa đánh giá này");
  }

  return reviewRepo.setReviewPublished(id, false);
}

export async function listReviewResponses(id: string) {
  await getReviewById(undefined, id);
  return reviewResponseRepo.listResponsesByReview(id);
}

export async function createReviewResponse(user: AuthUser, id: string, input: CreateReviewResponseInput) {
  const review = await reviewRepo.findReviewById(id);
  if (!review) throw new HttpError(404, "Không tìm thấy đánh giá");

  const isPartnerOwner =
    user.role === "partner_owner" && review.voucher_products.partner_id === user.partnerId;
  const isAdminContent = user.role === "admin_content";

  if (!isPartnerOwner && !isAdminContent) {
    throw new HttpError(403, "Bạn không có quyền phản hồi đánh giá này");
  }

  return reviewResponseRepo.createReviewResponse(id, user.id, input.content);
}
