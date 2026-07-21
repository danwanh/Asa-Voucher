import { prisma } from "../config/prisma.js";
import type { ComplaintListFilter, ComplaintRow } from "../types/complaint.types.js";
import type { CreateComplaintInput } from "../validations/complaint.validation.js";

const INCLUDE = {
  issued_vouchers: {
    select: {
      id: true,
      voucher_product_id: true,
      voucher_products: { select: { partner_id: true } },
    },
  },
  orders: { select: { id: true, user_id: true } },
} as const;

export async function listComplaints(
  filter: ComplaintListFilter,
): Promise<{ rows: ComplaintRow[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filter.userId) where.user_id = filter.userId;
  if (filter.status) where.status = filter.status;
  if (filter.partnerId) {
    where.issued_vouchers = { voucher_products: { partner_id: filter.partnerId } };
  }

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const [rows, total] = await Promise.all([
    prisma.complaint.findMany({ where, include: INCLUDE, orderBy: { created_at: "desc" }, skip, take }),
    prisma.complaint.count({ where }),
  ]);

  return { rows: rows as unknown as ComplaintRow[], total };
}

export async function findComplaintById(id: string) {
  return prisma.complaint.findUnique({ where: { id }, include: INCLUDE }) as Promise<
    | (ComplaintRow & {
        issued_vouchers: { voucher_products: { partner_id: string } } | null;
        orders: { user_id: string } | null;
      })
    | null
  >;
}

export async function createComplaint(userId: string, input: CreateComplaintInput) {
  return prisma.complaint.create({
    data: {
      order_id: input.order_id ?? null,
      issued_voucher_id: input.issued_voucher_id ?? null,
      user_id: userId,
      reason: input.reason,
      description: input.description,
      evidence_urls: input.evidence_urls ?? undefined,
      status: "open",
    },
  }) as Promise<ComplaintRow>;
}

export async function findOrderOwner(orderId: string): Promise<{ id: string; user_id: string } | null> {
  return prisma.order.findUnique({ where: { id: orderId }, select: { id: true, user_id: true } });
}

export async function updateComplaint(id: string, patch: Record<string, unknown>) {
  return prisma.complaint.update({ where: { id }, data: patch }) as Promise<ComplaintRow>;
}
