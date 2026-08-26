import { prisma } from "../config/prisma.js";
import type { VoucherUsageListFilter, VoucherUsageRow } from "../types/issued-voucher.types.js";

export async function createVoucherUsage(input: {
  issued_voucher_id: string;
  branch_id: string;
  redeemed_by: string;
  note?: string;
}): Promise<VoucherUsageRow> {
  const updated = await prisma.issuedVoucher.update({
    where: { id: input.issued_voucher_id },
    data: {
      status: "used",
      used_at: new Date(),
      branch_id: input.branch_id,
      redeemed_by: input.redeemed_by,
      note: input.note,
    },
    include: {
      owners: { select: { full_name: true } },
      voucher_products: { select: { name: true } },
      partner_branches: { select: { branch_name: true } },
      redeemer: { select: { full_name: true } },
    },
  });
  return updated as unknown as VoucherUsageRow;
}

export async function listUsagesByIssuedVoucher(issuedVoucherId: string): Promise<VoucherUsageRow[]> {
  const rows = await prisma.issuedVoucher.findMany({
    where: { id: issuedVoucherId, status: "used" },
    orderBy: { used_at: "desc" },
    include: {
      owners: { select: { full_name: true } },
      voucher_products: { select: { name: true } },
      partner_branches: { select: { branch_name: true } },
      redeemer: { select: { full_name: true } },
    },
  });
  return rows as unknown as VoucherUsageRow[];
}

export async function listUsages(
  filter: VoucherUsageListFilter,
): Promise<{ rows: VoucherUsageRow[]; total: number }> {
  const where: Record<string, unknown> = { status: "used" };
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
        owners: { select: { full_name: true } },
        voucher_products: { select: { name: true } },
        partner_branches: { select: { branch_name: true } },
        redeemer: { select: { full_name: true } },
      },
    }),
    prisma.issuedVoucher.count({ where }),
  ]);

  return { rows: rows as unknown as VoucherUsageRow[], total };
}
