import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AppUser } from "@/types"
import { authService } from "@/services/authService"
import { getAccessToken, onAccessTokenRefreshed, setAccessToken } from "@/services/api"

let initializePromise: Promise<void> | null = null

interface AuthState {
  user: AppUser | null
  accessToken: string | null
  isLoading: boolean
  isInitialized: boolean

  login: (email: string, password: string) => Promise<void>
  register: (body: { email: string; password: string; confirm_password: string; full_name: string; phone?: string }) => Promise<AppUser>
  logout: () => Promise<void>
  clearSession: () => void
  initialize: () => Promise<void>
  setUser: (user: AppUser) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isInitialized: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const result = await authService.login(email, password)
          set({
            user: result.user,
            accessToken: result.accessToken,
            isLoading: false
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
        set({ user: null, accessToken: null })
      },

      clearSession: () => {
        setAccessToken(null)
        set({ user: null, accessToken: null })
      },

      initialize: async () => {
        if (get().isInitialized) return
        if (initializePromise) return initializePromise

        initializePromise = (async () => {
          const token = getAccessToken() ?? get().accessToken
          if (!token) {
            set({ isInitialized: true })
            return
          }
          setAccessToken(token)
          try {
            const user = await authService.getMe()
            set({ user, accessToken: token, isInitialized: true })
          } catch {
            try {
              const result = await authService.refresh()
              set({ user: result.user, accessToken: result.accessToken, isInitialized: true })
            } catch {
              set({ user: null, accessToken: null, isInitialized: true })
              setAccessToken(null)
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
    }),
    {
      name: "asa-auth",
      partialize: (state) => ({ accessToken: state.accessToken })
    }
  )
)

onAccessTokenRefreshed((token) => {
  useAuthStore.setState({ accessToken: token })
})
