import { useState } from "react"
import { Search, Star, MessageSquare } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { StatusBadge } from "@/components/StatusBadge"
import type { Order, OrderStatus } from "@/types"

interface Props {
  orders: Order[]
  pendingOrderId?: string
  onDetail?: (o: Order) => void
  onReview?: (o: Order) => void
}

const TABS: { label: string; value: string }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ thanh toán", value: "pending" },
  { label: "Đã thanh toán", value: "completed" },
  { label: "Đã sử dụng", value: "used" },
  { label: "Đã hủy", value: "cancelled" },
]

function deriveVoucherCodes(orderId: string, qty: number, baseCode: string): string[] {
  const base = baseCode || orderId.slice(-5).toUpperCase()
  return Array.from({ length: qty }, (_, i) => `${base}-${String(i + 1).padStart(3, "0")}`)
}

export function OrderHistoryPage({ orders, pendingOrderId, onDetail, onReview }: Props) {
  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")

  const allOrders = pendingOrderId
    ? [
        {
          id: pendingOrderId,
          userId: "u01",
          voucherId: "",
          voucherTitle: "(Đơn hàng vừa tạo)",
          partnerName: "—",
          amount: 0,
          status: "pending" as OrderStatus,
          paymentMethod: "—",
          createdAt: new Date().toISOString(),
          code: pendingOrderId,
        },
        ...orders,
      ]
    : orders

  const filtered = allOrders.filter((o) => {
    const matchTab = tab === "all" || o.status === (tab as OrderStatus)
    const matchSearch =
      !search ||
      o.voucherTitle.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Lịch sử đơn hàng</h1>
        
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {TABS.map((t) => {
          const count = t.value === "all" ? allOrders.length : allOrders.filter((o) => o.status === t.value).length
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: tab === t.value ? C.peach : "white",
                color: tab === t.value ? "white" : C.indigo,
                border: `1px solid ${tab === t.value ? C.peach : "#E2DFC8"}`,
              }}
            >
              {t.label}
              {count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tab === t.value ? "rgba(255,255,255,0.25)" : C.eggshell }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
          style={{ borderColor: "#E2DFC8", backgroundColor: "white", fontFamily: "'Inter', sans-serif" }}
          placeholder="Tìm theo mã đơn, tên voucher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((o) => {
          const qty = 1 // default qty since Order type doesn't track it
          const codes = deriveVoucherCodes(o.id, qty, o.code)
          const canReview = o.status === "completed" || o.status === "used"

          return (
            <div
              key={o.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden border"
              style={{ borderColor: o.id === pendingOrderId ? C.apricot : "#F0EDD8", borderWidth: o.id === pendingOrderId ? 2 : 1 }}
            >
              {/* Header row */}
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b"
                style={{ backgroundColor: o.id === pendingOrderId ? C.apricot + "15" : C.eggshell, borderColor: "#F0EDD8" }}
              >
                <div className="flex items-center gap-2">
                  <code className="text-xs font-bold" style={{ color: C.indigo }}>{o.id}</code>
                  {o.id === pendingOrderId && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: C.apricot + "30", color: "#D97706" }}>
                      Vừa tạo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "#8A8DA8" }}>{fmtDate(o.createdAt)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-3 flex flex-wrap gap-4 items-start">
                {/* Voucher info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: C.indigo }}>{o.voucherTitle}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>{o.partnerName}</p>

                  {/* Voucher codes */}
                  {o.code && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {codes.map((c) => (
                        <span
                          key={c}
                          className="text-xs px-2 py-0.5 rounded-lg font-mono font-bold border"
                          style={{ borderColor: C.teal + "60", color: C.teal, backgroundColor: C.teal + "10" }}
                        >
                          {c}
                        </span>
                      ))}
                      <span className="text-xs" style={{ color: "#B0B3C8" }}>({qty} mã)</span>
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-black text-sm" style={{ color: C.peach }}>{fmt(o.amount)}</span>
                  <span className="text-xs" style={{ color: "#8A8DA8" }}>{o.paymentMethod}</span>
                  <span className="text-xs" style={{ color: "#8A8DA8" }}>SL: {qty}</span>
                </div>
              </div>

              {/* Actions row */}
              <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onDetail?.(o)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-muted"
                  style={{ borderColor: "#E2DFC8", color: C.indigo }}
                >
                  Xem chi tiết
                </button>
                {canReview && onReview && (
                  <button
                    onClick={() => onReview(o)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    style={{ backgroundColor: C.apricot + "20", color: "#D97706" }}
                  >
                    <Star className="w-3 h-3" />
                    Đánh giá
                  </button>
                )}
                {canReview && onReview && (
                  <button
                    onClick={() => onReview(o, { rating: 4, content: "Voucher chất lượng, dịch vụ tốt!" })}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    style={{ backgroundColor: C.teal + "15", color: C.teal }}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Sửa đánh giá
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl">
            <AppIcon name="package" className="w-10 h-10 mb-3 mx-auto" />
            <div className="font-bold" style={{ color: C.indigo }}>
              {search ? "Không tìm thấy đơn hàng phù hợp" : "Chưa có đơn hàng nào"}
            </div>
            {search && <div className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Thử tìm với từ khóa khác</div>}
          </div>
        )}
      </div>
    </div>
  )
}
