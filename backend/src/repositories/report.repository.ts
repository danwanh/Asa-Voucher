import { supabase } from "../config/supabase.js";

export interface PaidOrderRow {
  id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface PartnerScopedOrderItemRow {
  order_id: string;
  subtotal: number;
  created_at: string;
  orders: { payment_status: string; status: string; created_at: string } | null;
  voucher_products: { partner_id: string } | null;
}

function applyDateRange<T extends { gte: (...args: unknown[]) => T; lte: (...args: unknown[]) => T }>(
  query: T,
  column: string,
  dateFrom?: string,
  dateTo?: string,
): T {
  let q = query;
  if (dateFrom) q = q.gte(column, dateFrom);
  if (dateTo) q = q.lte(column, dateTo);
  return q;
}

/** Toàn bộ đơn đã thanh toán thành công trong khoảng thời gian (dùng khi không lọc theo partner). */
export async function listPaidOrders(dateFrom?: string, dateTo?: string): Promise<PaidOrderRow[]> {
  let query = supabase
    .from("orders")
    .select("id, total_amount, status, payment_status, created_at")
    .eq("payment_status", "paid");
  query = applyDateRange(query, "created_at", dateFrom, dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PaidOrderRow[];
}

/** order_items thuộc voucher của một partner cụ thể, kèm trạng thái đơn hàng, dùng để tính doanh thu/đơn theo partner. */
export async function listOrderItemsForPartner(
  partnerId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<PartnerScopedOrderItemRow[]> {
  let query = supabase
    .from("order_items")
    .select(
      "order_id, subtotal, created_at, orders!inner(payment_status, status, created_at), voucher_products!inner(partner_id)",
    )
    .eq("voucher_products.partner_id", partnerId);
  query = applyDateRange(query, "orders.created_at", dateFrom, dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PartnerScopedOrderItemRow[];
}

/** Toàn bộ đơn hàng (mọi trạng thái thanh toán) trong khoảng thời gian, dùng cho thống kê đơn hàng. */
export async function listAllOrders(dateFrom?: string, dateTo?: string): Promise<PaidOrderRow[]> {
  let query = supabase.from("orders").select("id, total_amount, status, payment_status, created_at");
  query = applyDateRange(query, "created_at", dateFrom, dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PaidOrderRow[];
}

/** order_items thuộc voucher của một partner, không lọc payment_status, dùng cho thống kê đơn hàng theo partner. */
export async function listAllOrderItemsForPartner(
  partnerId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<PartnerScopedOrderItemRow[]> {
  let query = supabase
    .from("order_items")
    .select(
      "order_id, subtotal, created_at, orders!inner(payment_status, status, created_at), voucher_products!inner(partner_id)",
    )
    .eq("voucher_products.partner_id", partnerId);
  query = applyDateRange(query, "orders.created_at", dateFrom, dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PartnerScopedOrderItemRow[];
}

export interface VoucherProductStatsRow {
  id: string;
  name: string;
  partner_id: string;
  total_quantity: number;
  remaining_quantity: number;
}

export async function listVoucherProductStats(partnerId?: string): Promise<VoucherProductStatsRow[]> {
  let query = supabase.from("voucher_products").select("id, name, partner_id, total_quantity, remaining_quantity");
  if (partnerId) query = query.eq("partner_id", partnerId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as VoucherProductStatsRow[];
}

export async function countUsedIssuedVouchersByProduct(
  voucherProductIds: string[],
): Promise<Record<string, number>> {
  if (voucherProductIds.length === 0) return {};

  const { data, error } = await supabase
    .from("issued_vouchers")
    .select("voucher_product_id")
    .eq("status", "used")
    .in("voucher_product_id", voucherProductIds);
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { voucher_product_id: string }[]) {
    counts[row.voucher_product_id] = (counts[row.voucher_product_id] ?? 0) + 1;
  }
  return counts;
}

export interface PartnerRow {
  id: string;
  business_name: string;
}

export async function listPartners(): Promise<PartnerRow[]> {
  const { data, error } = await supabase.from("partners").select("id, business_name");
  if (error) throw error;
  return (data ?? []) as unknown as PartnerRow[];
}

export async function countVoucherProductsByPartner(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("voucher_products").select("partner_id");
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { partner_id: string }[]) {
    counts[row.partner_id] = (counts[row.partner_id] ?? 0) + 1;
  }
  return counts;
}
