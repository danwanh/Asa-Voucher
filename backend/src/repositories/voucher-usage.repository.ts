import { prisma } from "../config/prisma.js";
import type { VoucherUsageListFilter, VoucherUsageRow } from "../types/issued-voucher.types.js";

export async function createVoucherUsage(input: {
  issued_voucher_id: string;
  branch_id: string;
  redeemed_by: string;
  redemption_code?: string;
  note?: string;
}): Promise<VoucherUsageRow> {
  return prisma.voucherUsage.create({
    data: { ...input, used_at: new Date() },
  }) as unknown as Promise<VoucherUsageRow>;
}

export async function listUsagesByIssuedVoucher(issuedVoucherId: string): Promise<VoucherUsageRow[]> {
  return prisma.voucherUsage.findMany({
    where: { issued_voucher_id: issuedVoucherId },
    orderBy: { used_at: "desc" },
  }) as unknown as Promise<VoucherUsageRow[]>;
}

export async function listUsages(
  filter: VoucherUsageListFilter,
): Promise<{ rows: VoucherUsageRow[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filter.partnerId) where.issued_vouchers = { voucher_products: { partner_id: filter.partnerId } };
  if (filter.branchId) where.branch_id = filter.branchId;
  if (filter.issuedVoucherId) where.issued_voucher_id = filter.issuedVoucherId;

  const skip = (filter.page - 1) * filter.limit;
  const take = filter.limit;

  const [rows, total] = await Promise.all([
    prisma.voucherUsage.findMany({
      where,
      orderBy: { used_at: "desc" },
      skip,
      take,
      include: {
        issued_vouchers: {
          select: {
            id: true,
            voucher_code: true,
            owners: { select: { full_name: true } },
            voucher_products: { select: { name: true } },
          },
        },
        redeemer: { select: { full_name: true } },
        partner_branches: { select: { branch_name: true } },
      },
    }),
    prisma.voucherUsage.count({ where }),
  ]);

  return { rows: rows as unknown as VoucherUsageRow[], total };
}
