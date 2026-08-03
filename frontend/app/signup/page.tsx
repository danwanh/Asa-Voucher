"use client"

import { useRouter } from "next/navigation"
import { LoginPage } from "@/pages/LoginPage"

export default function SignupRoute() {
  const router = useRouter()

  return (
    <LoginPage
      onLogin={() => router.push("/")}
      onBack={() => router.push("/")}
      initialPage="register"
    />
  )
}
