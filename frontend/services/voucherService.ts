import { api } from "./api"
import type { AxiosRequestConfig } from "axios"
import type { Voucher } from "@/types"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  message?: string
}

export type BackendVoucherProduct = {
  id: string
  partner_id: string
  category_id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  original_price: number | string
  selling_price: number | string
  discount_rate: number
  applicable_area: string | null
  total_quantity: number
  remaining_quantity: number
  sale_start_date: string
  sale_end_date: string
  validity_days: number
  terms_and_conditions: unknown
  usage_instructions: unknown
  status: string
  workflow_status?: string
  workflow_label?: string
  submitted_at?: string | null
  partners?: {
    business_name: string
  } | null
  categories?: {
    name: string
    slug: string
  } | null
}

export type BackendCategory = {
  id: string
  name: string
  slug: string
}

type BackendHomepageSummary = {
  vouchers: number
  partners: number
  customers: number
  max_discount: number
  category_counts: { category_id: string; count: number }[]
}

type BackendVoucherList = {
  items: BackendVoucherProduct[]
  count: number
  page: number
  limit: number
}

export type VoucherListPage = {
  items: Voucher[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type HomepageSummary = {
  vouchers: number
  partners: number
  customers: number
  maxDiscount: number
  categoryCounts: { categoryId: string; count: number }[]
}

type BackendReview = {
  id: string
  user_id: string
  users?: {
    full_name?: string | null
    avatar_url?: string | null
  } | null
  rating: number
  comment: string | null
  created_at: string
}

type BackendReviewList = {
  items: BackendReview[]
  pagination?: { total: number }
  average_rating?: number
}

type BackendVoucherBranch = {
  id: string
  branch_id: string
  partner_branches: {
    id: string
    branch_name: string
    address: string
    city: string
    district: string | null
  }
}

export type VoucherCreateInput = {
  category_id: string
  name: string
  description: string
  thumbnail_url?: string
  original_price: number
  selling_price: number
  applicable_area?: string
  total_quantity: number
  terms_and_conditions: string[]
  usage_instructions?: string[]
  sale_start_date: string
  sale_end_date: string
  validity_days: number
}

export type VoucherUpdateInput = Partial<VoucherCreateInput> & {
  thumbnail_url?: string
}

export type VoucherPublicReview = {
  id: string
  name: string
  rating: number
  text: string
  date: string
}

export type VoucherApplicableBranch = {
  id: string
  branchId: string
  name: string
  address: string
}

export type VoucherManageDetailData = {
  voucher: Voucher
  conditions: string[]
  usageInstructions: string[]
  validityDays: number
}

export type VoucherDetailData = {
  voucher: Voucher
  reviews: VoucherPublicReview[]
  branches: VoucherApplicableBranch[]
  conditions: string[]
  usageInstructions: string[]
  applicableArea: string | null
  partnerId: string
  partnerName: string
  categoryName: string
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value)
}

function mapStatus(product: BackendVoucherProduct): Voucher["status"] {
  if (product.workflow_status === "draft") return "draft"
  if (product.workflow_status === "pending_approval") return "pending"
  if (product.workflow_status === "approved") return "approved"
  if (product.workflow_status === "rejected") return "rejected"
  if (product.workflow_status === "paused") return "locked"
  if (product.workflow_status === "sold_out") return "sold_out"
  if (product.workflow_status === "expired") return "expired"
  if (product.workflow_status === "active") return "active"

  const remaining = product.remaining_quantity
  const validTo = product.sale_end_date
  if (remaining <= 0) return "sold_out"
  if (new Date(validTo) < new Date()) return "expired"
  if (product.status === "active") return "active"
  if (product.status === "draft") return "draft"
  return "pending"
}

function parseStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

function mapVoucherProduct(product: BackendVoucherProduct, categorySlug: string): Voucher {
  const originalPrice = toNumber(product.original_price)
  const price = toNumber(product.selling_price)
  const sold = Math.max(0, product.total_quantity - product.remaining_quantity)
  const discount = Number.isFinite(product.discount_rate) ? Math.round(product.discount_rate) : 0

  return {
    id: product.id,
    partnerId: product.partner_id,
    partnerName: product.partners?.business_name ?? product.partner_id,
    partnerLogo: "gift",
    title: product.name,
    category: categorySlug,
    categoryId: product.category_id,
    discount,
    discountType: "percent",
    minOrder: 0,
    price,
    originalPrice,
    validFrom: product.sale_start_date,
    validTo: product.sale_end_date,
    quantity: product.total_quantity,
    sold,
    status: mapStatus(product),
    rating: 0,
    reviews: 0,
    description: product.description ?? "",
    image: product.thumbnail_url ?? "",
    tags: [],
    applicableArea: product.applicable_area
  }
}

function mapReview(review: BackendReview): VoucherPublicReview {
  const fullName = review.users?.full_name?.trim() || "Khách hàng"
  const nameParts = fullName.split(/\s+/).filter(Boolean)
  const lastName = nameParts.pop() ?? "K"
  const maskedName = nameParts.length > 0
    ? `${nameParts.join(" ")} ${lastName.charAt(0)}***`
    : `${lastName.charAt(0)}***`

  return {
    id: review.id,
    name: maskedName,
    rating: review.rating,
    text: review.comment?.trim() || "",
    date: review.created_at
  }
}

function mapBranch(item: BackendVoucherBranch): VoucherApplicableBranch {
  const branch = item.partner_branches
  const district = branch.district ? `, ${branch.district}` : ""
  return {
    id: item.id,
    branchId: item.branch_id,
    name: branch.branch_name,
    address: `${branch.address}${district}, ${branch.city}`
  }
}

function extractData<T>(response: { data: ApiEnvelope<T> }): T {
  return response.data.data
}

let categoryMapPromise: Promise<Map<string, BackendCategory>> | null = null
const voucherDetailPromises = new Map<string, Promise<VoucherDetailData>>()

async function getCategoryMap() {
  if (!categoryMapPromise) {
    categoryMapPromise = api
      .get<ApiEnvelope<BackendCategory[]>>("/categories")
      .then((categoryRes) => {
        const categories = extractData(categoryRes)
        return new Map(categories.map((category) => [category.id, category]))
      })
      .catch((error) => {
        categoryMapPromise = null
        throw error
      })
  }

  return categoryMapPromise
}

function categoryFromMap(categoryMap: Map<string, BackendCategory>, categoryId: string) {
  return categoryMap.get(categoryId) ?? { id: categoryId, name: categoryId, slug: categoryId }
}

export const voucherService = {
  async listPublicVouchersPage(
    params?: { page?: number; limit?: number; search?: string; categoryId?: string; partnerId?: string; area?: string },
    config?: Pick<AxiosRequestConfig, "signal">,
  ): Promise<VoucherListPage> {
    const [categoryMap, listRes] = await Promise.all([
      getCategoryMap(),
      api.get<ApiEnvelope<BackendVoucherList>>("/voucher-products", {
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          search: params?.search,
          category_id: params?.categoryId,
          partner_id: params?.partnerId,
          area: params?.area,
        },
        ...config,
      }),
    ])
    const list = extractData(listRes)
    return {
      items: list.items.map((item) => mapVoucherProduct(item, categoryFromMap(categoryMap, item.category_id).slug)),
      page: list.page,
      limit: list.limit,
      total: list.count,
      totalPages: Math.max(1, Math.ceil(list.count / list.limit)),
    }
  },

  async listPublicVouchers(params?: { page?: number; limit?: number; search?: string; categoryId?: string; partnerId?: string; area?: string }): Promise<Voucher[]> {
    const [categoryMap, listRes] = await Promise.all([
      getCategoryMap(),
      api.get<ApiEnvelope<BackendVoucherList>>("/voucher-products", {
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 30,
          search: params?.search,
          category_id: params?.categoryId,
          partner_id: params?.partnerId,
          area: params?.area
        }
      })
    ])

    const list = extractData(listRes).items
    return list.map((item) => {
      const category = categoryFromMap(categoryMap, item.category_id)
      return mapVoucherProduct(item, category.slug)
    })
  },

  async listMyVouchers(params?: { page?: number; limit?: number; search?: string; categoryId?: string }): Promise<Voucher[]> {
    const [categoryMap, listRes] = await Promise.all([
      getCategoryMap(),
      api.get<ApiEnvelope<BackendVoucherList>>("/voucher-products", {
        params: {
          scope: "mine",
          page: params?.page ?? 1,
          limit: params?.limit ?? 30,
          search: params?.search,
          category_id: params?.categoryId
        }
      })
    ])

    return extractData(listRes).items.map((item) => {
      const category = categoryFromMap(categoryMap, item.category_id)
      return mapVoucherProduct(item, category.slug)
    })
  },

  async listCategories(): Promise<BackendCategory[]> {
    const categoryMap = await getCategoryMap()
    return Array.from(categoryMap.values())
  },

  async getHomepageSummary(): Promise<HomepageSummary> {
    const res = await api.get<ApiEnvelope<BackendHomepageSummary>>("/homepage/summary")
    const summary = extractData(res)
    return {
      vouchers: summary.vouchers,
      partners: summary.partners,
      customers: summary.customers,
      maxDiscount: summary.max_discount,
      categoryCounts: summary.category_counts.map((item) => ({
        categoryId: item.category_id,
        count: item.count
      }))
    }
  },

  async createVoucher(input: VoucherCreateInput): Promise<Voucher> {
    const [categoryMap, createRes] = await Promise.all([
      getCategoryMap(),
      api.post<ApiEnvelope<BackendVoucherProduct>>("/voucher-products", input)
    ])
    const item = extractData(createRes)
    const category = categoryFromMap(categoryMap, item.category_id)
    return mapVoucherProduct(item, category.slug)
  },

  async updateVoucher(voucherId: string, input: VoucherUpdateInput): Promise<Voucher> {
    const [categoryMap, updateRes] = await Promise.all([
      getCategoryMap(),
      api.patch<ApiEnvelope<BackendVoucherProduct>>(`/voucher-products/${voucherId}`, input)
    ])
    const item = extractData(updateRes)
    const category = categoryFromMap(categoryMap, item.category_id)
    voucherDetailPromises.delete(voucherId)
    return mapVoucherProduct(item, category.slug)
  },

  async assignBranch(voucherId: string, branchId: string): Promise<void> {
    await api.post(`/voucher-products/${voucherId}/branches`, { branch_id: branchId })
    voucherDetailPromises.delete(voucherId)
  },

  async removeBranch(voucherId: string, branchId: string): Promise<void> {
    await api.delete(`/voucher-products/${voucherId}/branches/${branchId}`)
    voucherDetailPromises.delete(voucherId)
  },

  async listVoucherBranches(voucherId: string): Promise<VoucherApplicableBranch[]> {
    const res = await api.get<ApiEnvelope<BackendVoucherBranch[]>>(`/voucher-products/${voucherId}/branches`)
    return extractData(res).map(mapBranch)
  },

  async getManageDetail(id: string): Promise<VoucherManageDetailData> {
    const [categoryMap, voucherRes] = await Promise.all([
      getCategoryMap(),
      api.get<ApiEnvelope<BackendVoucherProduct>>(`/voucher-products/${id}`)
    ])
    const product = extractData(voucherRes)
    const category = product.categories ?? categoryFromMap(categoryMap, product.category_id)
    return {
      voucher: mapVoucherProduct(product, category.slug),
      conditions: parseStringArray(product.terms_and_conditions),
      usageInstructions: parseStringArray(product.usage_instructions),
      validityDays: product.validity_days,
    }
  },

  async submitVoucher(voucherId: string): Promise<Voucher> {
    const [categoryMap, submitRes] = await Promise.all([
      getCategoryMap(),
      api.patch<ApiEnvelope<BackendVoucherProduct>>(`/voucher-products/${voucherId}/submit`)
    ])
    const item = extractData(submitRes)
    const category = categoryFromMap(categoryMap, item.category_id)
    return mapVoucherProduct(item, category.slug)
  },

  async getDetail(id: string): Promise<VoucherDetailData> {
    const existing = voucherDetailPromises.get(id)
    if (existing) return existing

    const request = (async () => {
      const [detailRes, categoryMap] = await Promise.all([
        api.get<ApiEnvelope<{
          voucher: BackendVoucherProduct
          branches: BackendVoucherBranch[]
          reviews: BackendReviewList
        }>>(`/voucher-products/${id}/detail`),
        getCategoryMap(),
      ])
      const detail = extractData(detailRes)
      const voucherProduct = detail.voucher
      const category = voucherProduct.categories ?? categoryFromMap(categoryMap, voucherProduct.category_id)

      const current = mapVoucherProduct(voucherProduct, category.slug)
      const reviewList = detail.reviews
      const reviews = reviewList.items.map(mapReview).filter((item) => item.text)
      const branches = detail.branches.map(mapBranch)

      const conditions = parseStringArray(voucherProduct.terms_and_conditions)
      const usageInstructions = parseStringArray(voucherProduct.usage_instructions)

      return {
        voucher: {
          ...current,
          reviews: reviewList.pagination?.total ?? reviews.length,
          rating: reviewList.average_rating ?? 0
        },
        reviews,
        branches,
        conditions,
        usageInstructions,
        applicableArea: voucherProduct.applicable_area,
        partnerId: voucherProduct.partner_id,
        partnerName: voucherProduct.partners?.business_name ?? current.partnerName,
        categoryName: category.name
      }
    })()

    voucherDetailPromises.set(id, request)
    try {
      return await request
    } catch (error) {
      voucherDetailPromises.delete(id)
      throw error
    }
  },

  async listRelatedVouchers(params: { partnerId: string; excludeId: string; limit?: number }): Promise<Voucher[]> {
    const [categoryMap, relatedRes] = await Promise.all([
      getCategoryMap(),
      api.get<ApiEnvelope<BackendVoucherList>>("/voucher-products", {
        params: {
          page: 1,
          limit: params.limit ?? 4,
          partner_id: params.partnerId
        }
      })
    ])

    return extractData(relatedRes).items
      .filter((item) => item.id !== params.excludeId)
      .slice(0, 3)
      .map((item) => {
        const itemCategory = categoryFromMap(categoryMap, item.category_id)
        return mapVoucherProduct(item, itemCategory.slug)
      })
  },

  async listPendingVouchers(): Promise<BackendVoucherProduct[]> {
    const res = await api.get<ApiEnvelope<BackendVoucherList>>("/voucher-products", {
      params: { approval_status: "pending", page: 1, limit: 30 }
    })
    return extractData(res).items
  },

  async listApprovedVouchers(): Promise<BackendVoucherProduct[]> {
    const res = await api.get<ApiEnvelope<BackendVoucherList>>("/voucher-products", {
      params: { approval_status: "approved", page: 1, limit: 100 }
    })
    return extractData(res).items
  },

  async approveVoucher(voucherId: string) {
    const res = await api.patch<ApiEnvelope<BackendVoucherProduct>>(`/voucher-products/${voucherId}/approval`, {
      approval_status: "approved"
    })
    return extractData(res)
  },

  async rejectVoucher(voucherId: string, rejectReason: string) {
    const res = await api.patch<ApiEnvelope<BackendVoucherProduct>>(`/voucher-products/${voucherId}/approval`, {
      approval_status: "rejected",
      reject_reason: rejectReason
    })
    return extractData(res)
  },

  async updateVoucherStatus(voucherId: string, status: "active" | "paused") {
    const res = await api.patch<ApiEnvelope<BackendVoucherProduct>>(`/voucher-products/${voucherId}/status`, { status })
    return extractData(res)
  },
}
