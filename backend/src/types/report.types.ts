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
  status: string;
  sale_start_date: string;
  sale_end_date: string;
  selling_price: number;
  total_quantity: number;
  remaining_quantity: number;
  issued_quantity: number;
  sold_quantity: number;
  used_quantity: number;
  expired_quantity: number;
  usage_rate: number;
  revenue: number;
  is_selling: boolean;
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
