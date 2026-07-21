import { supabase } from "../config/supabase.js";
import { toRange } from "../utils/pagination.js";
import type {
  IssuedVoucherListFilter,
  IssuedVoucherRow,
  IssuedVoucherStatus,
} from "../types/issued-voucher.types.js";

const BASE_SELECT =
  "*, voucher_products!inner(id, name, partner_id, thumbnail_url), order_items(id, order_id)";

export async function listIssuedVouchers(
  filter: IssuedVoucherListFilter,
): Promise<{ rows: IssuedVoucherRow[]; total: number }> {
  let query = supabase
    .from("issued_vouchers")
    .select(BASE_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (filter.ownerId) query = query.eq("owner_id", filter.ownerId);
  if (filter.partnerId) query = query.eq("voucher_products.partner_id", filter.partnerId);
  if (filter.status) query = query.eq("status", filter.status);

  const [from, to] = toRange(filter);
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { rows: (data ?? []) as unknown as IssuedVoucherRow[], total: count ?? 0 };
}

export async function findIssuedVoucherById(id: string) {
  const { data, error } = await supabase
    .from("issued_vouchers")
    .select(BASE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (IssuedVoucherRow & { voucher_products: { partner_id: string } }) | null;
}

export async function findIssuedVoucherByCode(voucherCode: string) {
  const { data, error } = await supabase
    .from("issued_vouchers")
    .select(BASE_SELECT)
    .eq("voucher_code", voucherCode)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (IssuedVoucherRow & { voucher_products: { partner_id: string } }) | null;
}

export async function findIssuedVoucherByQrPayload(qrCodePayload: string) {
  const { data, error } = await supabase
    .from("issued_vouchers")
    .select(BASE_SELECT)
    .eq("qr_code_payload", qrCodePayload)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (IssuedVoucherRow & { voucher_products: { partner_id: string } }) | null;
}

export async function updateIssuedVoucherStatus(id: string, status: IssuedVoucherStatus) {
  const { data, error } = await supabase
    .from("issued_vouchers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as IssuedVoucherRow;
}

export async function findEligibleBranchIds(voucherProductId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("voucher_product_branches")
    .select("branch_id")
    .eq("voucher_product_id", voucherProductId);
  if (error) throw error;
  return (data ?? []).map((row) => row.branch_id as string);
}
