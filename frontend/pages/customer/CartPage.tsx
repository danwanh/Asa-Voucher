import { useState } from "react"
import { Plus, Minus, Trash2, AlertTriangle, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import { C, fmt } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { CartItem } from "@/types"

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
  // E2: tracks which voucher IDs are currently unavailable (sold out / removed)
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set())

  const markUnavailable = (id: string) => {
    setUnavailableIds((prev) => new Set(prev).add(id))
    toast.warning("Một voucher trong giỏ hàng của bạn không còn khả dụng.", {
      description: "Vui lòng xóa voucher đó để tiếp tục thanh toán.",
    })
  }

  const handleRemove = (id: string) => {
    setUnavailableIds((prev) => { const s = new Set(prev); s.delete(id); return s })
    onRemove(id)
  }

  const hasUnavailable = cart.some((item) => unavailableIds.has(item.voucher.id))

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
            const isUnavailable = unavailableIds.has(v.id)
            return (
              <div
                key={v.id}
                className="bg-card rounded-2xl p-4 flex gap-4 shadow-sm"
                style={{
                  border: isUnavailable ? "2px solid #EF4444" : "2px solid transparent",
                  opacity: isUnavailable ? 0.85 : 1,
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
                    <p className="font-bold text-sm leading-snug line-clamp-2 flex-1" style={{ color: C.indigo }}>{v.title}</p>
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
                        onClick={() => handleRemove(v.id)}
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
                          onClick={() => qty > 1 ? onUpdate(v.id, qty - 1) : handleRemove(v.id)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center border transition-colors"
                          style={{ borderColor: "#E2DFC8" }}
                        >
                          <Minus className="w-3 h-3" style={{ color: C.indigo }} />
                        </button>
                        <span className="text-sm font-bold w-4 text-center" style={{ color: C.indigo }}>{qty}</span>
                        <button
                          onClick={() => {
                            const available = v.quantity - v.sold
                            if (qty >= available) {
                              // E1: block and toast
                              toast.error("Số lượng yêu cầu vượt quá tồn kho hiện tại.")
                              return
                            }
                            onUpdate(v.id, qty + 1)
                          }}
                          className="w-7 h-7 rounded-xl flex items-center justify-center border transition-colors"
                          style={{ borderColor: "#E2DFC8" }}
                        >
                          <Plus className="w-3 h-3" style={{ color: C.indigo }} />
                        </button>
                        <button onClick={() => handleRemove(v.id)} className="w-7 h-7 rounded-xl flex items-center justify-center ml-1 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "#C0392B" }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Demo trigger for E2 — only shown while no item is already unavailable */}
          {!hasUnavailable && cart.length > 0 && (
            <div
              className="rounded-2xl p-3 border border-dashed text-center"
              style={{ borderColor: "#E2DFC8" }}
            >
              <p className="text-xs mb-2 font-semibold" style={{ color: "#8A8DA8" }}>
                Demo Exception E2 — Voucher becomes unavailable
              </p>
              <button
                onClick={() => markUnavailable(cart[0].voucher.id)}
                className="text-xs px-4 py-1.5 rounded-xl font-bold border"
                style={{ borderColor: "#E2DFC8", color: "#8A8DA8" }}
              >
                Simulate: Voucher removed from system
              </button>
            </div>
          )}
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
    </div>
  )
}
