import { api } from "./api"

type Envelope<T> = { data: T; message?: string }
function unwrap<T>(response: { data: Envelope<T> }) { return response.data.data }

export interface SecurityAlertItem {
  id: string
  userId: string
  userName: string
  email: string
  alertType: string
  detail: string
  ipAddress: string
  status: string
  createdAt: string
}

export interface SecurityAlertListResult {
  items: SecurityAlertItem[]
  total: number
  page: number
  limit: number
}

export interface AdminLogItem {
  id: string
  adminId: string
  adminEmail?: string
  adminName?: string
  targetUserId?: string
  targetPartnerId?: string
  targetVoucherId?: string
  action: string
  description: string
  occurredAt: string
}

export interface AdminLogListResult {
  items: AdminLogItem[]
  total: number
  page: number
  limit: number
}

export const securityService = {
  async listAlerts(params?: { status?: string; alert_type?: string; page?: number; limit?: number }) {
    const response = await api.get<Envelope<SecurityAlertListResult>>("/security-alerts", { params })
    const data = unwrap(response)
    return {
      items: (data.items ?? []).map((a: any) => ({
        id: String(a.id),
        userId: String(a.user_id),
        userName: a.user?.full_name ?? "N/A",
        email: a.user?.email ?? "",
        alertType: a.alert_type,
        detail: a.detail ?? "",
        ipAddress: a.ip_address ?? "",
        status: a.status,
        createdAt: a.created_at,
      })),
      total: data.total,
      page: data.page,
      limit: data.limit,
    }
  },

  async getAlert(id: string): Promise<SecurityAlertItem> {
    const response = await api.get<Envelope<any>>(`/security-alerts/${id}`)
    const a = unwrap(response)
    return {
      id: String(a.id),
      userId: String(a.user_id),
      userName: a.users?.full_name ?? a.user?.full_name ?? "N/A",
      email: a.users?.email ?? a.user?.email ?? "",
      alertType: a.alert_type,
      detail: a.detail ?? "",
      ipAddress: a.ip_address ?? "",
      status: a.status,
      createdAt: a.created_at,
    }
  },

  async reviewAlert(id: string) {
    return unwrap(await api.patch<Envelope<any>>(`/security-alerts/${id}/review`))
  },

  async lockAccount(id: string) {
    return unwrap(await api.post<Envelope<any>>(`/security-alerts/${id}/lock`))
  },

  async unlockAccount(id: string) {
    return unwrap(await api.post<Envelope<any>>(`/security-alerts/${id}/unlock`))
  },

  async detectAnomalies() {
    return unwrap(await api.post<Envelope<any>>("/security-alerts/detect"))
  },

  async listAdminLogs(params?: { admin_id?: string; action?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) {
    const response = await api.get<Envelope<AdminLogListResult>>("/admin-logs", { params })
    const data = unwrap(response)
    return {
      items: (data.items ?? []).map((l: any) => ({
        id: String(l.id),
        adminId: String(l.admin_id),
        adminEmail: l.admin?.email ?? "",
        adminName: l.admin?.full_name ?? "",
        targetUserId: l.target_user_id ? String(l.target_user_id) : undefined,
        targetPartnerId: l.target_partner_id ? String(l.target_partner_id) : undefined,
        targetVoucherId: l.target_voucher_id ? String(l.target_voucher_id) : undefined,
        action: l.action,
        description: l.description ?? "",
        occurredAt: l.occurred_at,
      })),
      total: data.total,
      page: data.page,
      limit: data.limit,
    }
  },

  async getAdminLog(id: string): Promise<AdminLogItem> {
    const response = await api.get<Envelope<any>>(`/admin-logs/${id}`)
    const l = unwrap(response)
    return {
      id: String(l.id),
      adminId: String(l.admin_id),
      adminEmail: l.admin?.email ?? "",
      adminName: l.admin?.full_name ?? "",
      targetUserId: l.target_user_id ? String(l.target_user_id) : undefined,
      targetPartnerId: l.target_partner_id ? String(l.target_partner_id) : undefined,
      targetVoucherId: l.target_voucher_id ? String(l.target_voucher_id) : undefined,
      action: l.action,
      description: l.description ?? "",
      occurredAt: l.occurred_at,
    }
  },
}
