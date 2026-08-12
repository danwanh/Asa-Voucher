import { HttpError } from "../utils/http-error.js";
import * as reportRepo from "../repositories/report.repository.js";
import { isAdminRole, type AuthUser } from "../types/auth.types.js";
import type {
  OrderStatusBreakdown,
  PartnerReportItem,
  RevenuePoint,
  VoucherReportItem,
} from "../types/report.types.js";
import type { ReportQuery } from "../validations/report.validation.js";
import type { StaffVoucherReportItem } from "../types/report.types.js";

function isPartnerOwnerLike(role: AuthUser["role"]) {
  return role === "partner_owner" || role === "partner_voucher_staff";
}

/** Xác định phạm vi partner được phép xem; admin có thể xem toàn hệ thống hoặc lọc theo partner_id truyền vào. */
function resolvePartnerScope(user: AuthUser, query: ReportQuery): string | undefined {
  if (isPartnerOwnerLike(user.role)) {
    if (!user.partnerId) throw new HttpError(403, "Tài khoản chưa gắn với đối tác nào");
    return user.partnerId;
  }
  if (isAdminRole(user.role)) return query.partner_id;
  throw new HttpError(403, "Bạn không có quyền xem báo cáo");
}

function toDateKey(value: Date | string): string {
  if (value instanceof Date) {
    // Keep UTC day stable regardless of local server timezone.
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

export async function getRevenueReport(user: AuthUser, query: ReportQuery): Promise<RevenuePoint[]> {
  const partnerId = resolvePartnerScope(user, query);
  const buckets = new Map<string, { revenue: number; orderIds: Set<string> }>();

  if (partnerId) {
    const items = await reportRepo.listOrderItemsForPartner(partnerId, query.date_from, query.date_to);
    for (const item of items) {
      if (!item.orders || !["confirmed", "completed"].includes(item.orders.status)) continue;
      const key = toDateKey(item.orders.created_at);
      const bucket = buckets.get(key) ?? { revenue: 0, orderIds: new Set<string>() };
      bucket.revenue += Number(item.subtotal);
      bucket.orderIds.add(item.order_id);
      buckets.set(key, bucket);
    }
  } else {
    const orders = await reportRepo.listPaidOrders(query.date_from, query.date_to);
    for (const order of orders) {
      const key = toDateKey(order.created_at);
      const bucket = buckets.get(key) ?? { revenue: 0, orderIds: new Set<string>() };
      bucket.revenue += Number(order.total_amount);
      bucket.orderIds.add(order.id);
      buckets.set(key, bucket);
    }
  }

  return Array.from(buckets.entries())
    .map(([date, { revenue, orderIds }]) => ({ date, revenue, order_count: orderIds.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getOrderReport(user: AuthUser, query: ReportQuery): Promise<OrderStatusBreakdown[]> {
  const partnerId = resolvePartnerScope(user, query);
  const counts = new Map<string, number>();

  if (partnerId) {
    const items = await reportRepo.listAllOrderItemsForPartner(partnerId, query.date_from, query.date_to);
    const seenOrderIds = new Set<string>();
    for (const item of items) {
      if (!item.orders || seenOrderIds.has(item.order_id)) continue;
      seenOrderIds.add(item.order_id);
      counts.set(item.orders.status, (counts.get(item.orders.status) ?? 0) + 1);
    }
  } else {
    const orders = await reportRepo.listAllOrders(query.date_from, query.date_to);
    for (const order of orders) {
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

export async function getVoucherReport(user: AuthUser, query: ReportQuery): Promise<VoucherReportItem[]> {
  const partnerId = resolvePartnerScope(user, query);
  const products = await reportRepo.listVoucherProductStats(partnerId);
  const usedCounts = await reportRepo.countUsedIssuedVouchersByProduct(products.map((p) => p.id));

  return products.map((product) => ({
    voucher_product_id: product.id,
    name: product.name,
    total_quantity: product.total_quantity,
    remaining_quantity: product.remaining_quantity,
    sold_quantity: product.total_quantity - product.remaining_quantity,
    used_quantity: usedCounts[product.id] ?? 0,
  }));
}

export async function getPartnerReport(user: AuthUser, query: ReportQuery): Promise<PartnerReportItem[]> {
  if (!isAdminRole(user.role)) {
    throw new HttpError(403, "Chỉ quản trị viên được xem báo cáo đối tác");
  }

  const [partners, voucherCounts] = await Promise.all([
    reportRepo.listPartners(),
    reportRepo.countVoucherProductsByPartner(),
  ]);

  const results: PartnerReportItem[] = [];
  for (const partner of partners) {
    const items = await reportRepo.listOrderItemsForPartner(partner.id, query.date_from, query.date_to);
    let revenue = 0;
    const paidOrderIds = new Set<string>();
    for (const item of items) {
      if (!item.orders || !["confirmed", "completed"].includes(item.orders.status)) continue;
      revenue += Number(item.subtotal);
      paidOrderIds.add(item.order_id);
    }

    results.push({
      partner_id: partner.id,
      business_name: partner.business_name,
      voucher_count: voucherCounts[partner.id] ?? 0,
      paid_order_count: paidOrderIds.size,
      revenue,
    });
  }

  return results;
}

// CHO BÁO CÁO HIỆU SUẤT VOUCHER THEO NHÂN VIÊN
// Hàm lấy báo cáo theo nhân viên
export async function getStaffVoucherReport(user: AuthUser, query: ReportQuery,):Promise<StaffVoucherReportItem[]> {
  // Kiểm tra tài khoản có tồn tại
  if (!user.partnerId) {
    throw new HttpError(403, "Tài khoản chưa gắn với đối tác nào");
  }

  // Gọi repositories funcs
  // Lấy danh sách voucher do user tạo
  const products = await reportRepo.listVoucherProductsByCreator(user.id, query.category_id, query.date_from, query.date_to);

  // Extract ra mảng
  const productIds =  products.map(p => p.id);

  // Query 2 cái còn lại
  const [usedCounts, revenueMap] = await Promise.all([reportRepo.countUsedByProducts(productIds), reportRepo.sumRevenueProducts(productIds),]);

  // Dùng vòng lặp cho giá trị
  const reportItems: StaffVoucherReportItem[] = products.map((product) => {
    // Tính số lượng bán
    const soldQuantity = product.total_quantity - product.remaining_quantity;

    // Tính số lượng đã dùng
    const usedQuantity = usedCounts[product.id]??0;

    // Tính doanh thu
    const totalRevenue = Number(revenueMap[product.id])??0;

    // Tính tỉ lệ sử dụng (%)
    const calculatedUsageRate = soldQuantity > 0 ? Math.round((usedQuantity / soldQuantity) * 10000)/100 : 0;

    // Tính điểm hiệu quả
    const calcuatedEffectiveness = Math.round(calculatedUsageRate * totalRevenue / 10000);

    // Trả về đúng cấu trúc
    return {
      voucher_product_id: product.id,
      program_name: product.name,
      category_name: (product as any).category_name?? "",
      total_quantity: product.total_quantity,
      sold_quantity: soldQuantity,
      used_quantity: usedQuantity,
      usage_rate: calculatedUsageRate,
      revenue:totalRevenue,
      effectiveness_score: calcuatedEffectiveness,
    };
  });

  // Trả về kết quả cuối cùng
  return reportItems;
}