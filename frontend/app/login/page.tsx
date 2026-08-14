"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { LoginPage } from "@/pages/LoginPage"

export default function LoginRoute() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams?.get("next")
  const destination = next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/"

  return (
    <LoginPage
      onLogin={() => router.push(destination)}
      onBack={() => router.push("/")}
      initialPage="login"
    />
  )
}
