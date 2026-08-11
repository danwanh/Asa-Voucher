import { prisma } from "../config/prisma.js";

export interface PaidOrderRow {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface PartnerScopedOrderItemRow {
  order_id: string;
  subtotal: number;
  created_at: string;
  orders: { status: string; created_at: string } | null;
  voucher_products: { partner_id: string } | null;
}

function dateRangeFilter(column: string, dateFrom?: string, dateTo?: string) {
  const range: Record<string, Date> = {};
  if (dateFrom) range.gte = new Date(dateFrom);
  if (dateTo) range.lte = new Date(dateTo);
  return Object.keys(range).length ? { [column]: range } : {};
}

/** Toàn bộ đơn đã thanh toán thành công trong khoảng thời gian (dùng khi không lọc theo partner). */
export async function listPaidOrders(dateFrom?: string, dateTo?: string): Promise<PaidOrderRow[]> {
  return prisma.order.findMany({
    where: { status: { in: ["confirmed", "completed"] }, ...dateRangeFilter("created_at", dateFrom, dateTo) },
    select: { id: true, total_amount: true, status: true, created_at: true },
  }) as Promise<PaidOrderRow[]>;
}

/** order_items thuộc voucher của một partner cụ thể, kèm trạng thái đơn hàng, dùng để tính doanh thu/đơn theo partner. */
export async function listOrderItemsForPartner(
  partnerId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<PartnerScopedOrderItemRow[]> {
  return prisma.orderItem.findMany({
    where: {
      voucher_products: { partner_id: partnerId },
      orders: { ...dateRangeFilter("created_at", dateFrom, dateTo) },
    },
    select: {
      order_id: true,
      subtotal: true,
      created_at: true,
      orders: { select: { status: true, created_at: true } },
      voucher_products: { select: { partner_id: true } },
    },
  }) as Promise<PartnerScopedOrderItemRow[]>;
}

/** Toàn bộ đơn hàng (mọi trạng thái thanh toán) trong khoảng thời gian, dùng cho thống kê đơn hàng. */
export async function listAllOrders(dateFrom?: string, dateTo?: string): Promise<PaidOrderRow[]> {
  return prisma.order.findMany({
    where: dateRangeFilter("created_at", dateFrom, dateTo),
    select: { id: true, total_amount: true, status: true, created_at: true },
  }) as Promise<PaidOrderRow[]>;
}

/** order_items thuộc voucher của một partner, dùng cho thống kê đơn hàng theo partner. */
export async function listAllOrderItemsForPartner(
  partnerId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<PartnerScopedOrderItemRow[]> {
  return prisma.orderItem.findMany({
    where: {
      voucher_products: { partner_id: partnerId },
      orders: { ...dateRangeFilter("created_at", dateFrom, dateTo) },
    },
    select: {
      order_id: true,
      subtotal: true,
      created_at: true,
      orders: { select: { status: true, created_at: true } },
      voucher_products: { select: { partner_id: true } },
    },
  }) as Promise<PartnerScopedOrderItemRow[]>;
}

export interface VoucherProductStatsRow {
  id: string;
  name: string;
  partner_id: string;
  total_quantity: number;
  remaining_quantity: number;
}

export async function listVoucherProductStats(partnerId?: string): Promise<VoucherProductStatsRow[]> {
  return prisma.voucherProduct.findMany({
    where: {
      approval_status: "approved",
      ...(partnerId ? { partner_id: partnerId } : {}),
    },
    select: { id: true, name: true, partner_id: true, total_quantity: true, remaining_quantity: true },
  }) as Promise<VoucherProductStatsRow[]>;
}

export async function countUsedIssuedVouchersByProduct(
  voucherProductIds: string[],
): Promise<Record<string, number>> {
  if (voucherProductIds.length === 0) return {};

  const rows = await prisma.issuedVoucher.groupBy({
    by: ["voucher_product_id"],
    where: { status: "used", voucher_product_id: { in: voucherProductIds } },
    _count: true,
  });

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.voucher_product_id] = row._count;
  }
  return counts;
}

export interface PartnerRow {
  id: string;
  business_name: string;
}

export async function listPartners(): Promise<PartnerRow[]> {
  return prisma.partner.findMany({
    select: { id: true, business_name: true },
  }) as Promise<PartnerRow[]>;
}

export async function countVoucherProductsByPartner(): Promise<Record<string, number>> {
  const rows = await prisma.voucherProduct.groupBy({
    by: ["partner_id"],
  });

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.partner_id] = row._count;
  }
  return counts;
}
