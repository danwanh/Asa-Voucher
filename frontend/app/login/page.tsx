"use client"

import { useRouter } from "next/navigation"
import { LoginPage } from "@/pages/LoginPage"

export default function LoginRoute() {
  const router = useRouter()

  return (
    <LoginPage
      onLogin={() => router.push("/")}
      onBack={() => router.push("/")}
      initialPage="login"
    />
  )
}
