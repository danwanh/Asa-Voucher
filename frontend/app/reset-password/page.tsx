"use client"

import { FormEvent, Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authService } from "@/services/authService"
import { LoadingState, LoadingSpinner } from "@/components/LoadingState"

function ResetPasswordContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError("Mật khẩu phải dài 8-64 ký tự và gồm chữ hoa, chữ thường, số, ký tự đặc biệt")
      return
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp")
      return
    }
    const token = params?.get("token")
    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ")
      return
    }
    setLoading(true)
    try {
      await authService.resetPassword(token, password, confirm)
      setMessage("Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.")
    } catch (requestError: unknown) {
      const err = requestError as { response?: { data?: { error?: { message?: string } } } }
      setError(err.response?.data?.error?.message ?? "Không thể đặt lại mật khẩu")
    } finally {
      setLoading(false)
    }
  }

  return (
      <main className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-6">
      <form onSubmit={submit} className="max-w-md w-full rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black text-[#3D405B]">Đặt lại mật khẩu</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Mật khẩu mới phải gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
        <input className="mt-6 w-full rounded-2xl border p-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu mới" />
        <input className="mt-3 w-full rounded-2xl border p-3" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Xác nhận mật khẩu" />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
         <button disabled={loading || Boolean(message)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E07A5F] py-3 font-bold text-white disabled:opacity-60">{loading && <LoadingSpinner size="sm" />}{loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</button>
        {message && <button type="button" onClick={() => router.push("/")} className="mt-3 w-full rounded-2xl border border-[#E07A5F] py-3 font-bold text-[#E07A5F]">Đăng nhập</button>}
      </form>
    </main>
  )
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordContent /></Suspense>
}
