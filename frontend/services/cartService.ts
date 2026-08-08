import { api } from "./api"
import type { CartItem, Voucher, VoucherStatus } from "@/types"

type BackendVoucher = Record<string, unknown> & {
  id: string
  partner_id: string
  name: string
  description?: string | null
  thumbnail_url?: string | null
  original_price: number | string
  selling_price: number | string
  discount_rate?: number
  total_quantity: number
  remaining_quantity: number
  sale_start_date: string
  sale_end_date: string
  status: string
  approval_status: string
  partners?: { name?: string | null }
}

type BackendCartItem = {
  id: string
  quantity: number
  voucher_product_id: string
  voucher_products?: BackendVoucher
}

type BackendCart = { items?: BackendCartItem[] }

function extractData<T>(response: { data: { data: T } }): T {
  return response.data.data
}

function numberValue(value: number | string | undefined, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function mapStatus(voucher: BackendVoucher): VoucherStatus {
  if (voucher.approval_status !== "approved") return "locked"
  if (voucher.status === "active") return "active"
  if (voucher.status === "sold_out") return "sold_out"
  if (voucher.status === "expired") return "expired"
  if (voucher.status === "paused") return "locked"
  return "draft"
}

function mapVoucher(voucher: BackendVoucher): Voucher {
  const originalPrice = numberValue(voucher.original_price)
  const price = numberValue(voucher.selling_price)
  const quantity = numberValue(voucher.total_quantity)
  const remaining = numberValue(voucher.remaining_quantity)

  return {
    id: voucher.id,
    partnerId: voucher.partner_id,
    partnerName: String(voucher.partner_name ?? voucher.partners?.name ?? "Đối tác"),
    partnerLogo: "gift",
    title: voucher.name,
    category: String(voucher.category_id ?? "all"),
    discount: numberValue(voucher.discount_rate),
    discountType: "percent",
    minOrder: 0,
    price,
    originalPrice,
    validFrom: voucher.sale_start_date.slice(0, 10),
    validTo: voucher.sale_end_date.slice(0, 10),
    quantity,
    sold: Math.max(0, quantity - remaining),
    status: mapStatus(voucher),
    rating: 0,
    reviews: 0,
    description: voucher.description ?? "",
    image: voucher.thumbnail_url ?? "",
    tags: [],
  }
}

function mapCartItem(item: BackendCartItem): CartItem | null {
  if (!item.voucher_products) return null
  return {
    cartItemId: item.id,
    voucher: mapVoucher(item.voucher_products),
    qty: item.quantity,
  }
}

export const cartService = {
  async get(): Promise<CartItem[]> {
    const response = await api.get<{ data: BackendCart }>("/cart")
    const cart = extractData<BackendCart>(response)
    return (cart.items ?? []).map(mapCartItem).filter((item): item is CartItem => item !== null)
  },

  async add(voucherProductId: string, quantity = 1) {
    await api.post("/cart/items", { voucher_product_id: voucherProductId, quantity })
  },

  async update(cartItemId: string, quantity: number) {
    await api.patch(`/cart/items/${cartItemId}`, { quantity })
  },

  async remove(cartItemId: string) {
    await api.delete(`/cart/items/${cartItemId}`)
  },

  async clear() {
    await api.delete("/cart")
  },

  async checkout(recipientIdentifier: string, isGift: boolean, note?: string) {
    const response = await api.post<{ data: { id: string } }>("/cart/checkout", {
      payment_method: "vnpay",
      recipient_identifier: recipientIdentifier,
      is_gift: isGift,
      note,
    })
    return extractData<{ id: string }>(response)
  },
}
