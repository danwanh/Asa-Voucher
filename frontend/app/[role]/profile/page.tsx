"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import App from "@/components/App"
import { useAuthStore } from "@/stores/authStore"
import type { Role } from "@/types"

const VALID_ROLES = new Set<Role>([
  "buyer",
  "partner_owner",
  "partner_voucher_staff",
  "partner_store_staff",
  "admin_content",
  "admin_operations",
  "admin_security",
])

export default function RoleProfilePage({ params }: { params: { role: string } }) {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!isInitialized) return
    if (!user) {
      router.replace("/login")
      return
    }

    if (!VALID_ROLES.has(params.role as Role) || user.role !== params.role) {
      router.replace(`/${user.role}/profile`)
    }
  }, [isInitialized, params.role, router, user])

  if (!isInitialized || !user || !VALID_ROLES.has(params.role as Role) || user.role !== params.role) {
    return <main className="flex min-h-screen items-center justify-center">Đang tải hồ sơ...</main>
  }

  return <App initialPage="profile" />
}
