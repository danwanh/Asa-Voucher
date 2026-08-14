export type IssuedVoucherStatus = "active" | "used" | "expired" | "refunded";

export interface IssuedVoucherRow {
  id: string;
  voucher_code: string;
  qr_code_payload: string;
  qr_code_image_url: string | null;
  order_item_id: string;
  voucher_product_id: string;
  owner_id: string;
  issued_date: string;
  expired_date: string;
  status: IssuedVoucherStatus;
  created_at: string;
  updated_at: string;
}

export interface VoucherUsageRow {
  id: string;
  issued_voucher_id: string;
  branch_id: string;
  redeemed_by: string;
  redemption_code: string | null;
  used_at: string;
  note: string | null;
}

export interface IssuedVoucherListFilter {
  ownerId?: string;
  feedbackUserId?: string;
  partnerId?: string;
  status?: IssuedVoucherStatus;
  page: number;
  limit: number;
}

export interface VoucherUsageListFilter {
  partnerId?: string;
  branchId?: string;
  issuedVoucherId?: string;
  page: number;
  limit: number;
}
