import { api } from "./api"
import type { CmsContent } from "@/types"

type ApiData<T> = { data: T }

function data<T>(response: { data: ApiData<T> }) {
  return response.data.data
}

export type CmsContentFilters = {
  content_type?: string
  status?: string
  page?: number
  limit?: number
}

export type CmsContentType = "banner" | "article" | "popup" | "policy"

export const cmsContentService = {
  async list(filters?: CmsContentFilters) {
    const res = await api.get<ApiData<{ rows: CmsContent[]; total: number }>>("/cms-contents", { params: filters })
    return data(res)
  },

  async listPublic(type: CmsContentType) {
    const res = await api.get<ApiData<CmsContent[]>>("/cms-contents/public", { params: { type } })
    return data(res)
  },

  async getById(id: string) {
    const res = await api.get<ApiData<CmsContent>>(`/cms-contents/${id}`)
    return data(res)
  },

  async create(input: {
    content_type: string
    title: string
    content?: string
    image_url?: string | null
    status?: string
  }) {
    const res = await api.post<ApiData<CmsContent>>("/cms-contents", input)
    return data(res)
  },

  async moveBanner(id: string, direction: "up" | "down") {
    const res = await api.patch<ApiData<{ id: string; direction: string }>>(`/cms-contents/${id}/move`, { direction })
    return data(res)
  },

  async movePopup(id: string, direction: "up" | "down") {
    const res = await api.patch<ApiData<{ id: string; direction: string }>>(`/cms-contents/${id}/move`, { direction })
    return data(res)
  },

  async update(id: string, input: Record<string, unknown>) {
    const res = await api.patch<ApiData<CmsContent>>(`/cms-contents/${id}`, input)
    return data(res)
  },

  async toggleStatus(id: string) {
    const res = await api.patch<ApiData<CmsContent>>(`/cms-contents/${id}/toggle-status`)
    return data(res)
  },

  async remove(id: string) {
    await api.delete(`/cms-contents/${id}`)
  },
}
