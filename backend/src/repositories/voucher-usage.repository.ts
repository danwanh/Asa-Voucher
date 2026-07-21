import { supabase } from "../config/supabase.js";
import { toRange } from "../utils/pagination.js";
import type { VoucherUsageListFilter, VoucherUsageRow } from "../types/issued-voucher.types.js";

export async function createVoucherUsage(input: {
  issued_voucher_id: string;
  branch_id: string;
  redeemed_by: string;
  redemption_code?: string;
  note?: string;
}): Promise<VoucherUsageRow> {
  const { data, error } = await supabase
    .from("voucher_usages")
    .insert({ ...input, used_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VoucherUsageRow;
}

export async function listUsagesByIssuedVoucher(issuedVoucherId: string): Promise<VoucherUsageRow[]> {
  const { data, error } = await supabase
    .from("voucher_usages")
    .select("*")
    .eq("issued_voucher_id", issuedVoucherId)
    .order("used_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as VoucherUsageRow[];
}

const BASE_SELECT =
  "*, issued_vouchers!inner(id, voucher_code, owner_id, voucher_products!inner(partner_id))";

export async function listUsages(
  filter: VoucherUsageListFilter,
): Promise<{ rows: VoucherUsageRow[]; total: number }> {
  let query = supabase
    .from("voucher_usages")
    .select(BASE_SELECT, { count: "exact" })
    .order("used_at", { ascending: false });

  if (filter.partnerId) {
    query = query.eq("issued_vouchers.voucher_products.partner_id", filter.partnerId);
  }
  if (filter.branchId) query = query.eq("branch_id", filter.branchId);
  if (filter.issuedVoucherId) query = query.eq("issued_voucher_id", filter.issuedVoucherId);

  const [from, to] = toRange(filter);
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as VoucherUsageRow[], total: count ?? 0 };
}
