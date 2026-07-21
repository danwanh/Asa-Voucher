import { supabase } from "../config/supabase.js";
import { toRange, type PaginationParams } from "../utils/pagination.js";
import type {
  AdminLogRow,
  AuthenticationLogRow,
  OrderLogRow,
  PaymentLogRow,
} from "../types/log.types.js";

interface DateRangeFilter extends PaginationParams {
  date_from?: string;
  date_to?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDateRange<T extends { gte: any; lte: any }>(
  query: T,
  filter: DateRangeFilter,
  column = "occurred_at",
): T {
  let q = query;
  if (filter.date_from) q = q.gte(column, filter.date_from);
  if (filter.date_to) q = q.lte(column, filter.date_to);
  return q;
}

export async function listAuthenticationLogs(
  filter: DateRangeFilter & { user_id?: string; action?: string; status?: string },
): Promise<{ rows: AuthenticationLogRow[]; total: number }> {
  let query = supabase
    .from("authentication_logs")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false });

  if (filter.user_id) query = query.eq("user_id", filter.user_id);
  if (filter.action) query = query.eq("action", filter.action);
  if (filter.status) query = query.eq("status", filter.status);
  query = applyDateRange(query, filter);

  const [from, to] = toRange(filter);
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as AuthenticationLogRow[], total: count ?? 0 };
}

export async function findAuthenticationLogById(id: string) {
  const { data, error } = await supabase
    .from("authentication_logs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as AuthenticationLogRow | null;
}

export async function listAdminLogs(
  filter: DateRangeFilter & {
    admin_id?: string;
    target_user_id?: string;
    target_partner_id?: string;
    target_voucher_id?: string;
    action?: string;
  },
): Promise<{ rows: AdminLogRow[]; total: number }> {
  let query = supabase
    .from("admin_logs")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false });

  if (filter.admin_id) query = query.eq("admin_id", filter.admin_id);
  if (filter.target_user_id) query = query.eq("target_user_id", filter.target_user_id);
  if (filter.target_partner_id) query = query.eq("target_partner_id", filter.target_partner_id);
  if (filter.target_voucher_id) query = query.eq("target_voucher_id", filter.target_voucher_id);
  if (filter.action) query = query.eq("action", filter.action);
  query = applyDateRange(query, filter);

  const [from, to] = toRange(filter);
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as AdminLogRow[], total: count ?? 0 };
}

export async function findAdminLogById(id: string) {
  const { data, error } = await supabase.from("admin_logs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as AdminLogRow | null;
}

export async function listOrderLogs(
  filter: DateRangeFilter & { order_id?: string; user_id?: string; action?: string },
): Promise<{ rows: OrderLogRow[]; total: number }> {
  let query = supabase
    .from("order_logs")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false });

  if (filter.order_id) query = query.eq("order_id", filter.order_id);
  if (filter.user_id) query = query.eq("user_id", filter.user_id);
  if (filter.action) query = query.eq("action", filter.action);
  query = applyDateRange(query, filter);

  const [from, to] = toRange(filter);
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as OrderLogRow[], total: count ?? 0 };
}

export async function findOrderLogById(id: string) {
  const { data, error } = await supabase.from("order_logs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as OrderLogRow | null;
}

export async function listPaymentLogs(
  filter: DateRangeFilter & { payment_id?: string; order_id?: string; user_id?: string; status?: string },
): Promise<{ rows: PaymentLogRow[]; total: number }> {
  let query = supabase
    .from("payment_logs")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false });

  if (filter.payment_id) query = query.eq("payment_id", filter.payment_id);
  if (filter.order_id) query = query.eq("order_id", filter.order_id);
  if (filter.user_id) query = query.eq("user_id", filter.user_id);
  if (filter.status) query = query.eq("status", filter.status);
  query = applyDateRange(query, filter);

  const [from, to] = toRange(filter);
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as PaymentLogRow[], total: count ?? 0 };
}

export async function findPaymentLogById(id: string) {
  const { data, error } = await supabase.from("payment_logs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as PaymentLogRow | null;
}
