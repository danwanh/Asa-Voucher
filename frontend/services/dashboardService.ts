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

export type DashboardFilters = {
  from?: string
  to?: string
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

export async function getDashboardStats(filters?: DashboardFilters): Promise<DashboardStats> {
  return fetchDashboard(filters)
}

export const dashboardService = {
  getStats: fetchDashboard,
}
