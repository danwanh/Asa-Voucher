import { prisma } from "../config/prisma.js";
import type { Prisma } from "@prisma/client";

export interface PaidOrderRow {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface PartnerScopedOrderItemRow {
  order_id: string;
  subtotal: number;
  quantity?: number;
  created_at: string;
  orders: { status: string; payment_status?: string; created_at: string } | null;
  voucher_products: { partner_id: string } | null;
}

function dateRangeFilter(column: string, dateFrom?: string, dateTo?: string) {
  const range: Record<string, Date> = {};
  if (dateFrom) range.gte = new Date(`${dateFrom}T00:00:00.000Z`);
  // Bao gồm trọn ngày cuối (đến 23:59:59) thay vì nửa đêm UTC.
  if (dateTo) range.lte = new Date(`${dateTo}T23:59:59.999Z`);
  return Object.keys(range).length ? { [column]: range } : {};
}

type PartnerReportScope = {
  partnerId?: string;
  branchId?: string;
  voucherProductId?: string;
  categoryId?: string;
};

function voucherProductScopeFilter(scope: PartnerReportScope): Prisma.VoucherProductWhereInput {
  return {
    approval_status: "approved",
    ...(scope.partnerId ? { partner_id: scope.partnerId } : {}),
    ...(scope.voucherProductId ? { id: scope.voucherProductId } : {}),
    ...(scope.categoryId ? { category_id: scope.categoryId } : {}),
    ...(scope.branchId ? { voucher_product_branches: { some: { branch_id: scope.branchId } } } : {}),
  };
}

function paidOrderScope(dateFrom?: string, dateTo?: string): Prisma.OrderWhereInput {
  return {
    status: { in: ["confirmed", "completed"] },
    payment_status: "paid",
    ...dateRangeFilter("created_at", dateFrom, dateTo),
  };
}

/** Toàn bộ đơn đã thanh toán thành công trong khoảng thời gian (dùng khi không lọc theo partner). */
export async function listPaidOrders(dateFrom?: string, dateTo?: string): Promise<PaidOrderRow[]> {
  return prisma.order.findMany({
    where: paidOrderScope(dateFrom, dateTo),
    select: { id: true, total_amount: true, status: true, created_at: true },
  }) as unknown as Promise<PaidOrderRow[]>;
}

/** order_items thuộc voucher của một partner cụ thể, kèm trạng thái đơn hàng, dùng để tính doanh thu/đơn theo partner. */
export async function listOrderItemsForPartner(
  partnerId: string,
  dateFrom?: string,
  dateTo?: string,
  branchId?: string,
  voucherProductId?: string,
): Promise<PartnerScopedOrderItemRow[]> {
  return prisma.orderItem.findMany({
    where: {
      ...(voucherProductId ? { voucher_product_id: voucherProductId } : {}),
      voucher_products: voucherProductScopeFilter({ partnerId, branchId, voucherProductId }),
      orders: paidOrderScope(dateFrom, dateTo),
    },
    select: {
      order_id: true,
      subtotal: true,
      quantity: true,
      created_at: true,
      orders: { select: { status: true, payment_status: true, created_at: true } },
      voucher_products: { select: { partner_id: true } },
    },
  }) as unknown as Promise<PartnerScopedOrderItemRow[]>;
}

/** Toàn bộ đơn hàng (mọi trạng thái thanh toán) trong khoảng thời gian, dùng cho thống kê đơn hàng. */
export async function listAllOrders(dateFrom?: string, dateTo?: string): Promise<PaidOrderRow[]> {
  return prisma.order.findMany({
    where: dateRangeFilter("created_at", dateFrom, dateTo),
    select: { id: true, total_amount: true, status: true, created_at: true },
  }) as unknown as Promise<PaidOrderRow[]>;
}

/** order_items thuộc voucher của một partner, dùng cho thống kê đơn hàng theo partner. */
export async function listAllOrderItemsForPartner(
  partnerId: string,
  dateFrom?: string,
  dateTo?: string,
  branchId?: string,
  voucherProductId?: string,
): Promise<PartnerScopedOrderItemRow[]> {
  return prisma.orderItem.findMany({
    where: {
      ...(voucherProductId ? { voucher_product_id: voucherProductId } : {}),
      voucher_products: voucherProductScopeFilter({ partnerId, branchId, voucherProductId }),
      orders: { ...dateRangeFilter("created_at", dateFrom, dateTo) },
    },
    select: {
      order_id: true,
      subtotal: true,
      quantity: true,
      created_at: true,
      orders: { select: { status: true, payment_status: true, created_at: true } },
      voucher_products: { select: { partner_id: true } },
    },
  }) as unknown as Promise<PartnerScopedOrderItemRow[]>;
}

export interface VoucherProductStatsRow {
  id: string;
  name: string;
  partner_id: string;
  total_quantity: number;
  remaining_quantity: number;
  selling_price: number;
  status: string;
  sale_start_date: Date;
  sale_end_date: Date;
}

export async function listVoucherProductStats(
  partnerId?: string,
  branchId?: string,
  voucherProductId?: string,
): Promise<VoucherProductStatsRow[]> {
  return prisma.voucherProduct.findMany({
    where: voucherProductScopeFilter({ partnerId, branchId, voucherProductId }),
    select: {
      id: true,
      name: true,
      partner_id: true,
      total_quantity: true,
      remaining_quantity: true,
      selling_price: true,
      status: true,
      sale_start_date: true,
      sale_end_date: true,
    },
  }) as unknown as Promise<VoucherProductStatsRow[]>;
}

export async function countUsedIssuedVouchersByProduct(
  voucherProductIds: string[],
  dateFrom?: string,
  dateTo?: string,
  branchId?: string,
): Promise<Record<string, number>> {
  if (voucherProductIds.length === 0) return {};
  const usageFilter = {
    ...(branchId ? { branch_id: branchId } : {}),
    ...dateRangeFilter("used_at", dateFrom, dateTo),
  };

  const rows = await prisma.issuedVoucher.groupBy({
    by: ["voucher_product_id"],
    where: {
      status: "used",
      is_test: false,
      voucher_product_id: { in: voucherProductIds },
      ...(Object.keys(usageFilter).length ? usageFilter : {}),
    },
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
  }) as unknown as Promise<PartnerRow[]>;
}

export async function countVoucherProductsByPartner(): Promise<Record<string, number>> {
  const rows = await prisma.voucherProduct.groupBy({
    by: ["partner_id"],
    _count: true,
  });

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.partner_id] = row._count;
  }
  return counts;
}

