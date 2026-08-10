import axios, { type AxiosRequestConfig } from "axios"

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  config: AxiosRequestConfig
}

export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api"

let accessToken: string | null = null
let isRefreshing = false
let pendingRequests: PendingRequest[] = []
let tokenRefreshHandler: ((token: string | null) => void) | null = null

function isAuthEndpoint(url?: string) {
  return Boolean(url && /\/auth\/(login|register|register-partner|refresh|logout|forgot-password|reset-password|verify-email|resend-verification)/.test(url))
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function onAccessTokenRefreshed(handler: (token: string | null) => void) {
  tokenRefreshHandler = handler
}

export function getAccessToken() {
  return accessToken
}

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
})

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject, config: originalRequest })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      const newToken = data.data.access_token
      setAccessToken(newToken)
      tokenRefreshHandler?.(newToken)
      pendingRequests.forEach(({ resolve, config }) => {
        config.headers = { ...config.headers, Authorization: `Bearer ${newToken}` }
        resolve(api(config))
      })
      pendingRequests = []
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch (refreshError) {
      setAccessToken(null)
      tokenRefreshHandler?.(null)
      pendingRequests.forEach(({ reject }) => reject(refreshError))
      pendingRequests = []
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
