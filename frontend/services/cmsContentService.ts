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

export const cmsContentService = {
  async list(filters?: CmsContentFilters) {
    const res = await api.get<ApiData<{ rows: CmsContent[]; total: number }>>("/cms-contents", { params: filters })
    return data(res)
  },

  async create(input: {
    content_type: string
    title: string
    content?: string
    image_url?: string
    display_time?: string
    status?: string
    sort_order?: number
  }) {
    const res = await api.post<ApiData<CmsContent>>("/cms-contents", input)
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
}
