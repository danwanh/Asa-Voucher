import { api } from "./api"
import type { IssuedVoucher, Order, OrderItem, Payment } from "@/types"

type BackendRecord = Record<string, any>

function data<T>(response: { data: { data: T } }) {
  return response.data.data
}

function num(value: unknown) {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function mapIssuedVoucher(value: BackendRecord): IssuedVoucher {
  return {
    id: String(value.id),
    code: String(value.voucher_code ?? value.code ?? ""),
    qrPayload: String(value.qr_code_payload ?? value.qrPayload ?? ""),
    status: value.status,
    expiredDate: value.expired_date,
  }
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
    partnerName: voucher.partners?.name,
    issuedVouchers: (value.issued_vouchers ?? []).map(mapIssuedVoucher),
  }
}

export function mapOrder(value: BackendRecord): Order {
  const items: OrderItem[] = (value.order_items ?? value.items ?? []).map((item: BackendRecord) => mapOrderItem(item))
  const first = items[0]
  const issued = items.flatMap((item) => item.issuedVouchers ?? [])
  return {
    id: String(value.id),
    userId: String(value.user_id),
    voucherId: first?.voucherId ?? "",
    voucherTitle: first?.voucherTitle ?? "Đơn hàng voucher",
    partnerName: first?.partnerName ?? "",
    amount: num(value.total_amount),
    status: value.status,
    paymentMethod: String(value.payment_method ?? ""),
    createdAt: value.created_at,
    code: issued[0]?.code ?? String(value.order_code ?? value.id),
    qrPayload: issued[0]?.qrPayload,
    paymentStatus: value.payment_status,
    recipientId: value.recipient_id,
    isGift: Boolean(value.is_gift),
    giverName: value.users?.full_name,
    paymentExpiresAt: value.payment_expires_at,
    items,
  }
}

export const orderService = {
  async lookupRecipient(identifier: string) {
    const response = await api.get("/users/recipient-lookup", { params: { identifier } })
    return data<BackendRecord>(response)
  },

  async createFromCart(input: { cartItemIds?: string[]; recipientIdentifier: string; isGift: boolean; note?: string; paymentMethod?: "vnpay" | "paypal"; expectedPrices?: Record<string, number> }) {
    const response = await api.post("/orders", {
      cart_item_ids: input.cartItemIds,
      recipient_identifier: input.recipientIdentifier,
      is_gift: input.isGift,
      expected_prices: input.expectedPrices,
      payment_method: input.paymentMethod ?? "vnpay",
      note: input.note,
    })
    return mapOrder(data<BackendRecord>(response))
  },

  async list() {
    const response = await api.get("/orders")
    return data<BackendRecord[]>(response).map(mapOrder)
  },

  async get(id: string) {
    const response = await api.get(`/orders/${id}`)
    return mapOrder(data<BackendRecord>(response))
  },

  async cancel(id: string) {
    const response = await api.patch(`/orders/${id}/cancel`)
    return mapOrder(data<BackendRecord>(response))
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
