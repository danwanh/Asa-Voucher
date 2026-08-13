import { api } from "./api"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  message?: string
}

export type DashboardRecentOrder = {
  id: string
  orderCode: string
  voucherTitle: string
  partnerName: string
  amount: number
  paymentMethod: string
  status: string
}

export type DashboardStats = {
  users: number
  partners: number
  orders: number
  revenue: number
  revenueByMonth: { month: string; revenue: number }[]
  partnersByMonth: { month: string; new: number }[]
  recentOrders: DashboardRecentOrder[]
}

/** FC-ADC-DASHBOARD: Thống kê voucher + nội dung cho admin_content */
export type ContentDashboardStats = {
  vouchers: {
    pending: number
    approved: number
    rejected: number
  }
  contents: {
    banners: number
    articles: number
    popups: number
    policies: number
    categories: number
  }
}

export type DashboardFilters = {
  from?: string
  to?: string
}

/** FC-ADC-DASHBOARD: Filter cho content dashboard */
export type ContentDashboardFilters = {
  from_date?: string
  to_date?: string
}

function extractData<T>(response: { data: ApiEnvelope<T> }): T {
  return response.data.data
}

async function fetchDashboard(filters?: DashboardFilters): Promise<DashboardStats> {
  const res = await api.get<ApiEnvelope<DashboardStats>>("/dashboard", {
    params: {
      from: filters?.from,
      to: filters?.to,
    },
  })
  return extractData(res)
}

/** FC-ADC-DASHBOARD: GET /dashboard/content */
async function fetchContentDashboard(filters?: ContentDashboardFilters): Promise<ContentDashboardStats> {
  const res = await api.get<ApiEnvelope<ContentDashboardStats>>("/dashboard/content", {
    params: {
      from_date: filters?.from_date,
      to_date: filters?.to_date,
    },
  })
  return extractData(res)
}

export async function getDashboardStats(filters?: DashboardFilters): Promise<DashboardStats> {
  return fetchDashboard(filters)
}

export const dashboardService = {
  getStats: fetchDashboard,
  getContentStats: fetchContentDashboard,
}
