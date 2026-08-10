import type { AppUser } from "@/types"
import { api, setAccessToken, BASE_URL } from "./api"
import axios from "axios"

type BackendUser = Record<string, unknown> & {
  id: string
  email: string
  role: string
  full_name?: string
  name?: string
  partnerId?: string | null
  branchId?: string | null
}

function normalizeRole(role: string): AppUser["role"] {
  if (role === "admin_account") return "admin_operations"
  return role as AppUser["role"]
}

function mapUser(u: BackendUser): AppUser {
  return {
    id: u.id,
    email: u.email,
    name: (u.full_name ?? u.name ?? "") as string,
    role: normalizeRole(u.role),
    partnerId: u.partnerId ?? undefined,
    branchId: u.branchId ?? undefined
  }
}

function extractData<T>(response: { data: { success: boolean; data: T } }): T {
  return response.data.data
}

export const authService = {
  async login(identifier: string, password: string) {
    const res = await api.post("/auth/login", { identifier, password })
    const data = extractData<{ access_token: string; user: BackendUser }>(res)
    setAccessToken(data.access_token)
    return { accessToken: data.access_token, user: mapUser(data.user) }
  },

  async register(body: { email: string; password: string; confirm_password: string; full_name: string; phone?: string }) {
    const res = await api.post("/auth/register", body)
    const user = extractData<BackendUser>(res)
    return mapUser(user)
  },

  async registerPartner(body: {
    email: string; password: string; confirm_password: string; full_name: string; phone?: string
    business_name: string; business_type?: string; tax_number: string; website_url?: string; description?: string
  }) {
    const res = await api.post("/auth/register-partner", body)
    const data = extractData<{ user: BackendUser; partner: Record<string, unknown> }>(res)
    return { user: mapUser(data.user), partner: data.partner }
  },

  async verifyEmail(token: string) {
    await api.post("/auth/verify-email", { token })
  },

  async resendVerification(email: string) {
    await api.post("/auth/resend-verification", { email })
  },

  async forgotPassword(identifier: string) {
    await api.post("/auth/forgot-password", { identifier })
  },

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    await api.post("/auth/reset-password", { token, new_password: newPassword, confirm_password: confirmPassword })
  },

  async getProfile(id: string) {
    const res = await api.get(`/users/${id}`)
    return extractData<BackendUser & Record<string, unknown>>(res)
  },

  async updateProfile(id: string, body: Record<string, unknown>) {
    const res = await api.patch(`/users/${id}`, body)
    return extractData<BackendUser & Record<string, unknown>>(res)
  },

  async getPartner(id: string) {
    const res = await api.get(`/partners/${id}`)
    return extractData<Record<string, any>>(res)
  },

  async updatePartner(id: string, body: Record<string, unknown>) {
    const res = await api.patch(`/partners/${id}`, body)
    return extractData<Record<string, any>>(res)
  },

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    await api.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword })
  },

  async logout() {
    try {
      await api.post("/auth/logout")
    } finally {
      setAccessToken(null)
    }
  },

  async refresh() {
    const res = await axios.post(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    )
    const data = extractData<{ access_token: string; user: BackendUser }>(res)
    setAccessToken(data.access_token)
    return { accessToken: data.access_token, user: mapUser(data.user) }
  },

  async getMe() {
    const res = await api.get("/auth/me")
    const user = extractData<BackendUser>(res)
    return mapUser(user)
  }
}
