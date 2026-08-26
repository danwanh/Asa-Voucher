"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { CheckCircle2, Clock3, XCircle } from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { orderService } from "@/services/orderService"
import type { Order } from "@/types"
import { LoadingState } from "@/components/LoadingState"
import { C, fmt } from "@/utils/constants"

type LoadError = "forbidden" | "not-found" | "unavailable"

export function PaymentResultPage({ orderId, callbackStatus }: { orderId?: string; callbackStatus?: string }) {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const initializationError = useAuthStore((state) => state.initializationError)
  const initialize = useAuthStore((state) => state.initialize)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [order, setOrder] = useState<Order | null>(null)
  const [loadError, setLoadError] = useState<LoadError | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)

  const resultPath = `/checkout/payment/result?orderId=${orderId ?? ""}&status=${callbackStatus ?? ""}`

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    if (!isInitialized || initializationError) return
    if (!user) {
      const next = encodeURIComponent(resultPath)
      router.replace(`/login?next=${next}`)
      return
    }
    if (!orderId) {
      setLoadError("not-found")
      return
    }
    setLoadError(null)
    void orderService.get(orderId, { force: true }).then(setOrder).catch((error) => {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      if (status === 401) {
        clearSession()
        router.replace(`/login?next=${encodeURIComponent(resultPath)}`)
        return
      }
      setLoadError(status === 403 ? "forbidden" : status === 404 ? "not-found" : "unavailable")
    })
  }, [isInitialized, initializationError, user, orderId, resultPath, router, clearSession, loadAttempt])

  if (!isInitialized || (user && !order && !loadError)) return <LoadingState label="Đang xác nhận kết quả thanh toán..." variant="page" />
  if (initializationError) return <main className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="text-xl font-black" style={{ color: C.indigo }}>Không thể khôi phục phiên đăng nhập</h1><p className="mt-2 text-sm" style={{ color: "#8A8DA8" }}>Vui lòng kiểm tra kết nối và thử lại.</p><button onClick={() => void initialize()} className="mt-6 rounded-2xl px-6 py-3 font-bold text-white" style={{ backgroundColor: C.peach }}>Thử lại</button></main>
  if (!user) return <LoadingState label="Đang chuyển đến đăng nhập..." variant="page" />

  const succeeded = order?.status === "confirmed"
  const refunded = order?.status === "refunded"
  const pending = order?.status === "pending_payment" || callbackStatus === "pending"
  const Icon = succeeded ? CheckCircle2 : pending || refunded ? Clock3 : XCircle
  const color = succeeded ? C.teal : refunded ? "#2563EB" : pending ? "#D97706" : "#DC2626"
  const title = succeeded ? "Thanh toán thành công" : refunded ? "Đơn hàng đã được hoàn tiền" : pending ? "Thanh toán đang được xử lý" : "Thanh toán chưa thành công"
  const description = succeeded
    ? order?.isGift ? "Voucher đã được phát hành cho người nhận." : "Voucher của bạn đã được phát hành."
    : refunded ? "Khoản thanh toán của đơn hàng này đã được hoàn lại."
      : pending ? "Hệ thống chưa nhận được xác nhận cuối cùng. Bạn có thể kiểm tra lại trong lịch sử đơn hàng."
      : "Giao dịch không hoàn tất. Bạn có thể thử thanh toán lại nếu đơn hàng còn hạn."
  const errorTitle = loadError === "forbidden" ? "Bạn không có quyền xem đơn hàng này" : loadError === "not-found" ? "Không tìm thấy đơn hàng" : "Không thể tải kết quả thanh toán"
  const errorDescription = loadError === "unavailable" ? "Kết nối đang gián đoạn. Vui lòng thử lại." : "Vui lòng mở lịch sử đơn hàng để kiểm tra trạng thái mới nhất."

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${color}18` }}>
        <Icon className="h-10 w-10" style={{ color }} />
      </div>
      <h1 className="text-2xl font-black" style={{ color: C.indigo }}>{loadError ? errorTitle : title}</h1>
      <p className="mt-2 text-sm" style={{ color: "#8A8DA8" }}>{loadError ? errorDescription : description}</p>
      {order && <div className="mt-6 rounded-2xl bg-white p-5 text-left shadow-sm"><div className="flex justify-between text-sm"><span style={{ color: "#8A8DA8" }}>Mã đơn</span><strong style={{ color: C.indigo }}>{order.orderCode ?? order.id}</strong></div><div className="mt-2 flex justify-between text-sm"><span style={{ color: "#8A8DA8" }}>Tổng tiền</span><strong style={{ color: C.peach }}>{fmt(order.amount)}</strong></div></div>}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        {loadError === "unavailable" && <button onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="flex-1 rounded-2xl py-3 font-bold text-white" style={{ backgroundColor: C.peach }}>Thử lại</button>}
        <button onClick={() => router.push("/orders")} className="flex-1 rounded-2xl border-2 py-3 font-bold" style={{ borderColor: C.peach, color: C.peach }}>Lịch sử đơn hàng</button>
        {order && <button onClick={() => router.push(`/orders/${order.id}`)} className="flex-1 rounded-2xl py-3 font-bold text-white" style={{ backgroundColor: C.peach }}>Xem chi tiết đơn</button>}
        {succeeded && order?.recipientId === user.id && <button onClick={() => router.push("/my-vouchers")} className="flex-1 rounded-2xl py-3 font-bold text-white" style={{ backgroundColor: C.teal }}>Voucher của tôi</button>}
      </div>
    </main>
  )
}
