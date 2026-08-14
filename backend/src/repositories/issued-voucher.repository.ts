import { prisma } from "../config/prisma.js";
import type {
  IssuedVoucherListFilter,
  IssuedVoucherRow,
  IssuedVoucherStatus,
} from "../types/issued-voucher.types.js";

function detailInclude(feedbackUserId?: string) {
  return {
  voucher_products: { select: { id: true, name: true, partner_id: true, thumbnail_url: true, partners: { select: { business_name: true } } } },
  order_items: {
    select: {
      id: true,
      order_id: true,
      quantity: true,
      unit_price: true,
      subtotal: true,
      orders: {
        select: {
          id: true,
          order_code: true,
          user_id: true,
          recipient_id: true,
          total_amount: true,
          payment_method: true,
          status: true,
          is_gift: true,
          created_at: true,
          users: { select: { full_name: true } },
        },
      },
    },
  },
    reviews: {
      ...(feedbackUserId ? { where: { user_id: feedbackUserId } } : {}),
      select: { id: true, rating: true, comment: true, media_urls: true, created_at: true, updated_at: true },
    },
    complaints: {
      ...(feedbackUserId ? { where: { user_id: feedbackUserId } } : {}),
      select: { id: true, reason: true, description: true, evidence_urls: true, status: true, resolution_note: true, resolution_types: true, created_at: true, resolved_at: true },
    },
  } as const;
}

function listInclude(feedbackUserId?: string) {
  return {
    voucher_products: { select: { id: true, name: true, partner_id: true, partners: { select: { business_name: true } } } },
    order_items: {
      select: {
        id: true,
        order_id: true,
        quantity: true,
        unit_price: true,
        subtotal: true,
        orders: { select: { id: true, user_id: true, recipient_id: true, total_amount: true, payment_method: true, status: true, is_gift: true, created_at: true, users: { select: { full_name: true } } } },
      },
    },
    reviews: {
      ...(feedbackUserId ? { where: { user_id: feedbackUserId } } : {}),
      select: { id: true, rating: true, comment: true, media_urls: true, created_at: true },
    },
    complaints: {
      ...(feedbackUserId ? { where: { user_id: feedbackUserId } } : {}),
      select: { id: true, reason: true, description: true, evidence_urls: true, status: true, resolution_note: true, resolution_types: true, created_at: true, resolved_at: true },
    },
  } as const;
}

type IssuedVoucherWithRelations = IssuedVoucherRow & {
  voucher_products: { partner_id: string };
  order_items: { order_id: string; orders?: { user_id: string; status: string } | null };
};

export async function listIssuedVouchers(
  filter: IssuedVoucherListFilter,
): Promise<{ rows: IssuedVoucherRow[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filter.ownerId) where.owner_id = filter.ownerId;
  if (filter.partnerId) where.voucher_products = { partner_id: filter.partnerId };
  if (filter.status) where.status = filter.status;

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const [rows, total] = await Promise.all([
    prisma.issuedVoucher.findMany({ where, include: listInclude(filter.feedbackUserId), orderBy: { created_at: "desc" }, skip, take }),
    prisma.issuedVoucher.count({ where }),
  ]);

  return { rows: rows as unknown as IssuedVoucherRow[], total };
}

export async function findIssuedVoucherById(id: string, feedbackUserId?: string) {
  return prisma.issuedVoucher.findUnique({ where: { id }, include: detailInclude(feedbackUserId) }) as unknown as Promise<IssuedVoucherWithRelations | null>;
}

export async function findIssuedVoucherByCode(voucherCode: string) {
  return prisma.issuedVoucher.findUnique({ where: { voucher_code: voucherCode }, include: detailInclude() }) as unknown as Promise<IssuedVoucherWithRelations | null>;
}

export async function findIssuedVoucherByQrPayload(qrCodePayload: string) {
  return prisma.issuedVoucher.findUnique({ where: { qr_code_payload: qrCodePayload }, include: detailInclude() }) as unknown as Promise<IssuedVoucherWithRelations | null>;
}

export async function updateIssuedVoucherStatus(id: string, status: IssuedVoucherStatus) {
  return prisma.issuedVoucher.update({
    where: { id },
    data: { status, updated_at: new Date() },
  }) as unknown as Promise<IssuedVoucherRow>;
}

export async function findEligibleBranchIds(voucherProductId: string): Promise<string[]> {
  const rows = await prisma.voucherProductBranch.findMany({
    where: { voucher_product_id: voucherProductId },
    select: { branch_id: true },
  });
  return rows.map((r: { branch_id: string }) => r.branch_id);
}
