import { prisma } from "../config/prisma.js";
import { PaginationParams } from "../utils/pagination.js";
import type {
  IssuedVoucherListFilter,
  IssuedVoucherRow,
  IssuedVoucherStatus,
} from "../types/issued-voucher.types.js";

const INCLUDE = {
  voucher_products: { select: { id: true, name: true, partner_id: true, thumbnail_url: true } },
  order_items: { select: { id: true, order_id: true } },
} as const;

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
    prisma.issuedVoucher.findMany({ where, include: INCLUDE, orderBy: { created_at: "desc" }, skip, take }),
    prisma.issuedVoucher.count({ where }),
  ]);

  return { rows: rows as unknown as IssuedVoucherRow[], total };
}

export async function findIssuedVoucherById(id: string) {
  return prisma.issuedVoucher.findUnique({ where: { id }, include: INCLUDE }) as Promise<(IssuedVoucherRow & { voucher_products: { partner_id: string } }) | null>;
}

export async function findIssuedVoucherByCode(voucherCode: string) {
  return prisma.issuedVoucher.findUnique({ where: { voucher_code: voucherCode }, include: INCLUDE }) as Promise<(IssuedVoucherRow & { voucher_products: { partner_id: string } }) | null>;
}

export async function findIssuedVoucherByQrPayload(qrCodePayload: string) {
  return prisma.issuedVoucher.findUnique({ where: { qr_code_payload: qrCodePayload }, include: INCLUDE }) as Promise<(IssuedVoucherRow & { voucher_products: { partner_id: string } }) | null>;
}

export async function updateIssuedVoucherStatus(id: string, status: IssuedVoucherStatus) {
  return prisma.issuedVoucher.update({
    where: { id },
    data: { status, updated_at: new Date() },
  }) as Promise<IssuedVoucherRow>;
}

export async function findEligibleBranchIds(voucherProductId: string): Promise<string[]> {
  const rows = await prisma.voucherProductBranch.findMany({
    where: { voucher_product_id: voucherProductId },
    select: { branch_id: true },
  });
  return rows.map((r: { branch_id: string }) => r.branch_id);
}
