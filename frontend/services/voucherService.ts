import axios from "axios"
import { API } from "@/api/endpoints"
import type {
  VoucherProduct,
  VoucherProductImage,
  VoucherProductBranch,
  VoucherProductStatus,
  ApprovalStatus,
} from "@/types"

// ── Axios instance with auth interceptor ────────────────────────────
const http = axios.create({ baseURL: "" })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Helper: extract data from API response ──────────────────────────
function extractData<T>(res: { data: { data: T } }): T {
  return res.data.data
}

// ── Types ───────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[]
  count: number
  page: number
  limit: number
}

export interface VoucherProductListQuery {
  category_id?: string
  partner_id?: string
  search?: string
  page?: number
  limit?: number
}

export interface CreateVoucherProductInput {
  category_id: string
  name: string
  description?: string
  thumbnail_url?: string
  original_price: number
  selling_price: number
  applicable_area?: string
  total_quantity: number
  terms_and_conditions?: unknown
  usage_instructions?: unknown
  sale_start_date: string
  sale_end_date: string
  validity_days: number
  status?: "draft" | "active"
}

export type UpdateVoucherProductInput = Partial<Omit<CreateVoucherProductInput, "partner_id">>

// ── Voucher Product Service ─────────────────────────────────────────
export const voucherService = {
  /** List voucher products with filters (public listing for approved+active) */
  async list(query?: VoucherProductListQuery): Promise<PaginatedResponse<VoucherProduct>> {
    const params = new URLSearchParams()
    if (query?.category_id) params.set("category_id", query.category_id)
    if (query?.partner_id) params.set("partner_id", query.partner_id)
    if (query?.search) params.set("search", query.search)
    if (query?.page) params.set("page", String(query.page))
    if (query?.limit) params.set("limit", String(query.limit))
    const qs = params.toString()
    const url = qs ? `${API.VOUCHERS}?${qs}` : API.VOUCHERS
    return extractData(await http.get(url))
  },

  /** Get single voucher product (public if approved+active, else owner/admin) */
  async getById(id: string): Promise<VoucherProduct> {
    return extractData(await http.get(API.VOUCHER(id)))
  },

  /** Create voucher product (partner_owner | partner_voucher_staff) */
  async create(input: CreateVoucherProductInput): Promise<VoucherProduct> {
    return extractData(await http.post(API.VOUCHER_CREATE, input))
  },

  /** Update voucher product (owner/admin only, field-locking enforced server-side) */
  async update(id: string, input: UpdateVoucherProductInput): Promise<VoucherProduct> {
    return extractData(await http.patch(API.VOUCHER_UPDATE(id), input))
  },

  /** Soft-delete voucher product (status → paused) */
  async remove(id: string): Promise<void> {
    await http.delete(API.VOUCHER_DELETE(id))
  },

  /** Submit voucher for approval (approval_status → pending) */
  async submit(id: string): Promise<VoucherProduct> {
    return extractData(await http.patch(API.VOUCHER_SUBMIT(id)))
  },

  /** Admin: approve or reject voucher */
  async approve(id: string, approvalStatus: ApprovalStatus): Promise<VoucherProduct> {
    return extractData(await http.patch(API.VOUCHER_APPROVE(id), { approval_status: approvalStatus }))
  },

  /** Update voucher status (draft/active/paused/sold_out/expired) */
  async updateStatus(id: string, status: VoucherProductStatus): Promise<VoucherProduct> {
    return extractData(await http.patch(API.VOUCHER_STATUS(id), { status }))
  },

  // ── Images ──────────────────────────────────────────────────
  async listImages(id: string): Promise<VoucherProductImage[]> {
    return extractData(await http.get(API.VOUCHER_IMAGES(id)))
  },

  async createImage(id: string, input: { image_url: string; is_primary?: boolean; sort_order?: number }): Promise<VoucherProductImage> {
    return extractData(await http.post(API.VOUCHER_IMAGE_CREATE(id), input))
  },

  async updateImage(imageId: string, input: Partial<{ image_url: string; is_primary: boolean; sort_order: number }>): Promise<VoucherProductImage> {
    return extractData(await http.patch(API.VOUCHER_IMAGE_UPDATE(imageId), input))
  },

  async deleteImage(imageId: string): Promise<void> {
    await http.delete(API.VOUCHER_IMAGE_DELETE(imageId))
  },

  // ── Branches ────────────────────────────────────────────────
  async listBranches(id: string): Promise<VoucherProductBranch[]> {
    return extractData(await http.get(API.VOUCHER_BRANCHES(id)))
  },

  async assignBranch(id: string, branchId: string): Promise<VoucherProductBranch> {
    return extractData(await http.post(API.VOUCHER_BRANCH_CREATE(id), { branch_id: branchId }))
  },

  async removeBranch(id: string, branchId: string): Promise<void> {
    await http.delete(API.VOUCHER_BRANCH_DELETE(id, branchId))
  },
}
