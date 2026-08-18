import { prisma } from "../config/prisma.js"
import { HttpError } from "../utils/http-error.js"
import type { AuthUser } from "../types/auth.types.js"

interface DashboardFilter {
  from?: Date
  to?: Date
}

function toMonthKey(date: Date): string {
  return date.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" })
}

export const getDashboardStats = async ({
  from,
  to,
}: DashboardFilter = {}) => {
  const toForFilter = to ? endOfUtcDay(to) : undefined
  const createdAtFilter =
    from || to
      ? {
          created_at: {
            ...(from ? { gte: from } : {}),
            ...(toForFilter ? { lte: toForFilter } : {}),
          },
        }
      : {}

  const now = new Date()
  const monthsBack = 6
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)

  const chartFrom = from && new Date(from) > startDate ? new Date(from) : startDate
  const chartTo = toForFilter ?? now

  const [users, partners, orders, revenue, paidPayments, recentPartners, recentOrdersRaw] = await Promise.all([
    prisma.user.count({ where: { role: "buyer", ...createdAtFilter } }),
    prisma.partner.count({ where: { approval_status: "approved", status: "active", ...createdAtFilter } }),
    prisma.order.count({ where: createdAtFilter }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "success",
        ...(from || to
          ? { paid_at: { ...(from ? { gte: from } : {}), ...(toForFilter ? { lte: toForFilter } : {}) } }
          : {}),
      },
    }),
    prisma.payment.findMany({
      where: { status: "success", paid_at: { gte: chartFrom, lte: chartTo } },
      select: { paid_at: true, amount: true },
    }),
    prisma.partner.findMany({
      where: { created_at: { gte: startDate, ...(createdAtFilter.created_at ?? {}) } },
      select: { created_at: true },
    }),
    prisma.order.findMany({
      where: createdAtFilter,
      orderBy: { created_at: "desc" },
      take: 5,
      include: {
        order_items: {
          include: {
            voucher_products: {
              select: { name: true, partners: { select: { business_name: true } } },
            },
          },
        },
      },
    }),
  ])

  const monthLabels = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1 + i, 1)
    return toMonthKey(d)
  })

  const revenueMap = new Map<string, number>()
  for (const p of paidPayments) {
    if (!p.paid_at) continue
    const key = toMonthKey(new Date(p.paid_at))
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + Number(p.amount))
  }

  const revenueByMonth = monthLabels.map((month) => ({
    month,
    revenue: Math.round((revenueMap.get(month) ?? 0) / 1_000_000),
  }))

  const partnerMap = new Map<string, number>()
  for (const p of recentPartners) {
    const key = toMonthKey(new Date(p.created_at))
    partnerMap.set(key, (partnerMap.get(key) ?? 0) + 1)
  }

  const partnersByMonth = monthLabels.map((month) => ({
    month,
    new: partnerMap.get(month) ?? 0,
  }))

  const recentOrders = recentOrdersRaw.map((order) => {
    const itemNames = order.order_items
      .map((item) => item.voucher_products?.name ?? "Voucher")
      .filter(Boolean)

    const partnerNames = order.order_items
      .map((item) => item.voucher_products?.partners?.business_name)
      .filter(Boolean)

    const uniquePartners = [...new Set(partnerNames)]

    const voucherTitle =
      itemNames.length === 0
        ? "N/A"
        : itemNames.length === 1
          ? itemNames[0]
          : `${itemNames[0]} + ${itemNames.length - 1} voucher khác`

    return {
      id: order.id,
      orderCode: order.order_code,
      voucherTitle,
      partnerName: uniquePartners.length === 0
        ? "N/A"
        : uniquePartners.length === 1
          ? uniquePartners[0]
          : `${uniquePartners[0]} + ${uniquePartners.length - 1} đối tác khác`,
      amount: Number(order.total_amount),
      paymentMethod: order.payment_method,
      status: order.status,
    }
  })

  return {
    users,
    partners,
    orders,
    revenue: revenue._sum.amount ?? 0,
    revenueByMonth,
    partnersByMonth,
    recentOrders,
  }
}

