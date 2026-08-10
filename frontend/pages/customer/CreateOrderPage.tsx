import { useEffect, useState } from "react"
import { ArrowLeft, ShoppingBag } from "lucide-react"
import { C, fmt } from "@/utils/constants"
import type { CartItem } from "@/types"
import { orderService } from "@/services/orderService"

export interface RecipientInfo {
  name: string
  identifier: string
  note: string
  forSelf: boolean
}

interface Props {
  cart: CartItem[]
  total: number
  userName?: string
  userEmail?: string
  onCreateOrder: (info: RecipientInfo) => Promise<void>
  onBack: () => void
  loading?: boolean
}

const FALLBACK = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop"

export function CreateOrderPage({ cart, total, userName = "", userEmail = "", onCreateOrder, onBack, loading = false }: Props) {
  const [forSelf, setForSelf] = useState(true)
  const [form, setForm] = useState({ name: userName, identifier: userEmail, note: "" })
  const [lookupLoading, setLookupLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (forSelf || form.identifier.trim().length < 3) return
    const timer = window.setTimeout(() => {
      setLookupLoading(true)
      void orderService.lookupRecipient(form.identifier).then((recipient) => {
        setForm((current) => ({ ...current, name: String(recipient.full_name ?? "") }))
        setErrors((current) => ({ ...current, identifier: "" }))
      }).catch(() => {
        setForm((current) => ({ ...current, name: "" }))
        setErrors((current) => ({ ...current, identifier: "Không tìm thấy tài khoản người nhận" }))
      }).finally(() => setLookupLoading(false))
    }, 400)
    return () => window.clearTimeout(timer)
  }, [forSelf, form.identifier])

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: "" }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.identifier.trim()) e.identifier = "Vui lòng nhập email hoặc số điện thoại người nhận"
    if (!forSelf && !form.name.trim()) e.identifier = "Không tìm thấy tài khoản người nhận"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      await onCreateOrder({ ...form, forSelf })
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none transition-colors"

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8" role="status" aria-live="polite">
        <div className="h-5 w-40 rounded-lg bg-gray-200 animate-pulse mb-6" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-80 rounded-2xl bg-white animate-pulse" />
          <div className="h-64 rounded-2xl bg-white animate-pulse" />
        </div>
        <span className="sr-only">Đang tải sản phẩm đã chọn...</span>
      </div>
    )
  }

  if (!cart.length) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-14 h-14 mx-auto mb-4" style={{ color: C.peach }} />
        <h1 className="text-xl font-black" style={{ color: C.indigo }}>Không có sản phẩm được chọn</h1>
        <p className="mt-2 text-sm" style={{ color: "#6B7280" }}>Vui lòng quay lại giỏ hàng và chọn sản phẩm trước khi tạo đơn.</p>
        <button onClick={onBack} className="mt-6 px-6 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: C.peach }}>
          Quay lại giỏ hàng
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
        <ArrowLeft className="w-4 h-4" /> Quay lại giỏ hàng
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-6" style={{ color: "#9CA3AF" }}>
        <span>Giỏ hàng</span>
        <span>›</span>
        <span className="font-bold" style={{ color: C.indigo }}>Tạo đơn hàng</span>
        <span>›</span>
        <span>Thanh toán</span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Recipient form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
            <h2 className="font-black text-lg mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
              Thông tin người nhận
            </h2>

            {/* Self/Gift toggle */}
            <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ backgroundColor: C.eggshell }}>
              {[
                { label: "Mua cho bản thân", val: true },
                { label: "Tặng người khác", val: false },
              ].map((t) => (
                <button
                  key={String(t.val)}
                  onClick={() => {
                    setForSelf(t.val)
                    setForm((current) => ({
                      ...current,
                      name: t.val ? userName : "",
                      identifier: t.val ? userEmail : "",
                    }))
                    setErrors({})
                  }}
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

             <div className="grid gap-4">
               {!forSelf && (
                 <>
                   <div>
                     <label className="block text-sm font-bold mb-1" style={{ color: C.indigo }}>Email hoặc số điện thoại người nhận *</label>
                     <input
                       type="text"
                       value={form.identifier}
                       onChange={(e) => set("identifier", e.target.value)}
                       placeholder="email@example.com hoặc 0912345678"
                       className={inputCls}
                       style={{ borderColor: errors.identifier ? "#EF4444" : "#E5E7EB", fontFamily: "'Inter', sans-serif" }}
                     />
                     {errors.identifier && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.identifier}</p>}
                   </div>

                   <div className="rounded-xl px-4 py-3" style={{ backgroundColor: C.eggshell }}>
                     <div className="text-xs" style={{ color: "#8A8DA8" }}>Người được tặng</div>
                     <div className="font-bold mt-1" style={{ color: C.indigo }}>
                       {lookupLoading ? "Đang tìm tài khoản..." : form.name || "Chưa xác định"}
                     </div>
                   </div>
                 </>
               )}

               <div className="sm:col-span-2">
                <label className="block text-sm font-bold mb-1" style={{ color: C.indigo }}>Ghi chú</label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => set("note", e.target.value)}
                  placeholder="Yêu cầu đặc biệt (nếu có)..."
                  className={inputCls + " resize-none"}
                  style={{ borderColor: "#E5E7EB", fontFamily: "'Inter', sans-serif" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Order summary sidebar */}
        <div>
          <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm sticky top-20">
            <h2 className="font-black text-base mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
              Tóm tắt đơn hàng
            </h2>
            <div className="space-y-3 mb-4">
              {cart.map((item) => (
                <div key={item.voucher.id} className="flex items-start gap-3">
                  <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.voucher.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold line-clamp-2 leading-tight" style={{ color: C.indigo }}>
                      {item.voucher.title}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>x{item.qty}</div>
                  </div>
                  <div className="text-xs font-bold whitespace-nowrap" style={{ color: C.peach }}>
                    {fmt(item.voucher.price * item.qty)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 mb-4" style={{ borderColor: "#E5E7EB" }}>
              <div className="flex justify-between text-sm mb-1" style={{ color: "#6B7280" }}>
                <span>Tạm tính</span><span>{fmt(total)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1" style={{ color: "#6B7280" }}>
                <span>Phí dịch vụ</span><span style={{ color: C.teal }}>Miễn phí</span>
              </div>
              <div className="flex justify-between font-black text-base pt-2 border-t mt-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>
                <span>Tổng cộng</span>
                <span style={{ color: C.peach }}>{fmt(total)}</span>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={submitting || !cart.length}
              aria-busy={submitting}
              className="w-full py-3.5 rounded-2xl font-black text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              style={{ backgroundColor: C.peach }}
            >
              <ShoppingBag className="w-4 h-4" />
              {submitting ? "Đang tạo đơn hàng..." : "Tạo đơn hàng"}
            </button>
            <p className="text-xs text-center mt-2" style={{ color: "#9CA3AF" }}>
              Đơn hàng → Trạng thái: Chờ thanh toán
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
