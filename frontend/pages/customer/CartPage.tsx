import { useState } from "react"
import { Plus, Minus, Trash2, AlertTriangle, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import { C, fmt } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { CartItem } from "@/types"
import { isVoucherAvailable } from "@/hooks/useCart"

const FALLBACK = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop"

interface Props {
  cart: CartItem[]
  total: number
  onRemove: (id: string) => void
  onUpdate: (id: string, qty: number) => void
  onCheckout: () => void
  onContinue: () => void
}

export function CartPage({ cart, total, onRemove, onUpdate, onCheckout, onContinue }: Props) {
  const [pendingDelete, setPendingDelete] = useState<CartItem | null>(null)
  const [quantityDraft, setQuantityDraft] = useState<Record<string, string>>({})

  const handleRemove = (id: string) => {
    onRemove(id)
    setPendingDelete(null)
  }

  const commitQuantity = (id: string, currentQty: number, available: number) => {
    const value = Number(quantityDraft[id] ?? currentQty)
    if (!Number.isInteger(value) || value < 1) {
      setQuantityDraft((prev) => ({ ...prev, [id]: String(currentQty) }))
      return
    }
    if (value > available) {
      toast.error("Số lượng yêu cầu vượt quá số lượng voucher còn lại trong kho")
      setQuantityDraft((prev) => ({ ...prev, [id]: String(currentQty) }))
      return
    }
    setQuantityDraft((prev) => ({ ...prev, [id]: String(value) }))
    if (value !== currentQty) onUpdate(id, value)
  }

  const hasUnavailable = cart.some((item) => !isVoucherAvailable(item.voucher))

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AppIcon name="shoppingCart" className="w-16 h-16 mb-4 mx-auto" />
        <h2 className="text-xl font-black mb-2" style={{ color: C.indigo }}>Giỏ hàng trống</h2>
        <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>Hãy khám phá và thêm voucher bạn yêu thích vào giỏ hàng</p>
        <button onClick={onContinue} className="px-6 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: C.peach }}>
          Mua sắm ngay
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo }}>Giỏ hàng ({cart.length} sản phẩm)</h1>

      {/* E2 warning banner */}
      {hasUnavailable && (
        <div
          className="mb-4 p-4 rounded-2xl border-2 flex items-start gap-3"
          style={{ borderColor: "#EF4444", backgroundColor: "#FEF2F2" }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
          <div>
            <div className="font-bold text-sm" style={{ color: "#B91C1C" }}>
              Một số voucher trong giỏ hàng không còn khả dụng
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#DC2626" }}>
              Vui lòng xóa voucher không khả dụng trước khi tiến hành đặt hàng.
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Items */}
        <div className="md:col-span-2 space-y-3">
          {cart.map(({ voucher: v, qty }) => {
            const isUnavailable = !isVoucherAvailable(v)
            return (
              <div
                key={v.id}
                className="bg-card rounded-2xl p-4 flex gap-4 shadow-sm"
                style={{
                  border: isUnavailable ? "2px solid #EF4444" : "2px solid transparent",
                  opacity: isUnavailable ? 0.78 : 1,
                }}
              >
                <img
                  src={v.image}
                  alt={v.title}
                  className="w-20 h-16 rounded-xl object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className={`font-bold text-sm leading-snug line-clamp-2 flex-1 ${isUnavailable ? "line-through" : ""}`} style={{ color: C.indigo }}>{v.title}</p>
                    {isUnavailable && (
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}>
                        Không khả dụng
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>{v.partnerName}</p>

                  {isUnavailable ? (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs" style={{ color: "#DC2626" }}>
                        Voucher đã hết hàng hoặc bị gỡ
                      </span>
                      <button
                        onClick={() => setPendingDelete({ voucher: v, qty })}
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
                        style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
                      >
                        <Trash2 className="w-3 h-3" /> Xóa
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-extrabold text-sm" style={{ color: C.peach }}>{fmt(v.price * qty)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (qty > 1) {
                              setQuantityDraft((prev) => ({ ...prev, [v.id]: String(qty - 1) }))
                              onUpdate(v.id, qty - 1)
                            } else {
                              setPendingDelete({ voucher: v, qty })
                            }
                          }}
                          className="w-7 h-7 rounded-xl flex items-center justify-center border transition-colors"
                          style={{ borderColor: "#E2DFC8" }}
                        >
                          <Minus className="w-3 h-3" style={{ color: C.indigo }} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={v.quantity - v.sold}
                          value={quantityDraft[v.id] ?? String(qty)}
                          onChange={(event) => setQuantityDraft((prev) => ({ ...prev, [v.id]: event.target.value }))}
                          onBlur={() => commitQuantity(v.id, qty, v.quantity - v.sold)}
                          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur() }}
                          aria-label={`Số lượng ${v.title}`}
                          className="w-12 h-7 rounded-xl border text-center text-sm font-bold outline-none"
                          style={{ borderColor: "#E2DFC8", color: C.indigo }}
                        />
                        <button
                          onClick={() => {
                             const available = v.quantity - v.sold
                            if (qty >= available) {
                              toast.error("Số lượng yêu cầu vượt quá số lượng voucher còn lại trong kho")
                              return
                            }
                            setQuantityDraft((prev) => ({ ...prev, [v.id]: String(qty + 1) }))
                            onUpdate(v.id, qty + 1)
                          }}
                          className="w-7 h-7 rounded-xl flex items-center justify-center border transition-colors"
                          style={{ borderColor: "#E2DFC8" }}
                        >
                          <Plus className="w-3 h-3" style={{ color: C.indigo }} />
                        </button>
                        <button onClick={() => setPendingDelete({ voucher: v, qty })} className="w-7 h-7 rounded-xl flex items-center justify-center ml-1 hover:bg-red-50" aria-label={`Xóa ${v.title}`}>
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "#C0392B" }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

        </div>

        {/* Order summary + checkout */}
        <div className="bg-card rounded-2xl p-5 shadow-sm h-fit sticky top-24">
          <h2 className="font-black mb-4" style={{ color: C.indigo }}>Tóm tắt đơn hàng</h2>

          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span style={{ color: "#8A8DA8" }}>Tạm tính</span>
              <span className="font-semibold" style={{ color: C.indigo }}>{fmt(total)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#8A8DA8" }}>Phí dịch vụ</span>
              <span className="font-semibold" style={{ color: C.teal }}>Miễn phí</span>
            </div>
            <div className="flex justify-between font-black text-base border-t pt-3 mt-1" style={{ borderColor: "#E2DFC8" }}>
              <span style={{ color: C.indigo }}>Tổng cộng</span>
              <span style={{ color: C.peach }}>{fmt(total)}</span>
            </div>
          </div>

          {hasUnavailable ? (
            <div className="space-y-2">
              <div
                className="w-full py-3.5 rounded-2xl font-bold text-center text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
              >
                <AlertTriangle className="w-4 h-4" />
                Xóa voucher không khả dụng
              </div>
              <p className="text-xs text-center" style={{ color: "#DC2626" }}>
                Giỏ hàng có voucher không thể mua. Hãy xóa trước khi tiếp tục.
              </p>
            </div>
          ) : (
            <button
              onClick={onCheckout}
              className="w-full py-3.5 rounded-2xl font-bold text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
              style={{ backgroundColor: C.peach }}
            >
              <ShoppingBag className="w-4 h-4" />
              Tiến hành đặt hàng
            </button>
          )}

          <button onClick={onContinue} className="w-full text-xs text-center mt-3 hover:underline" style={{ color: "#8A8DA8" }}>
            Tiếp tục mua sắm
          </button>
        </div>
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delete-cart-item-title">
            <h2 id="delete-cart-item-title" className="text-lg font-black" style={{ color: C.indigo }}>Xóa voucher khỏi giỏ hàng?</h2>
            <p className="mt-2 text-sm" style={{ color: "#8A8DA8" }}>Bạn có chắc muốn xóa “{pendingDelete.voucher.title}” không?</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setPendingDelete(null)} className="flex-1 rounded-2xl border-2 py-3 font-bold" style={{ borderColor: "#E2DFC8", color: C.indigo }}>Hủy</button>
              <button onClick={() => handleRemove(pendingDelete.voucher.id)} className="flex-1 rounded-2xl py-3 font-bold text-white" style={{ backgroundColor: "#C0392B" }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
