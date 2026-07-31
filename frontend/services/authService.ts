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

function mapUser(u: BackendUser): AppUser {
  return {
    id: u.id,
    email: u.email,
    name: (u.full_name ?? u.name ?? "") as string,
    role: u.role as AppUser["role"],
    partnerId: u.partnerId ?? undefined,
    branchId: u.branchId ?? undefined
  }
}

function extractData<T>(response: { data: { success: boolean; data: T } }): T {
  return response.data.data
}

export const authService = {
  async login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password })
    const data = extractData<{ access_token: string; user: BackendUser }>(res)
    setAccessToken(data.access_token)
    return { accessToken: data.access_token, user: mapUser(data.user) }
  },

  async register(body: { email: string; password: string; full_name: string; phone?: string }) {
    const res = await api.post("/auth/register", body)
    const user = extractData<BackendUser>(res)
    return mapUser(user)
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