// Hàm query voucher theo stats
function endOfUtcDay(date: Date) {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export async function getContentDashboardStats(filter: {from?: Date, to?: Date, allTime?: boolean} = {}) {
  // Nếu không chọn filter thì lấy 30 ngày gần nhất
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = filter.from ?? defaultFrom;
  const to = filter.to ? endOfUtcDay(filter.to) : now;

  // Date filter chung dùng cho kết quả trả về
  const dateFilter = filter.allTime
    ? {}
    : {
        created_at: {
          gte: from,
          lte: to,
        },
      };

  // Query voucher stats (theo approval_status)
  const [pending, approved, rejected] = await Promise.all([
    prisma.voucherProduct.count({
      where: {
        approval_status: "pending",
        ...dateFilter,
      }
    }),
    prisma.voucherProduct.count({
      where: {
        approval_status: "approved",
        ...dateFilter,
      }
    }),
    prisma.voucherProduct.count ({
      where: {
        approval_status: "rejected",
        ...dateFilter,
      }
    }),
  ]);

  // Query CMS content stats (theo content_type)
  const [banners, articles, popups, policies, categories] = await Promise.all([
    prisma.cmsContent.count({
      where: {
        content_type: "banner",
        status: "active",
        ...dateFilter,
      }
    }),
    prisma.cmsContent.count({
      where: {
        content_type: "article",
        status: "active",
        ...dateFilter,
      }
    }),
    prisma.cmsContent.count({
      where: {
        content_type: "popup",
        status: "active",
        ...dateFilter,
      }
    }),
    prisma.cmsContent.count({
      where: {
        content_type: "policy",
        status: "active",
        ...dateFilter,
      }
    }),
    prisma.category.count(),
  ]);

  // Trả về các giá trị đã query
  return {
    vouchers: { pending, approved, rejected},
    contents: {banners, articles, popups, policies, categories},
  };
}

// Dashboard cho partner_store_staff (FC-PAS):
// - Số voucher kiểm tra / xác nhận / không hợp lệ / lượt khách hôm nay
// - Danh sách xác nhận gần đây trong phạm vi chi nhánh
export async function getStaffDashboardStats(user: AuthUser) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const branchId = user.branchId;

  if (!branchId) {
    throw new HttpError(403, "Tài khoản nhân viên chưa được gán chi nhánh");
  }

  const [usagesToday, invalidToday, recentUsagesRaw, customersRaw] = await Promise.all([
    prisma.voucherUsage.count({
      where: { branch_id: branchId, used_at: { gte: todayStart } },
    }),
    prisma.voucherCheckLog.count({
      where: { user_id: user.id, status: "failed", created_at: { gte: todayStart } },
    }),
    prisma.voucherUsage.findMany({
      where: { branch_id: branchId },
      orderBy: { used_at: "desc" },
      take: 5,
      include: {
        issued_vouchers: {
          select: {
            voucher_code: true,
            owners: { select: { full_name: true } },
            voucher_products: { select: { name: true } },
          },
        },
      },
    }),
    prisma.voucherUsage.findMany({
      where: { branch_id: branchId, used_at: { gte: todayStart } },
      select: { issued_vouchers: { select: { owner_id: true } } },
    }),
  ]);

  const customersToday = new Set(
    customersRaw.map((c) => c.issued_vouchers?.owner_id).filter(Boolean)
  ).size;

  const recentVerifications = recentUsagesRaw.map((usage) => ({
    code: usage.issued_vouchers?.voucher_code ?? "",
    name: usage.issued_vouchers?.voucher_products?.name ?? "Voucher",
    customer: usage.issued_vouchers?.owners?.full_name ?? "",
    time: usage.used_at,
    status: "used",
  }));

  return {
    checked_today: usagesToday + invalidToday,
    confirmed_today: usagesToday,
    invalid_today: invalidToday,
    customers_today: customersToday,
    recent_verifications: recentVerifications,
  };
}
