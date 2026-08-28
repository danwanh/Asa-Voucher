"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { LoginPage } from "@/pages/LoginPage"
import type { AppUser } from "@/types"
import { getRoleLandingPath } from "@/utils/roleRoutes"

export default function LoginRoute() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams?.get("next")
  const destination = next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/"

  const handleLogin = (user: AppUser) => {
    const hasRequestedDestination = Boolean(next)
    const shouldPreserveDestination = user.role === "buyer" && hasRequestedDestination
    router.replace(shouldPreserveDestination ? destination : getRoleLandingPath(user.role))
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      onBack={() => router.push("/")}
      initialPage="login"
    />
  )
}
