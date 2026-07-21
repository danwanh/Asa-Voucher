export type VoucherProductStatus =
  | "draft"
  | "selling"
  | "sold_out"
  | "expired"
  | "locked"
  | "cancelled";

export type VoucherApprovalStatus = "pending" | "approved" | "rejected";

export interface VoucherProduct {
  id: string;
  partner_id: string;
  category_id: string;
  name: string;
  description?: string | null;
  thumbnail_url?: string | null;
  original_price: number;
  selling_price: number;
  discount_rate: number;
  applicable_area?: string | null;
  total_quantity: number;
  remaining_quantity: number;
  terms_and_conditions?: unknown;
  usage_instructions?: unknown;
  sale_start_date: string;
  sale_end_date: string;
  validity_days: number;
  status: VoucherProductStatus;
  approval_status: VoucherApprovalStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoucherProductImage {
  id: string;
  voucher_product_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export type IssuedVoucherStatus = "active" | "used" | "expired" | "locked";

export interface IssuedVoucher {
  id: string;
  voucher_code: string;
  qr_code_payload: string;
  qr_code_image_url?: string | null;
  order_item_id: string;
  voucher_product_id: string;
  owner_id: string;
  issued_date: string;
  expired_date: string;
  status: IssuedVoucherStatus;
  created_at: string;
  updated_at: string;
}

export type VoucherUsageStatus = "valid" | "invalid" | "used";

export interface VoucherUsage {
  id: string;
  issued_voucher_id: string;
  branch_id: string;
  redeemed_by: string;
  redemption_code?: string | null;
  used_at: string;
  note?: string | null;
}
