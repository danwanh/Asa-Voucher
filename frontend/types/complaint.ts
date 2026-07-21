export type ComplaintStatus = "open" | "in_progress" | "resolved" | "rejected";

export interface Complaint {
  id: string;
  order_id?: string | null;
  issued_voucher_id?: string | null;
  user_id: string;
  reason: string;
  description: string;
  evidence_urls?: unknown;
  status: ComplaintStatus;
  assigned_to?: string | null;
  resolution_note?: string | null;
  resolution_type?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface ComplaintResponse {
  id: string;
  complaint_id: string;
  responded_by: string;
  responder_role: string;
  content: string;
  created_at: string;
}
