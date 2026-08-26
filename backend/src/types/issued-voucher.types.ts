export type IssuedVoucherStatus = "active" | "used" | "expired" | "revoked" | "cancelled";

export interface IssuedVoucherRow {
  id: string;
  voucher_code: string;
  qr_code_payload: string;
  qr_code_image_url: string | null;
  order_item_id: string | null;
  voucher_product_id: string;
  owner_id: string | null;
  branch_id?: string | null;
  redeemed_by?: string | null;
  issued_date: string;
  expired_date: string;
  status: IssuedVoucherStatus;
  is_test?: boolean;
  used_at?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoucherUsageRow {
  id: string;
  issued_voucher_id: string;
  branch_id: string;
  redeemed_by: string;
  used_at: string;
  note: string | null;
}

export interface IssuedVoucherListFilter {
  ownerId?: string;
  feedbackUserId?: string;
  partnerId?: string;
  status?: IssuedVoucherStatus;
  isTest?: boolean;
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
