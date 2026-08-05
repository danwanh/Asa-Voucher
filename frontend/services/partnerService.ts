import { api } from "./api"
import type { AppUser } from "@/types"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  message?: string
}

type BackendPartner = {
  id: string
  representative_user_id: string
  business_name: string
  business_code: string
  business_type: string | null
  tax_number: string | null
  logo_url: string | null
  website_url: string | null
  description: string | null
  approval_status: "pending" | "approved" | "rejected"
  status: "active" | "suspended" | "closed"
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

type BackendBranch = {
  id: string
  partner_id: string
  branch_name: string
  address: string
  city: string
  district: string | null
  phone: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean
  created_at: string
}

export type PartnerProfile = {
  id: string
  representativeUserId: string
  businessName: string
  businessCode: string
  businessType: string | null
  taxNumber: string | null
  logoUrl: string | null
  websiteUrl: string | null
  description: string | null
  approvalStatus: "pending" | "approved" | "rejected"
  status: "active" | "suspended" | "closed"
  createdAt: string
  updatedAt: string
}

export type PartnerBranch = {
  id: string
  partnerId: string
  branchName: string
  address: string
  city: string
  district: string
  phone: string
  isActive: boolean
  createdAt: string
}

export type PartnerCreateInput = {
  business_name: string
  business_code: string
  business_type?: string
  tax_number?: string
  website_url?: string
  description?: string
}

export type PartnerUpdateInput = Partial<Omit<PartnerCreateInput, "business_code">>

export type BranchInput = {
  branch_name: string
  address: string
  city: string
  district?: string
  phone?: string
  latitude?: number
  longitude?: number
  is_active?: boolean
}

function extractData<T>(response: { data: ApiEnvelope<T> }): T {
  return response.data.data
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
  }
}

function mapBranch(branch: BackendBranch): PartnerBranch {
  return {
    id: branch.id,
    partnerId: branch.partner_id,
    branchName: branch.branch_name,
    address: branch.address,
    city: branch.city,
    district: branch.district ?? "",
    phone: branch.phone ?? "",
    isActive: branch.is_active,
    createdAt: branch.created_at,
  }
}

export const partnerService = {
  async getPartner(partnerId: string): Promise<PartnerProfile> {
    const res = await api.get<ApiEnvelope<BackendPartner>>(`/partners/${partnerId}`)
    return mapPartner(extractData(res))
  },

  async createMyPartner(input: PartnerCreateInput): Promise<PartnerProfile> {
    const res = await api.post<ApiEnvelope<BackendPartner>>("/partners", input)
    return mapPartner(extractData(res))
  },

  async updatePartner(partnerId: string, input: PartnerUpdateInput): Promise<PartnerProfile> {
    const res = await api.patch<ApiEnvelope<BackendPartner>>(`/partners/${partnerId}`, input)
    return mapPartner(extractData(res))
  },

  async listBranches(partnerId: string): Promise<PartnerBranch[]> {
    const res = await api.get<ApiEnvelope<BackendBranch[]>>(`/partners/${partnerId}/branches`)
    return extractData(res).map(mapBranch)
  },

  async createBranch(partnerId: string, input: BranchInput): Promise<PartnerBranch> {
    const res = await api.post<ApiEnvelope<BackendBranch>>(`/partners/${partnerId}/branches`, input)
    return mapBranch(extractData(res))
  },

  async updateBranch(branchId: string, input: BranchInput): Promise<PartnerBranch> {
    const res = await api.patch<ApiEnvelope<BackendBranch>>(`/branches/${branchId}`, input)
    return mapBranch(extractData(res))
  },

  async deleteBranch(branchId: string): Promise<void> {
    await api.delete(`/branches/${branchId}`)
  },

  async getCurrentPartner(user: AppUser): Promise<PartnerProfile | null> {
    if (!user.partnerId) return null
    return this.getPartner(user.partnerId)
  },
}
