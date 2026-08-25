import { prisma } from "../config/prisma.js";
import type { VoucherUsageListFilter, VoucherUsageRow } from "../types/issued-voucher.types.js";

function toUsageRow(row: Record<string, unknown>): VoucherUsageRow {
  return {
    id: row.id,
    issued_voucher_id: row.id,
    branch_id: row.branch_id,
    redeemed_by: row.redeemed_by,
    used_at: row.used_at,
    note: row.note,
    issued_vouchers: row,
    redeemer: row.redeemer,
    partner_branches: row.partner_branches,
  } as unknown as VoucherUsageRow;
}

export async function listUsagesByIssuedVoucher(issuedVoucherId: string): Promise<VoucherUsageRow[]> {
  const rows = await prisma.issuedVoucher.findMany({
    where: { id: issuedVoucherId, used_at: { not: null } },
    orderBy: { used_at: "desc" },
    include: { redeemer: true, partner_branches: true, voucher_products: true, owners: true },
  });
  return rows.map((row) => toUsageRow(row as unknown as Record<string, unknown>));
}

export async function listUsages(
  filter: VoucherUsageListFilter,
): Promise<{ rows: VoucherUsageRow[]; total: number }> {
  const where: Record<string, unknown> = { used_at: { not: null } };
  if (filter.partnerId) where.voucher_products = { partner_id: filter.partnerId };
  if (filter.branchId) where.branch_id = filter.branchId;
  if (filter.issuedVoucherId) where.id = filter.issuedVoucherId;

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const [rows, total] = await Promise.all([
    prisma.issuedVoucher.findMany({
      where,
      orderBy: { used_at: "desc" },
      skip,
      take,
      include: {
        voucher_products: { select: { name: true } },
        owners: { select: { full_name: true } },
        redeemer: { select: { full_name: true } },
        partner_branches: { select: { branch_name: true } },
      },
    }),
    prisma.issuedVoucher.count({ where }),
  ]);

  return { rows: rows.map((row) => toUsageRow(row as unknown as Record<string, unknown>)), total };
}
