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
  rating: number
  comment: string | null
  created_at: string
}

type BackendReviewList = {
  items: BackendReview[]
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

function mapStatus(status: string, remaining: number, validTo: string): Voucher["status"] {
  if (remaining <= 0) return "sold_out"
  if (new Date(validTo) < new Date()) return "expired"
  if (status === "active") return "active"
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
    partnerName: product.partner_id,
    partnerLogo: "gift",
    title: product.name,
    category: categorySlug,
    discount,
    discountType: "percent",
    minOrder: 0,
    price,
    originalPrice,
    validFrom: product.sale_start_date,
    validTo: product.sale_end_date,
    quantity: product.total_quantity,
    sold,
    status: mapStatus(product.status, product.remaining_quantity, product.sale_end_date),
    rating: 0,
    reviews: 0,
    description: product.description ?? "",
    image: product.thumbnail_url ?? "",
    tags: []
  }
}

function mapReview(review: BackendReview): VoucherPublicReview {
  return {
    id: review.id,
    name: "Khách hàng",
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
  async listPublicVouchers(params?: { page?: number; limit?: number; search?: string }): Promise<Voucher[]> {
    const [categoryMap, listRes] = await Promise.all([
      getCategoryMap(),
      api.get<ApiEnvelope<BackendVoucherList>>("/voucher-products", {
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 100,
          search: params?.search
        }
      })
    ])

    const list = extractData(listRes).items
    return list.map((item) => {
      const category = categoryFromMap(categoryMap, item.category_id)
      return mapVoucherProduct(item, category.slug)
    })
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
    const reviews = extractData(reviewsRes).items.map(mapReview).filter((item) => item.text)
    const branches = extractData(branchesRes).map(mapBranch)

    const conditions = parseStringArray(voucherProduct.terms_and_conditions)
    const usageInstructions = parseStringArray(voucherProduct.usage_instructions)

    return {
      voucher: {
        ...current,
        reviews: reviews.length,
        rating: reviews.length === 0 ? 0 : Number((reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1))
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
