import { prisma } from "../config/prisma.js";
import { PaginationParams } from "../utils/pagination.js";
import type { SecurityAlertRow } from "../types/security.types.js";

interface SecurityAlertFilter extends PaginationParams {
  status?: string;
  alert_type?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

const INCLUDE = {
  user: { select: { id: true, full_name: true, email: true } },
} as const;

export async function listSecurityAlerts(
  filter: SecurityAlertFilter,
): Promise<{ rows: SecurityAlertRow[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filter.status) where.status = filter.status;
  if (filter.alert_type) where.alert_type = filter.alert_type;
  if (filter.user_id) where.user_id = filter.user_id;
  if (filter.date_from || filter.date_to) {
    const range: Record<string, Date> = {};
    if (filter.date_from) range.gte = new Date(filter.date_from);
    if (filter.date_to) range.lte = new Date(filter.date_to);
    where.created_at = range;
  }

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const [rows, total] = await Promise.all([
    prisma.securityAlert.findMany({ where, include: INCLUDE, orderBy: { created_at: "desc" }, skip, take }),
    prisma.securityAlert.count({ where }),
  ]);

  return { rows: rows as unknown as SecurityAlertRow[], total };
}

export async function findSecurityAlertById(id: string) {
  return prisma.securityAlert.findUnique({ where: { id }, include: INCLUDE }) as Promise<SecurityAlertRow | null>;
}

export async function createSecurityAlert(data: {
  user_id: string;
  alert_type: string;
  detail?: string;
  ip_address?: string;
}) {
  return prisma.securityAlert.create({
    data: {
      user_id: data.user_id,
      alert_type: data.alert_type,
      detail: data.detail ?? null,
      ip_address: data.ip_address ?? null,
      status: "open",
    },
  }) as Promise<SecurityAlertRow>;
}

export async function updateSecurityAlert(id: string, patch: Record<string, unknown>) {
  return prisma.securityAlert.update({ where: { id }, data: patch }) as Promise<SecurityAlertRow>;
}

export async function countByStatus(): Promise<{ status: string; count: number }[]> {
  const rows = await prisma.securityAlert.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count.id }));
}
