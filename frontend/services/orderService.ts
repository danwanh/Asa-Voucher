import { api } from "./api"
import type { Complaint, IssuedVoucher, Order, OrderItem, OrderListItem, Payment, Review, ReviewTarget } from "@/types"
import { useAuthStore } from "@/stores/authStore"

type BackendRecord = Record<string, any>

export interface RecipientLookup {
  id: string
  full_name: string
  email: string
  phone: string | null
}

function data<T>(response: { data: { data: T } }) {
  return response.data.data
}

function num(value: unknown) {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function mapReview(value: BackendRecord): Review {
  return {
    id: String(value.id),
    issuedVoucherId: value.issued_voucher_id,
    rating: Number(value.rating),
    comment: value.comment ?? null,
    mediaUrls: strings(value.media_urls),
    createdAt: value.created_at,
  }
}

function mapComplaint(value: BackendRecord): Complaint {
  return {
    id: String(value.id),
    issuedVoucherId: value.issued_voucher_id,
    reason: String(value.reason),
    description: String(value.description ?? ""),
    evidenceUrls: strings(value.evidence_urls),
    status: value.status,
    resolutionNote: value.resolution_note,
    resolutionTypes: strings(value.resolution_types),
    createdAt: value.created_at,
    resolvedAt: value.resolved_at,
  }
}

function mapIssuedVoucher(value: BackendRecord): IssuedVoucher {
  const review = Array.isArray(value.reviews) ? value.reviews[0] : value.reviews
  return {
    id: String(value.id),
    code: String(value.voucher_code ?? value.code ?? ""),
    qrPayload: String(value.qr_code_payload ?? value.qrPayload ?? ""),
    status: value.status,
    expiredDate: value.expired_date,
    review: review ? mapReview(review) : undefined,
    complaint: Array.isArray(value.complaints) && value.complaints[0] ? mapComplaint(value.complaints[0]) : undefined,
  }
}

function mapPayment(value: BackendRecord): Payment {
  const method: "vnpay" | "paypal" = value.method === "paypal" ? "paypal" : "vnpay"
  const result: any = {
    id: String(value.id),
    orderId: String(value.order_id),
    method,
    amount: num(value.amount),
    status: value.status,
    paidAt: value.paid_at,
    transactionRef: value.transaction_ref,
    refundRef: value.refund_ref,
    refundedAt: value.refunded_at,
    gatewayResponse: value.gateway_response,
    createdAt: value.created_at,
  }

  return result as Payment
}

function mapOrderItem(value: BackendRecord): OrderItem {
  const voucher = value.voucher_products ?? {}
  return {
    id: String(value.id),
    voucherId: String(value.voucher_product_id),
    quantity: num(value.quantity),
    unitPrice: num(value.unit_price),
    subtotal: num(value.subtotal),
    voucherTitle: voucher.name,
    partnerName: voucher.partners?.business_name,
    image: voucher.thumbnail_url,
    issuedVouchers: (value.issued_vouchers ?? []).map(mapIssuedVoucher),
  }
}

export function mapOrder(value: BackendRecord): Order {
  const items: OrderItem[] = (value.order_items ?? value.items ?? []).map((item: BackendRecord) => mapOrderItem(item))
  const first = items[0]
  const issued = items.flatMap((item) => item.issuedVouchers ?? [])
  const allPartnerNames = [...new Set(items.map((item) => item.partnerName).filter((name): name is string => Boolean(name)))]
  const payments = Array.isArray(value.payments) ? value.payments.map(mapPayment) : []
  const unpaidPayment = payments.find((p) => p.status === "pending" || p.status === "processing")
  const paidPayment = payments.find((p) => p.status === "success")
  const refundedPayment = payments.find((p) => p.status === "refunded")
  const failedPayment = payments.length > 0 && payments.every((p) => p.status === "failed")
  return {
    id: String(value.id),
    userId: String(value.user_id),
    userName: value.users?.full_name,
    orderCode: String(value.order_code ?? value.code ?? value.id),
    voucherId: first?.voucherId ?? "",
    voucherTitle: first?.voucherTitle ?? "Đơn hàng voucher",
    partnerName: allPartnerNames.length === 0
      ? ""
      : allPartnerNames.length === 1
        ? allPartnerNames[0]
        : allPartnerNames.join(", "),
    amount: num(value.total_amount),
    status: value.status,
    paymentStatus: value.payment_status ?? (refundedPayment ? "refunded" : paidPayment ? "paid" : unpaidPayment ? "pending" : failedPayment ? "failed" : "pending"),
    paymentMethod: String(value.payment_method ?? ""),
    refundRef: refundedPayment?.refundRef,
    refundedAt: refundedPayment?.refundedAt,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    code: String(value.order_code ?? value.id),
    qrPayload: issued[0]?.qrPayload,
    recipientId: value.recipient_id,
    isGift: Boolean(value.is_gift),
    giverName: value.users?.full_name,
    complaints: Array.isArray(value.complaints) ? value.complaints.map(mapComplaint) : [],
    paymentExpiresAt: value.payment_expires_at,
    items,
    payments,
    note: value.note ?? null,
  }
}

function mapOrderListItem(value: BackendRecord): OrderListItem {
  const items = (value.order_items ?? []).map((item: BackendRecord) => ({
    voucherId: String(item.voucher_product_id),
    quantity: num(item.quantity),
    voucherTitle: String(item.voucher_products?.name ?? "Voucher"),
    partnerName: String(item.voucher_products?.partners?.business_name ?? ""),
    issuedCount: num(item.issued_voucher_count ?? item._count?.issued_vouchers),
    hasReview: Boolean(item.has_review),
  }))
  const first = items[0]
  const partnerNames = [...new Set<string>(items.map((item: { partnerName: string }) => item.partnerName).filter(Boolean))]

  return {
    id: String(value.id),
    userId: String(value.user_id),
    userName: value.users?.full_name,
    orderCode: String(value.order_code ?? value.id),
    code: String(value.order_code ?? value.id),
    voucherId: first?.voucherId ?? "",
    voucherTitle: first?.voucherTitle ?? "Đơn hàng voucher",
    partnerName: partnerNames.join(", "),
    amount: num(value.total_amount),
    status: value.status,
    paymentStatus: value.payment_status ?? "pending",
    paymentMethod: String(value.payment_method ?? ""),
    createdAt: value.created_at,
    recipientId: value.recipient_id,
    isGift: Boolean(value.is_gift),
    paymentExpiresAt: value.payment_expires_at,
    hasComplaint: Boolean(value.has_complaint),
    items,
  }
}

export type OrderListPage = {
  items: OrderListItem[]
  page: number
  limit: number
  total: number
  totalPages: number
  countsByStatus: OrderStatusCounts
  countsByPaymentStatus: OrderPaymentStatusCounts
}

export type OrderStatusCounts = Partial<Record<Order["status"] | "all", number>>
export type OrderPaymentStatusCounts = Partial<Record<Order["paymentStatus"] | "all", number>>

const orderDetailRequests = new Map<string, Promise<Order>>()
const orderListRequests = new Map<string, Promise<OrderListPage>>()
const orderDetailCache = new Map<string, { value: Order; expiresAt: number }>()
const orderListCache = new Map<string, { value: OrderListPage; expiresAt: number }>()
const CACHE_TTL_MS = 15_000
let cacheVersion = 0

export const orderService = {
  async lookupRecipient(identifier: string): Promise<RecipientLookup> {
    const response = await api.get("/users/recipient-lookup", { params: { identifier } })
    const value = data<BackendRecord>(response)
    return {
      id: String(value.id),
      full_name: String(value.full_name ?? ""),
      email: String(value.email ?? ""),
      phone: value.phone ? String(value.phone) : null,
    }
  },

  async createFromCart(input: { cartItemIds?: string[]; items?: Array<{ voucherId: string; quantity: number }>; recipientIdentifier: string; isGift: boolean; note?: string; paymentMethod?: "vnpay" | "paypal"; expectedPrices?: Record<string, number> }) {
    const response = await api.post("/orders", {
      cart_item_ids: input.cartItemIds,
      items: input.items?.map((item) => ({ voucher_product_id: item.voucherId, quantity: item.quantity })),
      recipient_identifier: input.recipientIdentifier,
      is_gift: input.isGift,
      expected_prices: input.expectedPrices,
      payment_method: input.paymentMethod ?? "vnpay",
      note: input.note,
    })
    this.invalidate()
    return mapOrder(data<BackendRecord>(response))
  },

  async list(params?: { status?: string; payment_status?: string; search?: string; page?: number; limit?: number }): Promise<OrderListPage> {
    const requestParams = { ...params, page: params?.page ?? 1, limit: params?.limit ?? 20 }
    const key = `${useAuthStore.getState().user?.id ?? "anonymous"}:${JSON.stringify(requestParams)}`
    const cached = orderListCache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    if (cached) orderListCache.delete(key)
    const existing = orderListRequests.get(key)
    if (existing) return existing
    const requestVersion = cacheVersion

    const request = api.get("/orders", { params: requestParams }).then((response) => {
      const result = data<{
        items: BackendRecord[]
        pagination: { page: number; limit: number; total: number; total_pages: number }
        countsByStatus?: OrderStatusCounts
        countsByPaymentStatus?: OrderPaymentStatusCounts
      }>(response)
      const value = {
        items: result.items.map(mapOrderListItem),
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.total_pages,
        countsByStatus: result.countsByStatus ?? { all: result.pagination.total },
        countsByPaymentStatus: result.countsByPaymentStatus ?? { all: result.pagination.total },
      }
      if (requestVersion === cacheVersion) orderListCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
      return value
    }).finally(() => {
      if (orderListRequests.get(key) === request) orderListRequests.delete(key)
    })
    orderListRequests.set(key, request)
    return request
  },

  async listOrders(params?: { status?: string; payment_status?: string; search?: string }) {
    return this.list(params)
  },

  async get(id: string, options?: { force?: boolean }) {
    const key = `${useAuthStore.getState().user?.id ?? "anonymous"}:${id}`
    if (options?.force) {
      cacheVersion += 1
      orderDetailCache.delete(key)
    }
    const cached = orderDetailCache.get(key)
    if (!options?.force && cached && cached.expiresAt > Date.now()) return cached.value
    if (cached) orderDetailCache.delete(key)
    const existing = orderDetailRequests.get(key)
    if (!options?.force && existing) return existing
    const requestVersion = cacheVersion

    const request = api.get(`/orders/${id}`)
      .then((response) => {
        const value = mapOrder(data<BackendRecord>(response))
        if (requestVersion === cacheVersion) orderDetailCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
        return value
      })
      .finally(() => {
        if (orderDetailRequests.get(key) === request) orderDetailRequests.delete(key)
      })
    orderDetailRequests.set(key, request)
    return request
  },

  async getOrder(id: string) {
    return this.get(id)
  },

  invalidate(orderId?: string) {
    cacheVersion += 1
    orderDetailRequests.clear()
    orderListRequests.clear()
    if (orderId) {
      for (const key of orderDetailCache.keys()) {
        if (key.endsWith(`:${orderId}`)) orderDetailCache.delete(key)
      }
    } else {
      orderDetailCache.clear()
    }
    orderListCache.clear()
  },

  async getReviewTargets(orderId: string): Promise<ReviewTarget[]> {
    const response = await api.get(`/orders/${orderId}/review-targets`)
    const result = data<{ order_items: BackendRecord[] }>(response)
    return result.order_items.flatMap((item) => {
      const product = item.voucher_product ?? {}
      return (item.issued_vouchers ?? []).map((target: BackendRecord) => ({
        id: String(target.issued_voucher_id),
        voucherId: String(item.voucher_product_id),
        voucherTitle: String(product.name ?? "Voucher"),
        partnerName: String(product.partners?.business_name ?? ""),
        image: product.thumbnail_url ?? undefined,
        amount: num(item.unit_price),
        reviewable: Boolean(target.reviewable),
        review: target.review ? mapReview(target.review) : undefined,
      }))
    })
  },

  async cancel(id: string) {
    const response = await api.patch(`/orders/${id}/cancel`)
    this.invalidate(id)
    return mapOrder(data<BackendRecord>(response))
  },

  async cancelOrder(id: string) {
    return this.cancel(id)
  },

  async refundOrder(id: string, reason?: string) {
    const response = await api.patch(`/orders/${id}/refund`, { reason })
    this.invalidate(id)
    return mapOrder(data<BackendRecord>(response))
  },

  async updateOrder(id: string, input: { status?: string; note?: string }) {
    const response = await api.patch(`/orders/${id}`, input)
    this.invalidate(id)
    return mapOrder(data<BackendRecord>(response))
  },

  async createPayment(orderId: string, method: string) {
    const response = await api.post(`/orders/${orderId}/payments`, { method })
    return data<BackendRecord>(response)
  },

  async simulatePaymentSuccess(paymentId: string) {
    const response = await api.patch(`/payments/${paymentId}/simulate-success`)
    return data<BackendRecord>(response)
  },

  async simulatePaymentFailed(paymentId: string) {
    const response = await api.patch(`/payments/${paymentId}/simulate-failed`)
    return data<BackendRecord>(response)
  },
}

export const paymentService = {
  async create(orderId: string, method: "vnpay" | "paypal") {
    const response = await api.post(`/orders/${orderId}/payments`, { method })
    return data<Payment & { checkout_url: string }>(response)
  },

  async simulateSuccess(paymentId: string) {
    const response = await api.patch(`/payments/${paymentId}/simulate-success`)
    return data<BackendRecord>(response)
  },

  async simulateFailed(paymentId: string) {
    const response = await api.patch(`/payments/${paymentId}/simulate-failed`)
    return data<BackendRecord>(response)
  },
}
