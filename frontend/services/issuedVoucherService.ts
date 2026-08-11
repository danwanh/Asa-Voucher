import { api } from "./api"
import type { Complaint, IssuedVoucher, Order, Review } from "@/types"

type ApiData<T> = { data: T }

export interface IssuedVoucherResult {
  issued_voucher: {
    id: string
    voucher_code: string
    qr_code_payload: string
    status: string
    expired_date: string
    voucher_products?: { name?: string; thumbnail_url?: string }
  }
  redeemable: boolean
  reason: string | null
  eligible_branch_ids: string[]
}

function data<T>(response: { data: ApiData<T> }) {
  return response.data.data
}

type BackendRecord = Record<string, any>

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function mapFeedback(value: BackendRecord): { review?: Review; complaint?: Complaint } {
  const reviewValue = value.reviews?.[0]
  const complaintValue = value.complaints?.[0]
  return {
    review: reviewValue ? {
      id: String(reviewValue.id),
      issuedVoucherId: String(value.id),
      rating: Number(reviewValue.rating),
      comment: reviewValue.comment ?? null,
      mediaUrls: strings(reviewValue.media_urls),
      createdAt: reviewValue.created_at,
    } : undefined,
    complaint: complaintValue ? {
      id: String(complaintValue.id),
      issuedVoucherId: String(value.id),
      reason: String(complaintValue.reason),
      description: String(complaintValue.description ?? ""),
      evidenceUrls: strings(complaintValue.evidence_urls),
      status: complaintValue.status,
      resolutionNote: complaintValue.resolution_note,
      resolutionType: complaintValue.resolution_type,
      createdAt: complaintValue.created_at,
      resolvedAt: complaintValue.resolved_at,
    } : undefined,
  }
}

function mapMineVoucher(value: BackendRecord): Order {
  const item = value.order_items ?? {}
  const order = item.orders ?? {}
  const product = value.voucher_products ?? {}
  const feedback = mapFeedback(value)
  const issuedVoucher: IssuedVoucher = {
    id: String(value.id),
    code: String(value.voucher_code ?? ""),
    qrPayload: String(value.qr_code_payload ?? ""),
    status: value.status,
    expiredDate: value.expired_date,
    ...feedback,
  }
  const orderId = String(order.id ?? item.order_id ?? value.id)
  return {
    id: orderId,
    userId: String(order.user_id ?? value.owner_id),
    voucherId: String(value.voucher_product_id),
    voucherTitle: String(product.name ?? "Voucher"),
    partnerName: String(product.partners?.business_name ?? product.partner_id ?? ""),
    amount: Number(item.subtotal ?? order.total_amount ?? 0),
    status: order.status,
    paymentMethod: String(order.payment_method ?? ""),
    createdAt: order.created_at ?? value.issued_date,
    code: issuedVoucher.code,
    qrPayload: issuedVoucher.qrPayload,
    recipientId: String(order.recipient_id ?? value.owner_id),
    isGift: Boolean(order.is_gift),
    giverName: order.users?.full_name,
    items: [{
      id: String(item.id ?? `${orderId}-item`),
      voucherId: String(value.voucher_product_id),
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unit_price ?? 0),
      subtotal: Number(item.subtotal ?? 0),
      voucherTitle: String(product.name ?? "Voucher"),
      partnerName: String(product.partners?.business_name ?? product.partner_id ?? ""),
      issuedVouchers: [issuedVoucher],
    }],
  }
}

export const issuedVoucherService = {
  async listMine() {
    const response = await api.get<ApiData<{ items: BackendRecord[] }>>("/issued-vouchers", { params: { page: 1, limit: 100 } })
    return data<{ items: BackendRecord[] }>(response).items.map(mapMineVoucher)
  },

  async validate(code: string) {
    let payload: { voucher_code?: string; qr_code_payload?: string } = { voucher_code: code }
    try {
      const url = new URL(code)
      const voucherCode = url.searchParams.get("code")
      payload = voucherCode ? { voucher_code: voucherCode } : { qr_code_payload: code }
    } catch {
      // Manual input is a voucher code.
    }
    const response = await api.post("/issued-vouchers/validate", payload)
    return data<IssuedVoucherResult>(response)
  },

  async redeem(id: string, branchId: string) {
    const response = await api.post(`/issued-vouchers/${id}/redeem`, { branch_id: branchId })
    return data(response)
  },
}
