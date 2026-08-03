"use client"

import { useRouter } from "next/navigation"
import { LoginPage } from "@/pages/LoginPage"

export default function ForgotPasswordRoute() {
  const router = useRouter()

  return (
    <LoginPage
      onLogin={() => router.push("/")}
      onBack={() => router.push("/login")}
      initialPage="forgot"
    />
  )
}
