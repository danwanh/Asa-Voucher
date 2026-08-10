import { api } from "./api"
import axios from "axios"
import type { Complaint, Review } from "@/types"

type Envelope<T> = { data: T; message?: string }

function unwrap<T>(response: { data: Envelope<T> }) {
  return response.data.data
}

export const feedbackService = {
  async uploadImages(files: File[]) {
    if (files.length === 0) return []
    const signature = unwrap(await api.post<Envelope<{ cloud_name: string; api_key: string; timestamp: number; folder: string; signature: string }>>("/reviews/media/signature"))
    return Promise.all(files.map(async (file) => {
      const body = new FormData()
      body.append("file", file)
      body.append("api_key", signature.api_key)
      body.append("timestamp", String(signature.timestamp))
      body.append("folder", signature.folder)
      body.append("signature", signature.signature)
      const response = await axios.post<{ secure_url: string }>(`https://api.cloudinary.com/v1_1/${signature.cloud_name}/image/upload`, body)
      return response.data.secure_url
    }))
  },

  async createReview(input: { issuedVoucherId: string; rating: number; comment: string; mediaUrls?: string[] }) {
    const response = await api.post<Envelope<Review>>("/reviews", {
      issued_voucher_id: input.issuedVoucherId,
      rating: input.rating,
      comment: input.comment,
      media_urls: input.mediaUrls,
    })
    return unwrap(response)
  },

  async getReview(id: string) {
    return unwrap(await api.get<Envelope<Review>>(`/reviews/${id}`))
  },

  async createComplaint(input: { issuedVoucherId?: string; orderId?: string; reason: string; description: string; evidenceUrls?: string[] }) {
    const response = await api.post<Envelope<Complaint>>("/complaints", {
      ...(input.issuedVoucherId ? { issued_voucher_id: input.issuedVoucherId } : {}),
      ...(input.orderId ? { order_id: input.orderId } : {}),
      reason: input.reason,
      description: input.description,
      evidence_urls: input.evidenceUrls,
    })
    return unwrap(response)
  },

  async getComplaint(id: string) {
    return unwrap(await api.get<Envelope<Complaint>>(`/complaints/${id}`))
  },
}
