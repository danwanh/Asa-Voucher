export type ComplaintReason =
  | "not_as_described"
  | "cannot_redeem"
  | "expired_early"
  | "wrong_value"
  | "other";

export type ComplaintStatus = "open" | "under_review" | "resolved" | "closed";
export type ComplaintResolutionType = "refund" | "reissue" | "no_action" | "partner_penalized";
export type ComplaintResponderRole = "admin" | "partner" | "user";

export interface ComplaintRow {
  id: string;
  order_id: string | null;
  issued_voucher_id: string | null;
  user_id: string;
  reason: ComplaintReason;
  description: string;
  evidence_urls: string[] | null;
  status: ComplaintStatus;
  assigned_to: string | null;
  resolution_note: string | null;
  resolution_type: ComplaintResolutionType | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ComplaintResponseRow {
  id: string;
  complaint_id: string;
  responded_by: string;
  responder_role: ComplaintResponderRole;
  content: string;
  created_at: string;
}

export interface ComplaintListFilter {
  userId?: string;
  partnerId?: string;
  status?: ComplaintStatus;
  page: number;
  limit: number;
}
