import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { C, fmt } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Order } from "@/types"
import { toast } from "sonner"

type PaymentMethod = "vnpay" | "paypal"

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { id: "vnpay", label: "VNPay", icon: "creditCard", desc: "Thẻ ATM / Internet Banking" },
  { id: "paypal", label: "PayPal", icon: "wallet", desc: "Thanh toán qua PayPal Sandbox" },
]

interface Props {
  total: number
  orderId: string
  order?: Order
  onPay: (method: PaymentMethod) => Promise<void>
  onBack: () => void
  canPay?: boolean
}

const FALLBACK = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop"

export function PaymentPage({ total, order, orderId, onPay, onBack, canPay = true }: Props) {
  const [payment, setPayment] = useState<PaymentMethod>("vnpay")
  const [processing, setProcessing] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  const expiresAt = order?.paymentExpiresAt ? new Date(order.paymentExpiresAt).getTime() : undefined
  const expired = now !== null && expiresAt !== undefined && expiresAt <= now
  const payableStatus = order?.status === "pending_payment" || order?.status === "payment_failed"
  const remainingSeconds = expiresAt && now !== null ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : undefined

  useEffect(() => {
    if (!expiresAt) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  const handlePay = async () => {
    if (!canPay || !payableStatus || expired) return
    setProcessing(true)
    try {
      await onPay(payment)
    } catch (error) {
      const apiError = error as { response?: { data?: { error?: { message?: string } } } }
      toast.error(apiError.response?.data?.error?.message ?? "Giao dịch không thành công, vui lòng kiểm tra lại phương thức thanh toán")
      setProcessing(false)
    }
  }

  if (processing) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center animate-spin"
          style={{ border: `3px solid ${C.peach}`, borderTopColor: "transparent" }}
        />
        <div className="font-black text-lg" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
          Đang xử lý thanh toán...
        </div>
        <div className="text-sm mt-2" style={{ color: "#6B7280" }}>Vui lòng không tắt trang</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline"
        style={{ color: C.indigo }}
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại (đơn hàng vẫn được lưu)
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-6" style={{ color: "#9CA3AF" }}>
        <span>Giỏ hàng</span>
        <span>›</span>
        <span>Tạo đơn hàng</span>
        <span>›</span>
        <span className="font-bold" style={{ color: C.indigo }}>Thanh toán</span>
      </div>

      {/* Pending order banner */}
      <div
        className="mb-5 p-4 rounded-2xl border-2 flex items-center gap-3"
        style={{ borderColor: C.apricot, backgroundColor: C.apricot + "18" }}
      >
        <AppIcon name="clock" className="w-5 h-5" />
        <div>
          <div className="text-sm font-bold" style={{ color: C.indigo }}>Mã đơn hàng: #{orderId}</div>
          <div className="text-xs mt-0.5 font-semibold" style={{ color: expired ? "#DC2626" : "#D97706" }}>
            {expired
              ? "Đơn hàng đã hết thời hạn thanh toán"
              : remainingSeconds !== undefined
                ? `Còn ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")} để thanh toán`
                : "Trạng thái: Chờ thanh toán"}
          </div>
        </div>
        <div className="ml-auto text-xs px-2 py-1 rounded-full font-bold" style={{ backgroundColor: C.apricot + "30", color: "#D97706" }}>
          PENDING
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Payment methods */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
            <h2
              className="font-black text-lg mb-4"
              style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}
            >
              Phương thức thanh toán
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setPayment(pm.id)}
                  className="flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all hover:shadow-sm"
                  style={{
                    borderColor: payment === pm.id ? C.peach : "#E5E7EB",
                    backgroundColor: payment === pm.id ? `${C.peach}10` : "white",
                  }}
                >
                  <AppIcon name={pm.icon} className="w-7 h-7" />
                  <div>
                    <div className="font-bold text-sm" style={{ color: C.indigo }}>{pm.label}</div>
                    <div className="text-xs" style={{ color: "#6B7280" }}>{pm.desc}</div>
                  </div>
                  {payment === pm.id && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" style={{ color: C.peach }} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm sticky top-20">
            <h2 className="font-black text-base mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
              Tóm tắt
            </h2>
            <div className="space-y-3 mb-4">
              {(order?.items ?? []).map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={FALLBACK}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold line-clamp-2 leading-tight" style={{ color: C.indigo }}>
                      {item.voucherTitle ?? "Voucher"}
                    </div>
                    <div className="text-xs" style={{ color: "#6B7280" }}>x{item.quantity}</div>
                  </div>
                  <div className="text-xs font-bold whitespace-nowrap" style={{ color: C.peach }}>
                    {fmt(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 mb-4" style={{ borderColor: "#E5E7EB" }}>
              <div className="flex justify-between font-black text-base" style={{ color: C.indigo }}>
                <span>Tổng cộng</span>
                <span style={{ color: C.peach }}>{fmt(total)}</span>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={!canPay || !payableStatus || expired}
              className="w-full py-3.5 rounded-2xl font-black text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: C.peach }}
            >
              {!canPay ? "Chỉ người đặt hàng được thanh toán" : expired ? "Đã hết hạn thanh toán" : !payableStatus ? "Đơn hàng không thể thanh toán" : `Thanh toán ngay — ${fmt(total)}`}
            </button>
            <p className="text-xs text-center mt-2" style={{ color: "#9CA3AF" }}>Bảo mật SSL 256-bit</p>
          </div>
        </div>
      </div>
    </div>
  )
}
