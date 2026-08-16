import { api } from "./api"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  message?: string
}

export type AppNotification = {
  id: string
  type: string
  title: string
  content: string | null
  ref_type: string | null
  ref_id: string | null
  is_read: boolean
  created_at: string
}

export type NotificationPage = {
  rows: AppNotification[]
  total: number
  unread_count: number
}

function extractData<T>(response: { data: ApiEnvelope<T> }): T {
  return response.data.data
}

export const notificationService = {
  async list(params?: { page?: number; limit?: number }): Promise<NotificationPage> {
    const res = await api.get<ApiEnvelope<NotificationPage>>("/notifications", {
      params: { page: params?.page ?? 1, limit: params?.limit ?? 50 },
    })
    return extractData(res)
  },

  async markAllRead(): Promise<void> {
    await api.patch("/notifications/read-all")
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`)
  },
}
