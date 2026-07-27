import { useState } from "react"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { C, fmt } from "@/utils/constants"
import type { CartItem } from "@/types"

interface Props {
  cart: CartItem[]
  total: number
  onSuccess: (code: string) => void
  onBack: () => void
}

type PaymentMethod = "vnpay" | "momo" | "zalopay" | "bank" | "qr"

const PAYMENT_METHODS = [
  { id: "vnpay" as PaymentMethod, label: "VNPay", icon: "💳", desc: "Thẻ ATM / Internet Banking" },
  { id: "momo" as PaymentMethod, label: "MoMo", icon: "🟣", desc: "Ví điện tử MoMo" },
  { id: "zalopay" as PaymentMethod, label: "ZaloPay", icon: "🔵", desc: "Ví điện tử ZaloPay" },
  { id: "bank" as PaymentMethod, label: "Thẻ ngân hàng", icon: "🏦", desc: "Visa / Mastercard / JCB" },
  { id: "qr" as PaymentMethod, label: "QR Banking", icon: "📱", desc: "Quét mã QR ngân hàng" },
]

export function CheckoutPage({ cart, total, onSuccess, onBack }: Props) {
  const [forSelf, setForSelf] = useState(true)
  const [payment, setPayment] = useState<PaymentMethod>("vnpay")
  const [step, setStep] = useState<"form" | "confirm" | "processing">("form")
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", note: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const tax = Math.round(total * 0.08)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Vui lòng nhập họ tên"
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Email không hợp lệ"
    if (!form.phone.trim() || !/^(0[3-9]\d{8})$/.test(form.phone)) e.phone = "Số điện thoại không hợp lệ"
    if (!forSelf && !form.address.trim()) e.address = "Vui lòng nhập địa chỉ"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setStep("confirm")
  }

  const handleConfirm = () => {
    setStep("processing")
    setTimeout(() => {
      const code = "ASA-" + Math.random().toString(36).slice(2, 9).toUpperCase()
      onSuccess(code)
    }, 1500)
  }

  if (step === "processing") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center animate-spin" style={{ border: `3px solid ${C.peach}`, borderTopColor: "transparent" }} />
        <div className="font-black text-lg" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Đang xử lý thanh toán...</div>
        <div className="text-sm mt-2" style={{ color: "#6B7280" }}>Vui lòng không tắt trang</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
        <ArrowLeft className="w-4 h-4" /> Quay lại giỏ hàng
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-6" style={{ color: "#9CA3AF" }}>
        <span>Giỏ hàng</span>
        <span>›</span>
        <span className="font-bold" style={{ color: C.indigo }}>Thanh toán</span>
        <span>›</span>
        <span>Xác nhận</span>
      </div>

      {step === "form" && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="md:col-span-2 space-y-5">
            {/* Receiver */}
            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <h2 className="font-black text-lg mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Thông tin người nhận</h2>

              {/* Tabs: self vs gift */}
              <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ backgroundColor: C.muted }}>
                {[{ label: "Mua cho bản thân", val: true }, { label: "Tặng người khác", val: false }].map((t) => (
                  <button
                    key={String(t.val)}
                    onClick={() => setForSelf(t.val)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                    style={{
                      backgroundColor: forSelf === t.val ? "white" : "transparent",
                      color: forSelf === t.val ? C.indigo : "#6B7280",
                      boxShadow: forSelf === t.val ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: "name", label: "Họ và tên *", placeholder: "Nguyễn Văn A", type: "text" },
                  { key: "email", label: "Email *", placeholder: "email@example.com", type: "email" },
                  { key: "phone", label: "Số điện thoại *", placeholder: "0912345678", type: "tel" },
                ].map((f) => (
                  <div key={f.key} className={f.key === "name" ? "sm:col-span-2" : ""}>
                    <label className="block text-sm font-bold mb-1" style={{ color: C.indigo }}>{f.label}</label>
                    <input
                      type={f.type}
                      value={form[f.key as keyof typeof form]}
                      onChange={(e) => { setForm({ ...form, [f.key]: e.target.value }); setErrors({ ...errors, [f.key]: "" }) }}
                      placeholder={f.placeholder}
                      className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none transition-colors"
                      style={{ borderColor: errors[f.key] ? "#EF4444" : "#E5E7EB" }}
                    />
                    {errors[f.key] && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors[f.key]}</p>}
                  </div>
                ))}

                {!forSelf && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold mb-1" style={{ color: C.indigo }}>Địa chỉ nhận *</label>
                    <textarea
                      rows={2}
                      value={form.address}
                      onChange={(e) => { setForm({ ...form, address: e.target.value }); setErrors({ ...errors, address: "" }) }}
                      placeholder="Địa chỉ giao voucher..."
                      className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none resize-none"
                      style={{ borderColor: errors.address ? "#EF4444" : "#E5E7EB" }}
                    />
                    {errors.address && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.address}</p>}
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold mb-1" style={{ color: C.indigo }}>Ghi chú</label>
                  <textarea
                    rows={2}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Yêu cầu đặc biệt (nếu có)..."
                    className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none resize-none"
                    style={{ borderColor: "#E5E7EB" }}
                  />
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-2xl p-6 border border-black/5">
              <h2 className="font-black text-lg mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Phương thức thanh toán</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPayment(pm.id)}
                    className="flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all"
                    style={{
                      borderColor: payment === pm.id ? C.peach : "#E5E7EB",
                      backgroundColor: payment === pm.id ? `${C.peach}10` : "white",
                    }}
                  >
                    <div className="text-2xl">{pm.icon}</div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: C.indigo }}>{pm.label}</div>
                      <div className="text-xs" style={{ color: "#6B7280" }}>{pm.desc}</div>
                    </div>
                    {payment === pm.id && <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: C.peach }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order summary */}
          <div>
            <div className="bg-white rounded-2xl p-5 border border-black/5 sticky top-20">
              <h2 className="font-black text-base mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Tóm tắt đơn hàng</h2>
              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item.voucher.id} className="flex items-start gap-3">
                    <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.voucher.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold line-clamp-2 leading-tight" style={{ color: C.indigo }}>{item.voucher.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>x{item.qty}</div>
                    </div>
                    <div className="text-xs font-bold whitespace-nowrap" style={{ color: C.peach }}>{fmt(item.voucher.price * item.qty)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between" style={{ color: "#6B7280" }}>
                  <span>Tạm tính</span><span>{fmt(total)}</span>
                </div>
                <div className="flex justify-between" style={{ color: "#6B7280" }}>
                  <span>Thuế (8%)</span><span>{fmt(tax)}</span>
                </div>
                <div className="flex justify-between font-black text-base border-t pt-2" style={{ color: C.indigo }}>
                  <span>Tổng cộng</span><span style={{ color: C.peach }}>{fmt(total + tax)}</span>
                </div>
              </div>
              <button
                onClick={handleSubmit}
                className="w-full mt-4 py-3.5 rounded-2xl font-black text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: C.peach }}
              >
                Tiến hành thanh toán
              </button>
              <p className="text-xs text-center mt-3" style={{ color: "#9CA3AF" }}>Bảo mật SSL 256-bit</p>
            </div>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4">
            <h2 className="font-black text-lg mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Xác nhận đơn hàng</h2>
            <div className="space-y-3 mb-4 text-sm">
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Người nhận</span><span className="font-semibold" style={{ color: C.indigo }}>{form.name}</span></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Email</span><span className="font-semibold" style={{ color: C.indigo }}>{form.email}</span></div>
              <div className="flex justify-between"><span style={{ color: "#6B7280" }}>SĐT</span><span className="font-semibold" style={{ color: C.indigo }}>{form.phone}</span></div>
              <div className="flex justify-between">
                <span style={{ color: "#6B7280" }}>Thanh toán</span>
                <span className="font-semibold" style={{ color: C.indigo }}>
                  {PAYMENT_METHODS.find((p) => p.id === payment)?.label}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3 font-black text-base">
                <span style={{ color: C.indigo }}>Tổng cộng</span>
                <span style={{ color: C.peach }}>{fmt(total + tax)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("form")} className="flex-1 py-3 rounded-2xl font-bold text-sm border-2" style={{ borderColor: C.indigo, color: C.indigo }}>
                Quay lại
              </button>
              <button onClick={handleConfirm} className="flex-1 py-3 rounded-2xl font-bold text-sm text-white" style={{ backgroundColor: C.peach }}>
                Xác nhận & Thanh toán
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
