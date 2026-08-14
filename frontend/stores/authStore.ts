import { create } from "zustand"
import type { AppUser } from "@/types"
import { authService } from "@/services/authService"
import { onAccessTokenRefreshed, setAccessToken } from "@/services/api"

let initializePromise: Promise<void> | null = null

function clearLegacyAuthStorage() {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem("asa-auth")
  } catch {
    // Storage may be disabled; authentication no longer depends on it.
  }
}

clearLegacyAuthStorage()

interface AuthState {
  user: AppUser | null
  accessToken: string | null
  isLoading: boolean
  isInitialized: boolean
  initializationError: boolean

  login: (email: string, password: string) => Promise<void>
  register: (body: { email: string; password: string; confirm_password: string; full_name: string; phone?: string }) => Promise<AppUser>
  logout: () => Promise<void>
  clearSession: () => void
  initialize: () => Promise<void>
  setUser: (user: AppUser) => void
}

export const useAuthStore = create<AuthState>()(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isInitialized: false,
      initializationError: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const result = await authService.login(email, password)
          set({
           user: result.user,
           accessToken: result.accessToken,
            isLoading: false,
            isInitialized: true,
            initializationError: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (body) => {
        set({ isLoading: true })
        try {
          const user = await authService.register(body)
          set({ isLoading: false })
          return user
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        await authService.logout()
        set({ user: null, accessToken: null, isInitialized: true, initializationError: false })
      },

      clearSession: () => {
        setAccessToken(null)
        set({ user: null, accessToken: null, isInitialized: true, initializationError: false })
      },

      initialize: async () => {
        clearLegacyAuthStorage()
        if (get().isInitialized && !get().initializationError) return
        if (initializePromise) return initializePromise
        if (get().initializationError) set({ isInitialized: false, initializationError: false })

        initializePromise = (async () => {
          try {
            const session = await authService.refresh()
            set({ user: session.user, accessToken: session.accessToken, isInitialized: true, initializationError: false })
          } catch (error) {
            const status = (error as { response?: { status?: number } }).response?.status
            if (status === 401 || status === 403) {
              set({ user: null, accessToken: null, isInitialized: true, initializationError: false })
              setAccessToken(null)
            } else {
              set({ isInitialized: true, initializationError: true })
            }
          }
        })()

        try {
          await initializePromise
        } finally {
          initializePromise = null
        }
      },

      setUser: (user) => set({ user })
    })
)

onAccessTokenRefreshed((token) => {
  useAuthStore.setState(token ? { accessToken: token } : { accessToken: null, user: null })
})
