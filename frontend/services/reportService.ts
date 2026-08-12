import { api } from "./api"
import type { StaffVoucherReportItem } from "@/types"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  message?: string
}

export type ReportFilters = {
  date_from?: string
  date_to?: string
  branch_id?: string
  voucher_product_id?: string
}

export type RevenuePoint = {
  date: string
  revenue: number
  order_count: number
}

export type OrderStatusBreakdown = {
  status: string
  count: number
}

export type VoucherReportItem = {
  voucher_product_id: string
  name: string
  status: string
  sale_end_date: string
  selling_price: number
  total_quantity: number
  remaining_quantity: number
  issued_quantity: number
  sold_quantity: number
  used_quantity: number
  expired_quantity: number
  usage_rate: number
  revenue: number
}

function extractData<T>(response: { data: ApiEnvelope<T> }): T {
  return response.data.data
}

export const reportService = {
  async getRevenueReport(filters: ReportFilters): Promise<RevenuePoint[]> {
    const res = await api.get<ApiEnvelope<RevenuePoint[]>>("/reports/revenue", { params: filters })
    return extractData(res)
  },

  async getOrderReport(filters: ReportFilters): Promise<OrderStatusBreakdown[]> {
    const res = await api.get<ApiEnvelope<OrderStatusBreakdown[]>>("/reports/orders", { params: filters })
    return extractData(res)
  },

  async getVoucherReport(filters: ReportFilters): Promise<VoucherReportItem[]> {
    const res = await api.get<ApiEnvelope<VoucherReportItem[]>>("/reports/vouchers", { params: filters })
    return extractData(res)
  },

  async getStaffVoucherReport(filters: ReportFilters): Promise<StaffVoucherReportItem[]> {
    const res = await api.get<ApiEnvelope<StaffVoucherReportItem[]>>("/reports/staff-vouchers", {params: filters})
    return extractData(res)
  }
}
