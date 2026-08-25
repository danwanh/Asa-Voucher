import { api } from "./api";
import type { AppUser } from "@/types";

type BackendPaginatedPartner = {
  items: BackendPartner[];
  count: number;
  page: number;
  limit: number;
};

export type PartnerListParams = {
  page?: number;
  limit?: number;
  approval_status?: "pending" | "approved" | "rejected";
  status?: "active" | "suspended" | "closed";
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type BackendPartner = {
  id: string;
  representative_user_id: string;
  business_name: string;
  business_code: string;
  business_type: string | null;
  tax_number: string | null;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  approval_status: "pending" | "approved" | "rejected";
  status: "active" | "suspended" | "closed";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

type BackendBranch = {
  id: string;
  partner_id: string;
  branch_name: string;
  address: string;
  city: string;
  district: string | null;
  ward: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
};

type BackendPartnerStaff = {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  role: "partner_voucher_staff" | "partner_store_staff";
  is_active: boolean;
  partner_branches_id: string | null;
  branch: {
    id: string;
    branch_name: string;
    partner_id: string;
    is_active: boolean;
  } | null;
  created_at: string;
  updated_at: string;
};

type BackendPaginated<T> = {
  items: T[];
  count: number;
  page: number;
  limit: number;
};

export type PartnerProfile = {
  id: string;
  representativeUserId: string;
  businessName: string;
  businessCode: string;
  businessType: string | null;
  taxNumber: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  description: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  status: "active" | "suspended" | "closed";
  createdAt: string;
  updatedAt: string;
};

export type PartnerBranch = {
  latitude: number | null;
  longitude: number | null;
  id: string;
  partnerId: string;
  branchName: string;
  address: string;
  city: string;
  district: string;
  ward: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
};

export type PartnerStaffRole = "partner_voucher_staff" | "partner_store_staff";

export type PartnerStaffMember = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: PartnerStaffRole;
  isActive: boolean;
  branchId: string | null;
  branchName: string;
  createdAt: string;
  updatedAt: string;
};

export type PartnerStaffUpdateInput = {
  full_name?: string;
  phone?: string | null;
  role?: PartnerStaffRole;
  partner_branches_id?: string;
};

export type PartnerCreateInput = {
  business_name: string;
  business_code: string;
  business_type?: string;
  tax_number?: string;
  website_url?: string;
  description?: string;
};

export type PartnerUpdateInput = Partial<
  Omit<PartnerCreateInput, "business_code">
>;

export type BranchInput = {
  branch_name: string;
  address: string;
  city: string;
  district?: string;
  ward?: string;
  phone?: string;
  is_active?: boolean;
};

function extractData<T>(response: { data: ApiEnvelope<T> }): T {
  return response.data.data;
}

function mapPartner(partner: BackendPartner): PartnerProfile {
  return {
    id: partner.id,
    representativeUserId: partner.representative_user_id,
    businessName: partner.business_name,
    businessCode: partner.business_code,
    businessType: partner.business_type,
    taxNumber: partner.tax_number,
    logoUrl: partner.logo_url,
    websiteUrl: partner.website_url,
    description: partner.description,
    approvalStatus: partner.approval_status,
    status: partner.status,
    createdAt: partner.created_at,
    updatedAt: partner.updated_at,
  };
}

function mapBranch(branch: BackendBranch): PartnerBranch {
  return {
    id: branch.id,
    partnerId: branch.partner_id,
    branchName: branch.branch_name,
    address: branch.address,
    city: branch.city,
    district: branch.district ?? "",
    ward: branch.ward ?? "",
    phone: branch.phone ?? "",
    isActive: branch.is_active,
    createdAt: branch.created_at,
    latitude: branch.latitude,
    longitude: branch.longitude,
  };
}

function mapPartnerStaff(staff: BackendPartnerStaff): PartnerStaffMember {
  return {
    id: staff.id,
    email: staff.email,
    phone: staff.phone ?? "",
    fullName: staff.full_name,
    role: staff.role,
    isActive: staff.is_active,
    branchId: staff.partner_branches_id,
    branchName: staff.branch?.branch_name ?? "Chưa phân công",
    createdAt: staff.created_at,
    updatedAt: staff.updated_at,
  };
}

export const partnerService = {
  async listPartners(params?: PartnerListParams): Promise<{
    items: PartnerProfile[];
    count: number;
    page: number;
    limit: number;
  }> {
    const res = await api.get<ApiEnvelope<BackendPaginatedPartner>>(
      "/partners",
      { params },
    );

    const data = extractData(res);

    return {
      ...data,
      items: data.items.map(mapPartner),
    };
  },

  async approvePartner(
    partnerId: string,
    approvalStatus: "approved" | "rejected",
  ): Promise<PartnerProfile> {
    const res = await api.patch<ApiEnvelope<BackendPartner>>(
      `/partners/${partnerId}/approval`,
      {
        approval_status: approvalStatus,
      },
    );

    return mapPartner(extractData(res));
  },

  async updatePartnerStatus(
    partnerId: string,
    status: "active" | "suspended" | "closed",
  ): Promise<PartnerProfile> {
    const res = await api.patch<ApiEnvelope<BackendPartner>>(
      `/partners/${partnerId}/status`,
      { status },
    );

    return mapPartner(extractData(res));
  },

  async getPartner(partnerId: string): Promise<PartnerProfile> {
    const res = await api.get<ApiEnvelope<BackendPartner>>(
      `/partners/${partnerId}`,
    );
    return mapPartner(extractData(res));
  },

  async createMyPartner(input: PartnerCreateInput): Promise<PartnerProfile> {
    const res = await api.post<ApiEnvelope<BackendPartner>>("/partners", input);
    return mapPartner(extractData(res));
  },

  async updatePartner(
    partnerId: string,
    input: PartnerUpdateInput,
  ): Promise<PartnerProfile> {
    const res = await api.patch<ApiEnvelope<BackendPartner>>(
      `/partners/${partnerId}`,
      input,
    );
    return mapPartner(extractData(res));
  },

  async listBranches(partnerId: string): Promise<PartnerBranch[]> {
    const res = await api.get<ApiEnvelope<BackendBranch[]>>(
      `/partners/${partnerId}/branches`,
    );
    return extractData(res).map(mapBranch);
  },

  async createBranch(
    partnerId: string,
    input: BranchInput,
  ): Promise<PartnerBranch> {
    const res = await api.post<ApiEnvelope<BackendBranch>>(
      `/partners/${partnerId}/branches`,
      input,
    );
    return mapBranch(extractData(res));
  },

  async updateBranch(
    branchId: string,
    input: Partial<BranchInput>,
  ): Promise<PartnerBranch> {
    const res = await api.patch<ApiEnvelope<BackendBranch>>(
      `/branches/${branchId}`,
      input,
    );
    return mapBranch(extractData(res));
  },

  async deleteBranch(branchId: string): Promise<void> {
    await api.delete(`/branches/${branchId}`);
  },

  async listPartnerStaff(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<BackendPaginated<PartnerStaffMember>> {
    const res = await api.get<
      ApiEnvelope<BackendPaginated<BackendPartnerStaff>>
    >("/users/partner-staff", { params });
    const data = extractData(res);
    return { ...data, items: data.items.map(mapPartnerStaff) };
  },

  async getPartnerStaff(staffId: string): Promise<PartnerStaffMember> {
    const res = await api.get<ApiEnvelope<BackendPartnerStaff>>(
      `/users/partner-staff/${staffId}`,
    );
    return mapPartnerStaff(extractData(res));
  },

  async updatePartnerStaff(
    staffId: string,
    input: PartnerStaffUpdateInput,
  ): Promise<PartnerStaffMember> {
    const res = await api.patch<ApiEnvelope<BackendPartnerStaff>>(
      `/users/partner-staff/${staffId}`,
      input,
    );
    return mapPartnerStaff(extractData(res));
  },

  async getCurrentPartner(user: AppUser): Promise<PartnerProfile | null> {
    if (!user.partnerId) return null;
    return this.getPartner(user.partnerId);
  },
};
