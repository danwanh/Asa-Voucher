import axios, { type AxiosRequestConfig } from "axios"

export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api"

let accessToken: string | null = null
let tokenRefreshHandler: ((token: string | null) => void) | null = null
let refreshPromise: Promise<{ accessToken: string; user: unknown }> | null = null
let sessionMutationActive = false
let sessionMutationTail = Promise.resolve()

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

export function refreshSession() {
  if (refreshPromise) return refreshPromise
  if (sessionMutationActive) return Promise.reject(new Error("Session update is in progress"))

  refreshPromise = (async () => {
    const { data } = await axios.post(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true, timeout: 15_000 }
    )
    const session = { accessToken: data.data.access_token as string, user: data.data.user as unknown }
    setAccessToken(session.accessToken)
    tokenRefreshHandler?.(session.accessToken)
    return session
  })().catch((error) => {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if (status === 401 || status === 403) {
      setAccessToken(null)
      tokenRefreshHandler?.(null)
    }
    throw error
  }).finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

export function runSessionMutation<T>(operation: () => Promise<T>) {
  const run = sessionMutationTail.then(async () => {
    if (refreshPromise) {
      try {
        await refreshPromise
      } catch {
        // Login and logout must continue after an expired or unavailable refresh.
      }
    }
    sessionMutationActive = true
    try {
      return await operation()
    } finally {
      sessionMutationActive = false
    }
  })
  sessionMutationTail = run.then(() => undefined, () => undefined)
  return run
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
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = error.response?.status
    const errorCode = error.response?.data?.error?.code

    // Handle 403 USER_INACTIVE - account locked/deactivated
    if (status === 403 && errorCode === "USER_INACTIVE") {
      setAccessToken(null)
      tokenRefreshHandler?.(null)
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
      return Promise.reject(error)
    }

    if (!originalRequest || status !== 401 || originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error)
    }

    originalRequest._retry = true
    try {
      const session = await refreshSession()
      originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${session.accessToken}` }
      return api(originalRequest)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  }
)
