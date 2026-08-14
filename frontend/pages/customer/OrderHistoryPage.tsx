import { useEffect, useRef, useState } from "react"
import { Search, Star, CreditCard, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { OrderStatusCounts } from "@/services/orderService"
import type { Order, OrderStatus } from "@/types"
import { LoadingState } from "@/components/LoadingState"

interface Props {
  orders: Order[]
  countsByStatus?: OrderStatusCounts
  pendingOrderId?: string
  onDetail?: (o: Order) => void
  onReview?: (o: Order, existing?: { rating: number; content: string }) => void
  onComplaint?: (o: Order) => void
  onPayAgain?: (o: Order) => void
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onFilterChange?: (status?: string, search?: string) => void
  loading?: boolean
  currentUserId?: string
}

const ORDER_TABS: { label: string; value: Order["status"] | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ thanh toán", value: "pending_payment" },
  { label: "Thanh toán thất bại", value: "payment_failed" },
  { label: "Đã thanh toán", value: "confirmed" },
  { label: "Hoàn tất", value: "completed" },
  { label: "Đã hủy", value: "cancelled" },
  { label: "Đã hoàn tiền", value: "refunded" },
]

function orderStatusLabel(status: OrderStatus) {
  if (status === "pending_payment") return "Đã tạo đơn, đang chờ thanh toán"
  if (status === "payment_failed") return "Thanh toán thất bại, có thể thử lại"
  if (status === "confirmed") return "Thanh toán thành công, voucher đã phát hành"
  if (status === "completed") return "Đơn đã hoàn tất sử dụng/xử lý"
  if (status === "cancelled") return "Đơn bị hủy trước khi hoàn tất"
  return "Đã hoàn tiền cho khách"
}

function itemSummary(order: Order) {
  const items = order.items ?? []
  if (items.length === 0) return order.voucherTitle
  return items.map((item) => `${item.voucherTitle ?? order.voucherTitle} ×${item.quantity}`).join(" · ")
}

export function OrderHistoryPage({ orders, countsByStatus, onDetail, onReview, onComplaint, onPayAgain, page = 1, totalPages = 1, onPageChange, onFilterChange, loading = false, currentUserId }: Props) {
  const [tab, setTab] = useState<Order["status"] | "all">("all")
  const [search, setSearch] = useState("")
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(searchTimer.current), [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Lịch sử đơn hàng</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Lọc theo trạng thái đơn hàng</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {ORDER_TABS.map((tabItem) => {
          const count = countsByStatus
            ? countsByStatus[tabItem.value] ?? 0
            : tabItem.value === "all"
              ? orders.length
              : orders.filter((order) => order.status === tabItem.value).length

          return (
            <button
              key={tabItem.value}
               onClick={() => {
                  clearTimeout(searchTimer.current)
                  setTab(tabItem.value)
                 onFilterChange?.(tabItem.value === "all" ? undefined : tabItem.value, search.trim() || undefined)
                 onPageChange?.(1)
               }}
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
           onChange={(event) => {
              const value = event.target.value
              setSearch(value)
              clearTimeout(searchTimer.current)
              searchTimer.current = setTimeout(() => {
                onFilterChange?.(tab === "all" ? undefined : tab, value.trim() || undefined)
                onPageChange?.(1)
              }, 300)
            }}
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <LoadingState label="Đang tải danh sách đơn hàng..." variant="section" />
        ) : orders.map((order) => {
          const totalQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 1
          const issuedCount = order.items?.flatMap((item) => item.issuedVouchers ?? []).length ?? 0
          const hasIssuedCodes = issuedCount > 0
          const isRefunded = order.status === "refunded"
          const canReview = order.status === "confirmed" || order.status === "completed"
          const canPayAgain = order.userId === currentUserId && (order.status === "pending_payment" || order.status === "payment_failed") && (!order.paymentExpiresAt || new Date(order.paymentExpiresAt).getTime() > Date.now())
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
                  <span className="text-xs" style={{ color: "#6B7280" }}>Trạng thái:</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: order.status === "confirmed" || order.status === "completed" ? C.teal + "20" : order.status === "payment_failed" || order.status === "cancelled" ? "#FEE2E2" : order.status === "refunded" ? "#E0EEFF" : C.apricot + "25", color: order.status === "confirmed" || order.status === "completed" ? C.teal : order.status === "payment_failed" || order.status === "cancelled" ? "#DC2626" : order.status === "refunded" ? "#1A5FAD" : "#D97706" }}>
                     {orderStatusLabel(order.status)}
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
                {onComplaint && (order.complaints?.[0] || order.status === "confirmed" || order.status === "completed") && (
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

        {!loading && orders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl">
            <AppIcon name="package" className="w-10 h-10 mb-3 mx-auto" />
            <div className="font-bold" style={{ color: C.indigo }}>
              {search ? "Không tìm thấy đơn hàng phù hợp" : "Bạn chưa có đơn hàng nào."}
            </div>
            {search && <div className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Thử tìm với từ khóa khác</div>}
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} className="p-2 rounded-lg border disabled:opacity-40" aria-label="Trang trước"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold">Trang {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)} className="p-2 rounded-lg border disabled:opacity-40" aria-label="Trang sau"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  )
}
