"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { authService } from "@/services/authService"

function VerifyEmailContent() {
  const params = useSearchParams()
  const [state, setState] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    const token = params?.get("token")
    if (!token) {
      setState("error")
      return
    }
    authService.verifyEmail(token).then(() => setState("success")).catch(() => setState("error"))
  }, [params])

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F4F1DE] p-6">
      <section className="max-w-md w-full rounded-3xl bg-white p-8 text-center shadow-sm">
        {state === "loading" && <p>Đang xác thực email...</p>}
        {state === "success" && <><h1 className="text-2xl font-black text-[#3D405B]">Xác thực thành công</h1><p className="mt-3 text-[#6B7280]">Bạn có thể quay lại trang đăng nhập.</p><a className="mt-6 inline-block rounded-2xl bg-[#E07A5F] px-5 py-3 font-bold text-white" href="/">Đăng nhập</a></>}
        {state === "error" && <><h1 className="text-2xl font-black text-[#3D405B]">Liên kết không hợp lệ</h1><p className="mt-3 text-[#6B7280]">Liên kết đã hết hạn hoặc đã được sử dụng.</p><a className="mt-6 inline-block rounded-2xl bg-[#E07A5F] px-5 py-3 font-bold text-white" href="/">Quay lại</a></>}
      </section>
    </main>
  )
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<main className="min-h-screen flex items-center justify-center">Đang tải...</main>}><VerifyEmailContent /></Suspense>
}
