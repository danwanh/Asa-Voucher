import { supabase } from "../config/supabase.js";
import { toRange } from "../utils/pagination.js";
import type { ReviewListFilter, ReviewRow } from "../types/review.types.js";
import type { CreateReviewInput, UpdateReviewInput } from "../validations/review.validation.js";

const BASE_SELECT = "*, voucher_products(id, name, partner_id)";

export async function listReviews(
  filter: ReviewListFilter,
): Promise<{ rows: ReviewRow[]; total: number }> {
  let query = supabase
    .from("reviews")
    .select(BASE_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (filter.voucherProductId) query = query.eq("voucher_product_id", filter.voucherProductId);
  if (filter.onlyPublished) query = query.eq("is_published", true);

  const [from, to] = toRange(filter);
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as ReviewRow[], total: count ?? 0 };
}

export async function findReviewById(id: string) {
  const { data, error } = await supabase.from("reviews").select(BASE_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as (ReviewRow & { voucher_products: { partner_id: string } }) | null;
}

export async function findReviewByIssuedVoucherId(issuedVoucherId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id")
    .eq("issued_voucher_id", issuedVoucherId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createReview(userId: string, voucherProductId: string, input: CreateReviewInput) {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      voucher_product_id: voucherProductId,
      user_id: userId,
      issued_voucher_id: input.issued_voucher_id,
      rating: input.rating,
      comment: input.comment ?? null,
      media_urls: input.media_urls ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ReviewRow;
}

export async function updateReview(id: string, input: UpdateReviewInput) {
  const { data, error } = await supabase
    .from("reviews")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ReviewRow;
}

export async function setReviewPublished(id: string, isPublished: boolean) {
  return updateReview(id, { is_published: isPublished });
}
