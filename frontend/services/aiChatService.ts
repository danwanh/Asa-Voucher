import { api } from "./api"

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export type ChatRole = "user" | "assistant"

export type ChatVoucher = {
  id: string
  name: string
  partnerName: string | null
  sellingPrice: number
  originalPrice: number
  discountRate: number
  applicableArea: string | null
  imageUrl: string | null
  averageRating: number
  reviewCount: number
}

export type VoucherChatReply = {
  reply: string
  vouchers: ChatVoucher[]
}

type BackendChatVoucher = {
  id: string
  name: string
  partner_name: string | null
  selling_price: number
  original_price: number
  discount_rate: number
  applicable_area: string | null
  image_url: string | null
  average_rating: number
  review_count: number
}

export const aiChatService = {
  async askVoucherChat(messages: Array<{ role: ChatRole; content: string }>): Promise<VoucherChatReply> {
    const res = await api.post<ApiEnvelope<{ reply: string; vouchers: BackendChatVoucher[] }>>(
      "/ai/voucher-chat",
      { messages },
      { timeout: 60_000 } // backend may try several fallback models
    )
    const data = res.data.data
    return {
      reply: data.reply,
      vouchers: data.vouchers.map((voucher) => ({
        id: voucher.id,
        name: voucher.name,
        partnerName: voucher.partner_name,
        sellingPrice: Number(voucher.selling_price),
        originalPrice: Number(voucher.original_price),
        discountRate: Math.round(voucher.discount_rate),
        applicableArea: voucher.applicable_area,
        imageUrl: voucher.image_url,
        averageRating: voucher.average_rating,
        reviewCount: voucher.review_count
      }))
    }
  }
}
