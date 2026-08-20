import { api } from "./api"
import axios from "axios"
import type { Complaint, Review } from "@/types"

type Envelope<T> = { data: T; message?: string }

function unwrap<T>(response: { data: Envelope<T> }) {
  return response.data.data
}

export type ComplaintListItem = Complaint & {
  userId: string
  userName?: string
  orderId?: string
  orderCode?: string
  assignedTo?: string
  assignedToName?: string
  voucherName?: string
}

export type ComplaintDetail = ComplaintListItem & {
  responses: ComplaintResponse[]
  evidenceUrls: string[]
  customerName?: string
  customerEmail?: string
  payments?: {
    id: string
    method: string
    amount: number
    status: string
    transactionRef?: string
    refundRef?: string
    refundedAt?: string
  }[]
}

export type ComplaintResponse = {
  id: string
  complaintId: string
  respondedBy: string
  responderName?: string
  responderRole: string
  content: string
  createdAt: string
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

  async listComplaints(params?: { status?: string; order_id?: string; page?: number; limit?: number }) {
    const response = await api.get<Envelope<{ items: any[]; total: number; page: number; limit: number }>>("/complaints", { params })
    const data = unwrap(response)
    return {
      items: (data.items ?? []).map((c: any) => ({
        id: String(c.id),
        userId: String(c.user_id),
        userName: c.users?.full_name,
        customerEmail: c.users?.email,
        orderId: c.order_id ? String(c.order_id) : undefined,
        orderCode: c.orders?.order_code,
        issuedVoucherId: c.issued_voucher_id ? String(c.issued_voucher_id) : undefined,
        voucherName: c.issued_vouchers?.voucher_products?.name,
        reason: c.reason,
        description: c.description,
        evidenceUrls: Array.isArray(c.evidence_urls) ? c.evidence_urls : [],
        status: c.status,
        assignedTo: c.assigned_to ? String(c.assigned_to) : undefined,
        resolutionNote: c.resolution_note,
        resolutionTypes: Array.isArray(c.resolution_types) ? c.resolution_types : c.resolution_type ? [c.resolution_type] : [],
        createdAt: c.created_at,
        resolvedAt: c.resolved_at,
      })) as ComplaintListItem[],
      total: data.total ?? 0,
      page: data.page ?? 1,
      limit: data.limit ?? 20,
    }
  },

  async getComplaintDetail(id: string) {
    const response = await api.get<Envelope<any>>(`/complaints/${id}`)
    const c = unwrap(response)
    const responses = Array.isArray(c.complaint_responses) ? c.complaint_responses.map((r: any) => ({
      id: String(r.id),
      complaintId: String(r.complaint_id),
      respondedBy: String(r.responded_by),
      responderName: r.responder?.full_name,
      responderRole: r.responder_role,
      content: r.content,
      createdAt: r.created_at,
    })) : []

    const payments = Array.isArray(c.orders?.payments) ? c.orders.payments.map((p: any) => ({
      id: String(p.id),
      method: p.method,
      amount: Number(p.amount),
      status: p.status,
      transactionRef: p.transaction_ref,
      refundRef: p.refund_ref,
      refundedAt: p.refunded_at,
    })) : []

    return {
      id: String(c.id),
      userId: String(c.user_id),
      userName: c.users?.full_name,
      customerEmail: c.users?.email,
      orderId: c.order_id ? String(c.order_id) : undefined,
      orderCode: c.orders?.order_code,
      issuedVoucherId: c.issued_voucher_id ? String(c.issued_voucher_id) : undefined,
      voucherName: c.issued_vouchers?.voucher_products?.name,
      reason: c.reason,
      description: c.description,
      evidenceUrls: Array.isArray(c.evidence_urls) ? c.evidence_urls : [],
      status: c.status,
      assignedTo: c.assigned_to ? String(c.assigned_to) : undefined,
      resolutionNote: c.resolution_note,
      resolutionTypes: Array.isArray(c.resolution_types) ? c.resolution_types : c.resolution_type ? [c.resolution_type] : [],
      createdAt: c.created_at,
      resolvedAt: c.resolved_at,
      responses,
      payments,
    } as ComplaintDetail
  },

  async assignComplaint(id: string, assignedTo: string) {
    const response = await api.patch<Envelope<any>>(`/complaints/${id}/assign`, { assigned_to: assignedTo })
    return unwrap(response)
  },

  async resolveComplaint(id: string, input: { resolutionNote: string; resolutionTypes: string[] }) {
    const response = await api.patch<Envelope<any>>(`/complaints/${id}/resolve`, {
      resolution_note: input.resolutionNote,
      resolution_types: input.resolutionTypes,
    })
    return unwrap(response)
  },

  async closeComplaint(id: string) {
    const response = await api.delete<Envelope<any>>(`/complaints/${id}`)
    return unwrap(response)
  },

  async updateComplaint(id: string, data: { status?: string }) {
    const response = await api.patch<Envelope<any>>(`/complaints/${id}`, data)
    return unwrap(response)
  },

  async createComplaintResponse(complaintId: string, content: string) {
    const response = await api.post<Envelope<any>>(`/complaints/${complaintId}/responses`, { content })
    return unwrap(response)
  },

  async listComplaintResponses(complaintId: string) {
    const response = await api.get<Envelope<any[]>>(`/complaints/${complaintId}/responses`)
    return unwrap(response).map((r: any) => ({
      id: String(r.id),
      complaintId: String(r.complaint_id),
      respondedBy: String(r.responded_by),
      responderName: r.responder?.full_name,
      responderRole: r.responder_role,
      content: r.content,
      createdAt: r.created_at,
    })) as ComplaintResponse[]
  },

  async searchAdmins(query?: string) {
    const response = await api.get<Envelope<any[]>>("/complaints/admins/search", { params: { q: query } })
    return unwrap(response).map((u: any) => ({
      id: String(u.id),
      fullName: u.full_name,
      email: u.email,
      role: u.role,
    }))
  },

  async searchPartners(query?: string) {
    const response = await api.get<Envelope<any[]>>("/complaints/partners/search", { params: { q: query } })
    return unwrap(response).map((p: any) => ({
      id: String(p.id),
      businessName: p.business_name,
      representativeName: p.representative_user?.full_name,
      representativeEmail: p.representative_user?.email,
      representativePhone: p.representative_user?.phone,
    }))
  },
}
