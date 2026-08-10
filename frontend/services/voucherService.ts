import { api } from "./api"
import type { Voucher } from "@/types"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  message?: string
}

type BackendVoucherProduct = {
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
}

type BackendCategory = {
  id: string
  name: string
  slug: string
}

type BackendVoucherList = {
  items: BackendVoucherProduct[]
  count: number
  page: number
  limit: number
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
  name: string
  address: string
}

export type VoucherDetailData = {
  voucher: Voucher
  reviews: VoucherPublicReview[]
  branches: VoucherApplicableBranch[]
  conditions: string[]
  usageInstructions: string[]
  applicableArea: string | null
  partnerId: string
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
    name: branch.branch_name,
    address: `${branch.address}${district}, ${branch.city}`
  }
}

function extractData<T>(response: { data: ApiEnvelope<T> }): T {
  return response.data.data
}

let categoryMapPromise: Promise<Map<string, BackendCategory>> | null = null

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
  async listPublicVouchers(params?: { page?: number; limit?: number; search?: string; categoryId?: string; partnerId?: string; area?: string }): Promise<Voucher[]> {
    const [categoryMap, listRes] = await Promise.all([
      getCategoryMap(),
      api.get<ApiEnvelope<BackendVoucherList>>("/voucher-products", {
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 100,
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
          limit: params?.limit ?? 100,
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
    return mapVoucherProduct(item, category.slug)
  },

  async assignBranch(voucherId: string, branchId: string): Promise<void> {
    await api.post(`/voucher-products/${voucherId}/branches`, { branch_id: branchId })
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
    const [categoryMap, voucherRes, branchesRes, reviewsRes] = await Promise.all([
      getCategoryMap(),
      api.get<ApiEnvelope<BackendVoucherProduct>>(`/voucher-products/${id}`),
      api.get<ApiEnvelope<BackendVoucherBranch[]>>(`/voucher-products/${id}/branches`),
      api.get<ApiEnvelope<BackendReviewList>>(`/voucher-products/${id}/reviews`, { params: { page: 1, limit: 6 } })
    ])

    const voucherProduct = extractData(voucherRes)
    const category = categoryFromMap(categoryMap, voucherProduct.category_id)

    const current = mapVoucherProduct(voucherProduct, category.slug)
    const reviewList = extractData(reviewsRes)
    const reviews = reviewList.items.map(mapReview).filter((item) => item.text)
    const branches = extractData(branchesRes).map(mapBranch)

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
      categoryName: category.name
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
  }
}
