import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ShoppingBag } from "lucide-react"
import { C, fmt } from "@/utils/constants"
import type { CartItem } from "@/types"
import { orderService, type RecipientLookup } from "@/services/orderService"
import { LoadingState } from "@/components/LoadingState"
import { CheckoutProductList } from "@/components/CheckoutProductList"
import { AppIcon } from "@/components/AppIcon"

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

export function CreateOrderPage({ cart, total, userName = "", userEmail = "", onCreateOrder, onBack, loading = false }: Props) {
  const [forSelf, setForSelf] = useState(true)
  const [form, setForm] = useState({ name: userName, identifier: userEmail, note: "" })
  const [lookupLoading, setLookupLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [candidate, setCandidate] = useState<RecipientLookup | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selfMatch, setSelfMatch] = useState(false)
  const lookupRequest = useRef(0)
  const identifierWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const requestId = ++lookupRequest.current
    const identifier = form.identifier.trim()
    if (forSelf || identifier.length < 3) {
      setLookupLoading(false)
      return
    }
    if (identifier.toLowerCase() === userEmail.trim().toLowerCase()) {
      setLookupLoading(false)
      setCandidate(null)
      setSelfMatch(true)
      setErrors((current) => ({ ...current, identifier: "Không thể tặng voucher cho chính mình" }))
      return
    }
    const timer = window.setTimeout(() => {
      setLookupLoading(true)
      void orderService.lookupRecipient(identifier).then((recipient) => {
        if (requestId !== lookupRequest.current) return
        setSelfMatch(false)
        setCandidate(recipient)
        setDropdownOpen(true)
        setErrors((current) => ({ ...current, identifier: "" }))
      }).catch((error) => {
        if (requestId !== lookupRequest.current) return
        const code = (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code
        setCandidate(null)
        setDropdownOpen(false)
        if (code === "RECIPIENT_IS_SELF") {
          setSelfMatch(true)
          setErrors((current) => ({ ...current, identifier: "Không thể tặng voucher cho chính mình" }))
        } else {
          setErrors((current) => ({ ...current, identifier: "Không tìm thấy tài khoản người nhận" }))
        }
      }).finally(() => {
        if (requestId === lookupRequest.current) setLookupLoading(false)
      })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [forSelf, form.identifier, userEmail])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (identifierWrapRef.current && !identifierWrapRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v, ...(k === "identifier" && !forSelf ? { name: "" } : {}) }))
    setErrors((e) => ({ ...e, [k]: "" }))
    if (k === "identifier") {
      setCandidate(null)
      setSelfMatch(false)
      setDropdownOpen(true)
    }
  }

  const selectCandidate = (found: RecipientLookup) => {
    setForm((f) => ({ ...f, name: found.full_name }))
    setCandidate(found)
    setSelfMatch(false)
    setDropdownOpen(false)
    setErrors((e) => ({ ...e, identifier: "" }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.identifier.trim()) e.identifier = "Vui lòng nhập email hoặc số điện thoại người nhận"
    if (!forSelf && selfMatch) e.identifier = "Không thể tặng voucher cho chính mình"
    if (!forSelf && !selfMatch && !form.name.trim()) e.identifier = "Vui lòng chọn người nhận từ danh sách"
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
    return <LoadingState label="Đang tải sản phẩm đã chọn..." variant="page" />
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
    <div className="max-w-5xl mx-auto px-4 py-8">
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

      <div className="space-y-6">
        <CheckoutProductList
          products={cart.map((item) => ({
            id: item.voucher.id,
            title: item.voucher.title,
            partner: item.voucher.partnerName,
            quantity: item.qty,
            unitPrice: item.voucher.price,
            subtotal: item.voucher.price * item.qty,
            image: item.voucher.image,
          }))}
          title="Sản phẩm trong đơn hàng"
        />

        {/* Recipient form */}
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
                    setCandidate(null)
                    setSelfMatch(false)
                    setDropdownOpen(false)
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
                   <div ref={identifierWrapRef} className="relative">
                     <label className="block text-sm font-bold mb-1" style={{ color: C.indigo }}>Email hoặc số điện thoại người nhận *</label>
                     <input
                       type="text"
                       value={form.identifier}
                       onChange={(e) => set("identifier", e.target.value)}
                       onFocus={() => setDropdownOpen(Boolean(candidate) && !selfMatch)}
                       placeholder="email@example.com hoặc 0912345678"
                       className={inputCls}
                       style={{ borderColor: errors.identifier ? "#EF4444" : "#E5E7EB", fontFamily: "'Inter', sans-serif" }}
                     />
                     {errors.identifier && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.identifier}</p>}

                     {dropdownOpen && candidate && !lookupLoading && !selfMatch && (
                       <div
                         role="listbox"
                         aria-label="Kết quả tìm kiếm người nhận"
                         className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border bg-white shadow-lg"
                         style={{ borderColor: "#E5E7EB" }}
                       >
                         <button
                           type="button"
                           role="option"
                           aria-selected
                           onClick={() => selectCandidate(candidate)}
                           className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                         >
                           <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: C.eggshell }}>
                             <AppIcon name="user" className="h-4 w-4" style={{ color: C.indigo }} />
                           </div>
                           <div className="min-w-0 flex-1">
                             <div className="truncate text-sm font-bold" style={{ color: C.indigo }}>{candidate.full_name}</div>
                             <div className="truncate text-xs" style={{ color: "#8A8DA8" }}>{candidate.email || candidate.phone}</div>
                           </div>
                           <AppIcon name="check" className="h-4 w-4 flex-shrink-0" style={{ color: C.teal }} />
                         </button>
                       </div>
                     )}
                   </div>

                   <div className="rounded-xl px-4 py-3 min-h-[72px] flex flex-col justify-center" style={{ backgroundColor: C.eggshell }}>
                     <div className="text-xs" style={{ color: "#8A8DA8" }}>Người được tặng</div>
                     <div className="font-bold mt-1 truncate" style={{ color: C.indigo, lineHeight: "1.5rem" }}>
                       {lookupLoading ? "Đang tìm tài khoản..." : selfMatch ? "Chính bạn" : form.name || "Chưa xác định"}
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

        {/* Order totals and action */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-black/5 shadow-sm">
            <div className="mb-4">
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
              disabled={submitting || lookupLoading || !cart.length}
              aria-busy={submitting}
              className="w-full py-3.5 rounded-2xl font-black text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              style={{ backgroundColor: C.peach }}
            >
              <ShoppingBag className="w-4 h-4" />
              {submitting ? "Đang tạo đơn hàng..." : lookupLoading ? "Đang xác minh người nhận..." : "Tạo đơn hàng"}
            </button>
            <p className="text-xs text-center mt-2" style={{ color: "#9CA3AF" }}>
              Đơn hàng → Trạng thái: Chờ thanh toán
            </p>
          </div>
      </div>
    </div>
  )
}
