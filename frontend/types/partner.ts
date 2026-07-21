export type PartnerApprovalStatus = "pending" | "approved" | "rejected";
export type PartnerStatus = "active" | "inactive";

export interface Partner {
  id: string;
  representative_user_id: string;
  business_name: string;
  business_code: string;
  business_type?: string | null;
  tax_number?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
  description?: string | null;
  approval_status: PartnerApprovalStatus;
  status: PartnerStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerBranch {
  id: string;
  partner_id: string;
  branch_name: string;
  address: string;
  city: string;
  district?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  created_at: string;
}
