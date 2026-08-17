import { api } from "./api"
import { voucherService, type HomepageSummary } from "./voucherService"

type ApiData<T> = { data: T }

function data<T>(response: { data: ApiData<T> }) {
  return response.data.data
}

export type AdminCategory = {
  id: string
  parent_id: string | null
  name: string
  slug: string
  description: string | null
  sort_order: number
}

export type CategoryWithCount = AdminCategory & { voucherCount: number }

export const categoryService = {
  async list(): Promise<AdminCategory[]> {
    const res = await api.get<ApiData<AdminCategory[]>>("/categories")
    return data(res)
  },

  async create(input: { name: string; slug: string; description?: string; sort_order?: number }) {
    const res = await api.post<ApiData<AdminCategory>>("/categories", input)
    return data(res)
  },

  async update(id: string, input: Partial<{ name: string; slug: string; description: string; sort_order: number }>) {
    const res = await api.patch<ApiData<AdminCategory>>(`/categories/${id}`, input)
    return data(res)
  },

  async remove(id: string) {
    await api.delete(`/categories/${id}`)
  },

  async listWithCounts(): Promise<CategoryWithCount[]> {
    const [categories, summary] = await Promise.all([
      this.list(),
      voucherService.getHomepageSummary(),
    ])
    const counts = new Map((summary as HomepageSummary).categoryCounts.map((item) => [item.categoryId, item.count]))
    return categories.map((category) => ({
      ...category,
      voucherCount: counts.get(category.id) ?? 0,
    }))
  },
}