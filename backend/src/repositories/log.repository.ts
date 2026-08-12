import { prisma } from "../config/prisma.js";
import { PaginationParams } from "../utils/pagination.js";
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

function toDateRange(filter: DateRangeFilter, column = "occurred_at") {
  const range: Record<string, Date> = {};
  if (filter.date_from) range.gte = new Date(filter.date_from);
  if (filter.date_to) range.lte = new Date(filter.date_to);
  return Object.keys(range).length ? { [column]: range } : {};
}

export async function listAuthenticationLogs(
  filter: DateRangeFilter & { user_id?: string; action?: string; status?: string },
): Promise<{ rows: AuthenticationLogRow[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filter.user_id) where.user_id = filter.user_id;
  if (filter.action) where.action = filter.action;
  if (filter.status) where.status = filter.status;
  Object.assign(where, toDateRange(filter));

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const [rows, total] = await Promise.all([
    prisma.authenticationLog.findMany({ where, orderBy: { occurred_at: "desc" }, skip, take }),
    prisma.authenticationLog.count({ where }),
  ]);

  return { rows: rows as unknown as AuthenticationLogRow[], total };
}

export async function findAuthenticationLogById(id: string) {
  return prisma.authenticationLog.findUnique({ where: { id } }) as Promise<AuthenticationLogRow | null>;
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
  const where: Record<string, unknown> = {};
  if (filter.admin_id) where.admin_id = filter.admin_id;
  if (filter.target_user_id) where.target_user_id = filter.target_user_id;
  if (filter.target_partner_id) where.target_partner_id = filter.target_partner_id;
  if (filter.target_voucher_id) where.target_voucher_id = filter.target_voucher_id;
  if (filter.action) where.action = filter.action;
  Object.assign(where, toDateRange(filter));

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const [rows, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { occurred_at: "desc" },
      skip,
      take,
      include: {
        admin: { select: { id: true, email: true, full_name: true } },
      },
    }),
    prisma.adminLog.count({ where }),
  ]);

  return { rows: rows as unknown as AdminLogRow[], total };
}

export async function findAdminLogById(id: string) {
  return prisma.adminLog.findUnique({
    where: { id },
    include: {
      admin: { select: { id: true, email: true, full_name: true } },
    },
  }) as Promise<AdminLogRow | null>;
}

export async function listOrderLogs(
  filter: DateRangeFilter & { order_id?: string; user_id?: string; action?: string },
): Promise<{ rows: OrderLogRow[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filter.order_id) where.order_id = filter.order_id;
  if (filter.user_id) where.user_id = filter.user_id;
  if (filter.action) where.action = filter.action;
  Object.assign(where, toDateRange(filter));

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const [rows, total] = await Promise.all([
    prisma.orderLog.findMany({ where, orderBy: { occurred_at: "desc" }, skip, take }),
    prisma.orderLog.count({ where }),
  ]);

  return { rows: rows as unknown as OrderLogRow[], total };
}

export async function findOrderLogById(id: string) {
  return prisma.orderLog.findUnique({ where: { id } }) as Promise<OrderLogRow | null>;
}

export async function listPaymentLogs(
  filter: DateRangeFilter & { payment_id?: string; order_id?: string; user_id?: string; status?: string },
): Promise<{ rows: PaymentLogRow[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filter.payment_id) where.payment_id = filter.payment_id;
  if (filter.order_id) where.order_id = filter.order_id;
  if (filter.user_id) where.user_id = filter.user_id;
  if (filter.status) where.status = filter.status;
  Object.assign(where, toDateRange(filter));

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const [rows, total] = await Promise.all([
    prisma.paymentLog.findMany({ where, orderBy: { occurred_at: "desc" }, skip, take }),
    prisma.paymentLog.count({ where }),
  ]);

  return { rows: rows as unknown as PaymentLogRow[], total };
}

export async function findPaymentLogById(id: string) {
  return prisma.paymentLog.findUnique({ where: { id } }) as Promise<PaymentLogRow | null>;
}
