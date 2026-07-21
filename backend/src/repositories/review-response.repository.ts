import { supabase } from "../config/supabase.js";
import type { ReviewResponseRow } from "../types/review.types.js";

export async function listResponsesByReview(reviewId: string): Promise<ReviewResponseRow[]> {
  const { data, error } = await supabase
    .from("review_responses")
    .select("*")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ReviewResponseRow[];
}

export async function createReviewResponse(
  reviewId: string,
  respondedBy: string,
  content: string,
): Promise<ReviewResponseRow> {
  const { data, error } = await supabase
    .from("review_responses")
    .insert({ review_id: reviewId, responded_by: respondedBy, content })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ReviewResponseRow;
}