export interface VoucherProductWithCategory {
  id: string;
  name: string;
  partner_id: string;
  total_quantity: number;
  remaining_quantity: number;
  category_name: string;
  created_at: Date;
}

// Lấy danh sách voucher products đã duyệt của partner
// Có lọc bổ sung: category_id (không lọc theo ngày tạo sản phẩm;
// khoảng thời gian được áp dụng cho issued_date/order trong các hàm thống kê)
export async function listVoucherProductsByPartner(
  partnerId: string,
  categoryId?: string,
  staffUserId?: string,
): Promise<VoucherProductWithCategory[]> {
  // Build điều kiện filter lọc theo đối tác và trạng thái đã duyệt
  const items = await prisma.voucherProduct.findMany({
    where: {
      partner_id: partnerId,
      approval_status: "approved",
      ...(categoryId ? {category_id: categoryId}: {}),
      ...(staffUserId ? { OR: [{ created_by: staffUserId }, { submitted_by: staffUserId }] } : {}),
    },
    select: {
      id: true,
      name: true,
      partner_id: true,
      total_quantity: true,
      remaining_quantity: true,
      created_at: true,
      categories: {
        select: {
          name: true
        },
      },
    },
  });

  // Map kết quả trả về theo VoucherProductWithCategory
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    partner_id: item.partner_id,
    total_quantity: item.total_quantity,
    remaining_quantity: item.remaining_quantity,
    created_at: item.created_at,
    category_name: item.categories?.name ?? "",
  }));
}

