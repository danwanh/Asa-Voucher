export interface ReportDateRangeFilter {
  date_from?: string;
  date_to?: string;
  partnerId?: string;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  order_count: number;
}

export interface OrderStatusBreakdown {
  status: string;
  count: number;
}

export interface VoucherReportItem {
  voucher_product_id: string;
  name: string;
  total_quantity: number;
  remaining_quantity: number;
  sold_quantity: number;
  used_quantity: number;
}

export interface PartnerReportItem {
  partner_id: string;
  business_name: string;
  voucher_count: number;
  paid_order_count: number;
  revenue: number;
}

export interface StaffVoucherReportItem {
  voucher_product_id: string;
  program_name: string;
  category_name: string;
  total_quantity: number;
  sold_quantity: number;
  used_quantity: number;
  usage_rate: number;
  revenue: number;
  /** Điểm hiệu quả = doanh thu × tỷ lệ sử dụng (%) / 100 (doanh thu hiệu quả). */
  effectiveness_score: number;
}