import { supabase } from "../config/supabase.js";
import { toRange } from "../utils/pagination.js";
import type { ComplaintListFilter, ComplaintRow } from "../types/complaint.types.js";
import type { CreateComplaintInput } from "../validations/complaint.validation.js";

const BASE_SELECT =
  "*, issued_vouchers(id, voucher_product_id, voucher_products(partner_id)), orders(id, user_id)";

export async function listComplaints(
  filter: ComplaintListFilter,
): Promise<{ rows: ComplaintRow[]; total: number }> {
  let query = supabase
    .from("complaints")
    .select(BASE_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (filter.userId) query = query.eq("user_id", filter.userId);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.partnerId) {
    query = query.eq("issued_vouchers.voucher_products.partner_id", filter.partnerId);
  }

  const [from, to] = toRange(filter);
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as ComplaintRow[], total: count ?? 0 };
}

export async function findComplaintById(id: string) {
  const { data, error } = await supabase
    .from("complaints")
    .select(BASE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as
    | (ComplaintRow & {
        issued_vouchers: { voucher_products: { partner_id: string } } | null;
        orders: { user_id: string } | null;
      })
    | null;
}

export async function createComplaint(userId: string, input: CreateComplaintInput) {
  const { data, error } = await supabase
    .from("complaints")
    .insert({
      order_id: input.order_id ?? null,
      issued_voucher_id: input.issued_voucher_id ?? null,
      user_id: userId,
      reason: input.reason,
      description: input.description,
      evidence_urls: input.evidence_urls ?? null,
      status: "open",
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ComplaintRow;
}

export async function findOrderOwner(orderId: string): Promise<{ id: string; user_id: string } | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, user_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; user_id: string } | null;
}

export async function updateComplaint(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("complaints")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ComplaintRow;
}
