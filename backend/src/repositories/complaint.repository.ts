import { prisma } from "../config/prisma.js";
import type { ComplaintListFilter, ComplaintRow } from "../types/complaint.types.js";
import type { CreateComplaintInput } from "../validations/complaint.validation.js";

const INCLUDE = {
  users: { select: { id: true, full_name: true, email: true } },
  issued_vouchers: {
    select: {
      id: true,
      voucher_product_id: true,
      voucher_products: { select: { id: true, name: true, partner_id: true } },
    },
  },
  orders: {
    select: {
      id: true,
      user_id: true,
      order_code: true,
      total_amount: true,
      status: true,
      payments: {
        select: {
          id: true,
          method: true,
          amount: true,
          status: true,
          transaction_ref: true,
          refund_ref: true,
          refunded_at: true,
        },
      },
    },
  },
} as const;

export async function listComplaints(
  filter: ComplaintListFilter,
): Promise<{ rows: ComplaintRow[]; total: number; countsByStatus: Record<string, number> }> {
  const where: Record<string, unknown> = {};

  if (filter.userId) {
    where.user_id = filter.userId;
  }

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.partnerId) {
    where.issued_vouchers = { voucher_products: { partner_id: filter.partnerId } };
  }

  if (filter.orderId) {
    where.order_id = filter.orderId;
  }

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const countsWhere: Record<string, unknown> = {};
  if (filter.userId) countsWhere.user_id = filter.userId;
  if (filter.partnerId) countsWhere.issued_vouchers = { voucher_products: { partner_id: filter.partnerId } };

  const [rows, total, groupedCounts] = await Promise.all([
    prisma.complaint.findMany({ where, include: INCLUDE, orderBy: { created_at: "desc" }, skip, take }),
    prisma.complaint.count({ where }),
    prisma.complaint.groupBy({ by: ["status"], where: countsWhere, _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = { all: total };
  for (const row of groupedCounts) {
    counts[row.status] = row._count._all;
  }

  return { rows: rows as unknown as ComplaintRow[], total, countsByStatus: counts };
}

export async function findComplaintById(id: string) {
  return prisma.complaint.findUnique({
    where: { id },
    include: {
      ...INCLUDE,
      complaint_responses: {
        include: { responder: { select: { id: true, full_name: true, email: true } } },
        orderBy: { created_at: "asc" },
      },
    },
  }) as unknown as Promise<
    | (ComplaintRow & {
        issued_vouchers: { voucher_products: { partner_id: string } } | null;
        orders: { user_id: string } | null;
        complaint_responses?: unknown[];
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
  }) as unknown as Promise<ComplaintRow>;
}

export async function findOrderOwner(orderId: string): Promise<{ id: string; user_id: string; recipient_id: string; status: string; is_gift: boolean } | null> {
  return prisma.order.findUnique({ where: { id: orderId }, select: { id: true, user_id: true, recipient_id: true, status: true, is_gift: true } }) as unknown as Promise<{ id: string; user_id: string; recipient_id: string; status: string; is_gift: boolean } | null>;
}

export async function findComplaintByIssuedVoucherId(userId: string, issuedVoucherId: string) {
  return prisma.complaint.findUnique({
    where: { user_id_issued_voucher_id: { user_id: userId, issued_voucher_id: issuedVoucherId } },
    select: { id: true },
  });
}

export async function findOrderLevelComplaint(userId: string, orderId: string) {
  return prisma.complaint.findFirst({
    where: { user_id: userId, order_id: orderId, issued_voucher_id: null },
    select: { id: true },
  });
}

export async function updateComplaint(id: string, patch: Record<string, unknown>) {
  return prisma.complaint.update({ where: { id }, data: patch }) as unknown as Promise<ComplaintRow>;
}


