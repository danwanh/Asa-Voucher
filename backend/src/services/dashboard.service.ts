import { date } from "zod/v4"
import { prisma } from "../config/prisma.js"

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
  const createdAtFilter =
    from || to
      ? {
          created_at: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}

  const now = new Date()
  const monthsBack = 6
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)

  const chartFrom = from && new Date(from) > startDate ? new Date(from) : startDate
  const chartTo = to ? new Date(to) : now

  const [users, partners, orders, revenue, paidPayments, recentPartners, recentOrdersRaw] = await Promise.all([
    prisma.user.count({ where: createdAtFilter }),
    prisma.partner.count({ where: createdAtFilter }),
    prisma.order.count({ where: createdAtFilter }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "success",
        ...(from || to
          ? { paid_at: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
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
export async function getContentDashboardStats(filter: {from?: Date, to?: Date} = {}) {
  // Nếu không chọn filter thì lấy 30 ngày gần nhất
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = filter.from ?? defaultFrom;
  const to = filter.to ?? now;

  // Date filter chung dùng cho kết quả trả về
  const dateFilter = {
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
    prisma.cmsContent.count({
      where: {
        content_type: "category",
        status: "active",
        ...dateFilter,
      }
    }),
  ]);

  // Trả về các giá trị đã query
  return {
    vouchers: { pending, approved, rejected},
    contents: {banners, articles, popups, policies, categories},
  };
}