// Đếm số lượng vouchers phát hành (tổng) và đã dùng theo từng voucher_product_id,
// trong khoảng thời gian phát hành (issued_date).
export async function countIssuedVouchersByProduct(
  voucherProductIds: string[],
  dateFrom?: string,
  dateTo?: string,
): Promise<Record<string, { total: number; used: number; expired: number }>> {
  // Kiểm tra nếu không có nhập mã voucher id
  if (!voucherProductIds || voucherProductIds.length === 0) {
    return {};
  }

  // Nhóm theo voucher_product_id và status trong khoảng issued_date
  const group = await prisma.issuedVoucher.groupBy({
    by: ["voucher_product_id", "status"],
    where: {
      is_test: false,
      voucher_product_id: { in: voucherProductIds },
      ...dateRangeFilter("issued_date", dateFrom, dateTo),
    },
    _count: true,
  });

  // Tổng hợp: total = mọi status, used = status "used"
  const counts: Record<string, { total: number; used: number; expired: number }> = {};
  for (const row of group) {
    const entry = counts[row.voucher_product_id] ?? { total: 0, used: 0, expired: 0 };
    entry.total += row._count;
    if (row.status === "used") entry.used += row._count;
    if (row.status === "expired") entry.expired += row._count;
    counts[row.voucher_product_id] = entry;
  }

  return counts;
}

export async function countPaidIssuedVouchersByProduct(
  voucherProductIds: string[],
  dateFrom?: string,
  dateTo?: string,
): Promise<Record<string, { total: number; expired: number }>> {
  if (!voucherProductIds || voucherProductIds.length === 0) {
    return {};
  }

  const group = await prisma.issuedVoucher.groupBy({
    by: ["voucher_product_id", "status"],
    where: {
      is_test: false,
      voucher_product_id: { in: voucherProductIds },
      order_items: {
        orders: paidOrderScope(dateFrom, dateTo),
      },
    },
    _count: true,
  });

  const counts: Record<string, { total: number; expired: number }> = {};
  for (const row of group) {
    const entry = counts[row.voucher_product_id] ?? { total: 0, expired: 0 };
    entry.total += row._count;
    if (row.status === "expired") entry.expired += row._count;
    counts[row.voucher_product_id] = entry;
  }

  return counts;
}

export async function sumPaidSoldQuantityByProduct(
  voucherProductIds: string[],
  dateFrom?: string,
  dateTo?: string,
): Promise<Record<string, number>> {
  if (!voucherProductIds || voucherProductIds.length === 0) {
    return {};
  }

  const group = await prisma.orderItem.groupBy({
    by: ["voucher_product_id"],
    where: {
      voucher_product_id: { in: voucherProductIds },
      orders: paidOrderScope(dateFrom, dateTo),
    },
    _sum: {
      quantity: true,
    },
  });

  const quantityMap: Record<string, number> = {};
  for (const row of group) {
    quantityMap[row.voucher_product_id] = Number(row._sum.quantity ?? 0);
  }
  return quantityMap;
}

// Tính tổng doanh thu theo voucher_product_id
// Chỉ tính order_item thuộc đơn có status 'confirmed' | 'completed'
// và đơn được tạo trong khoảng thời gian chỉ định.
export async function sumRevenueProducts(voucherProductIds: string[], dateFrom?: string, dateTo?: string): Promise<Record<string, number>> {
  // Kiểm tra nếu không có voucher nào thỏa để tính
  if (!voucherProductIds || voucherProductIds.length === 0) {
    return {};
  }

  // Nếu có tồn tại
  const group = await prisma.orderItem.groupBy({
    by: ["voucher_product_id"],
    where: {
      voucher_product_id: { in: voucherProductIds},
      orders: {
        ...paidOrderScope(dateFrom, dateTo),
      },
    },
    _sum: {
      subtotal: true,
    },
  });

  // Map lại và xuất ra kết quả
  const revenueMap: Record<string, number> = {};
  for (const row of group) {
    revenueMap[row.voucher_product_id] = Number(row._sum.subtotal ?? 0);
  }
  return revenueMap;
}
