import { useState } from "react"
import { Search, Star, CreditCard, MessageSquare } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Order } from "@/types"

interface Props {
  orders: Order[]
  pendingOrderId?: string
  onDetail?: (o: Order) => void
  onReview?: (o: Order, existing?: { rating: number; content: string }) => void
  onComplaint?: (o: Order) => void
  onPayAgain?: (o: Order) => void
}

const PAYMENT_TABS: { label: string; value: NonNullable<Order["paymentStatus"]> | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ thanh toán", value: "pending" },
  { label: "Đã thanh toán", value: "paid" },
  { label: "Thanh toán thất bại", value: "failed" },
  { label: "Đã hoàn tiền", value: "refunded" },
]

function paymentStatusLabel(status?: Order["paymentStatus"]) {
  if (status === "paid") return "Đã thanh toán"
  if (status === "failed") return "Thanh toán thất bại"
  if (status === "refunded") return "Đã hoàn tiền"
  return "Chờ thanh toán"
}

function itemSummary(order: Order) {
  const items = order.items ?? []
  if (items.length === 0) return order.voucherTitle
  return items.map((item) => `${item.voucherTitle ?? order.voucherTitle} ×${item.quantity}`).join(" · ")
}

export function OrderHistoryPage({ orders, onDetail, onReview, onComplaint, onPayAgain }: Props) {
  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")

  const filtered = orders.filter((order) => {
    const matchTab = tab === "all" || order.paymentStatus === tab
    const matchSearch =
      !search ||
      order.voucherTitle.toLowerCase().includes(search.toLowerCase()) ||
      (order.orderCode ?? order.id).toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Lịch sử đơn hàng</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Lịch sử đơn hàng theo trạng thái thanh toán</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {PAYMENT_TABS.map((tabItem) => {
          const count = tabItem.value === "all"
            ? orders.length
            : orders.filter((order) => order.paymentStatus === tabItem.value).length

          return (
            <button
              key={tabItem.value}
              onClick={() => setTab(tabItem.value)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: tab === tabItem.value ? C.peach : "white",
                color: tab === tabItem.value ? "white" : C.indigo,
                border: `1px solid ${tab === tabItem.value ? C.peach : "#E2DFC8"}`,
              }}
            >
              {tabItem.label}
              {count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tab === tabItem.value ? "rgba(255,255,255,0.25)" : C.eggshell }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
          style={{ borderColor: "#E2DFC8", backgroundColor: "white", fontFamily: "'Inter', sans-serif" }}
          placeholder="Tìm theo mã đơn, tên voucher..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((order) => {
          const totalQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 1
          const issuedCount = order.items?.flatMap((item) => item.issuedVouchers ?? []).length ?? 0
          const hasIssuedCodes = issuedCount > 0
          const isRefunded = order.paymentStatus === "refunded"
          const canReview = order.paymentStatus === "paid"
          const canPayAgain = (order.paymentStatus === "pending" || order.paymentStatus === "failed") && (!order.paymentExpiresAt || new Date(order.paymentExpiresAt).getTime() > Date.now())
          const voucherSummary = itemSummary(order)

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden border"
              style={{ borderColor: "#F0EDD8", borderWidth: 1 }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ backgroundColor: C.eggshell, borderColor: "#F0EDD8" }}>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-bold" style={{ color: C.indigo }}>{order.orderCode ?? order.id}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "#8A8DA8" }}>{fmtDate(order.createdAt)}</span>
                  <span className="text-xs" style={{ color: "#6B7280" }}>Thanh toán:</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: order.paymentStatus === "paid" ? C.teal + "20" : order.paymentStatus === "failed" ? "#FEE2E2" : order.paymentStatus === "refunded" ? "#E0EEFF" : C.apricot + "25", color: order.paymentStatus === "paid" ? C.teal : order.paymentStatus === "failed" ? "#DC2626" : order.paymentStatus === "refunded" ? "#1A5FAD" : "#D97706" }}>
                    {paymentStatusLabel(order.paymentStatus)}
                  </span>
                </div>
              </div>

              <div className="px-4 py-3 flex flex-wrap gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: C.indigo }}>{order.voucherTitle}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>{order.partnerName}</p>
                  <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>{voucherSummary}</p>
                  <p className="text-xs mt-1 font-semibold" style={{ color: "#8A8DA8" }}>{totalQuantity} voucher</p>
                  <div className="mt-2 text-xs font-semibold" style={{ color: hasIssuedCodes ? (isRefunded ? "#DC2626" : C.teal) : "#8A8DA8" }}>
                    {hasIssuedCodes
                      ? isRefunded
                        ? `Đã phát hành ${issuedCount} mã voucher nhưng đã vô hiệu do hoàn tiền`
                        : `Đã phát hành ${issuedCount} mã voucher`
                      : "Chưa phát hành mã voucher"}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-black text-sm" style={{ color: C.peach }}>{fmt(order.amount)}</span>
                  <span className="text-xs" style={{ color: "#8A8DA8" }}>{order.paymentMethod}</span>
                </div>
              </div>

              <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onDetail?.(order)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-muted"
                  style={{ borderColor: "#E2DFC8", color: C.indigo }}
                >
                  Xem chi tiết
                </button>
                {canReview && onReview && (
                  <button
                    onClick={() => onReview(order)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    style={{ backgroundColor: C.apricot + "20", color: "#D97706" }}
                  >
                    <Star className="w-3 h-3" />
                    Đánh giá
                  </button>
                )}
                {onComplaint && (order.complaints?.[0] || order.paymentStatus === "paid") && (
                  <button
                    onClick={() => onComplaint(order)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    style={{ backgroundColor: order.complaints?.[0] ? "#DBEAFE" : "#EFF6FF", color: "#2563EB" }}
                  >
                    <MessageSquare className="w-3 h-3" /> {order.complaints?.[0] ? "Xem khiếu nại đơn" : "Khiếu nại đơn"}
                  </button>
                )}
                {canPayAgain && onPayAgain && (
                  <button
                    onClick={() => onPayAgain(order)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-white"
                    style={{ backgroundColor: C.peach }}
                  >
                    <CreditCard className="w-3 h-3" /> Thanh toán lại
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
              {search ? "Không tìm thấy đơn hàng phù hợp" : "Bạn chưa có đơn hàng nào."}
            </div>
            {search && <div className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Thử tìm với từ khóa khác</div>}
          </div>
        )}
      </div>
    </div>
  )
}
