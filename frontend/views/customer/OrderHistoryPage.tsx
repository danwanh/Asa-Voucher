import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search, Star, CreditCard, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { OrderPaymentStatusCounts } from "@/services/orderService"
import type { OrderListItem, OrderPaymentStatus, OrderStatus } from "@/types"
import { LoadingState } from "@/components/LoadingState"

interface Props {
  orders: OrderListItem[]
  countsByStatus?: OrderPaymentStatusCounts
  pendingOrderId?: string
  onDetail?: (o: OrderListItem) => void
  onReview?: (o: OrderListItem) => void
  onComplaint?: (o: OrderListItem) => void
  onPayAgain?: (o: OrderListItem) => void
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onFilterChange?: (status?: string, search?: string) => void
  loading?: boolean
  currentUserId?: string
}

const PAYMENT_TABS: { label: string; value: OrderPaymentStatus | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ thanh toán", value: "pending" },
  { label: "Đã thanh toán", value: "paid" },
  { label: "Thanh toán thất bại", value: "failed" },
  { label: "Đã hoàn tiền", value: "refunded" },
]

function orderStatusLabel(status: OrderStatus) {
  if (status === "pending_payment") return "Đã tạo đơn, đang chờ thanh toán"
  if (status === "payment_failed") return "Thanh toán thất bại, có thể thử lại"
  if (status === "confirmed") return "Thanh toán thành công, voucher đã phát hành"
  if (status === "cancelled") return "Đơn bị hủy trước khi hoàn tất"
  return "Đã hoàn tiền cho khách"
}

function itemSummary(order: OrderListItem) {
  const items = order.items
  if (items.length === 0) return order.voucherTitle
  return items.map((item) => `${item.voucherTitle ?? order.voucherTitle} ×${item.quantity}`).join(" · ")
}

export function OrderHistoryPage({ orders, countsByStatus, onDetail, onReview, onComplaint, onPayAgain, page = 1, totalPages = 1, onPageChange, onFilterChange, loading = false, currentUserId }: Props) {
  const [tab, setTab] = useState<OrderPaymentStatus | "all">("all")
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
        {PAYMENT_TABS.map((tabItem) => {
          const count = countsByStatus
            ? countsByStatus[tabItem.value] ?? 0
            : tabItem.value === "all"
              ? orders.length
              : orders.filter((order) => order.paymentStatus === tabItem.value).length

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
          const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0) || 1
          const issuedCount = order.items.reduce((sum, item) => sum + item.issuedCount, 0)
          const invalidatedCount = order.items.reduce((sum, item) => sum + (item.invalidatedCount ?? 0), 0)
          const hasIssuedCodes = issuedCount > 0
          const isRefunded = order.status === "refunded"
          const isCreator = order.userId === currentUserId
          const canReview = isCreator && order.status === "confirmed"
          const hasReview = order.items.some((item) => item.hasReview)
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
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: order.status === "confirmed" ? C.teal + "20" : order.status === "payment_failed" || order.status === "cancelled" ? "#FEE2E2" : order.status === "refunded" ? "#E0EEFF" : C.apricot + "25", color: order.status === "confirmed" ? C.teal : order.status === "payment_failed" || order.status === "cancelled" ? "#DC2626" : order.status === "refunded" ? "#1A5FAD" : "#D97706" }}>
                     {orderStatusLabel(order.status)}
                  </span>
                </div>
              </div>

              <div className="px-4 py-3 flex flex-wrap gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <Link href={`/vouchers/${order.voucherId}`} className="font-bold text-sm hover:underline" style={{ color: C.indigo }}>{order.voucherTitle}</Link>
                  <p className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>{order.partnerName}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: "#8A8DA8" }}>
                    {order.items.length > 0
                      ? order.items.map((item) => <Link key={item.voucherId} href={`/vouchers/${item.voucherId}`} className="hover:underline">{item.voucherTitle} ×{item.quantity}</Link>)
                      : voucherSummary}
                  </div>
                  <p className="text-xs mt-1 font-semibold" style={{ color: "#8A8DA8" }}>{totalQuantity} voucher</p>
                  {order.isGift && <p className="mt-1 text-xs font-bold" style={{ color: C.teal }}>Đơn quà tặng đã gửi</p>}
                  <div className="mt-2 text-xs font-semibold" style={{ color: hasIssuedCodes ? (isRefunded ? "#DC2626" : invalidatedCount > 0 ? "#D97706" : C.teal) : "#8A8DA8" }}>
                    {hasIssuedCodes
                      ? `Đã phát hành ${issuedCount} voucher${invalidatedCount > 0 ? ` · Đã thu hồi ${invalidatedCount} voucher` : ""}`
                      : "Chưa phát hành mã voucher"}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-black text-sm" style={{ color: C.peach }}>{fmt(order.amount)}</span>
                  {order.refundAmount && order.refundAmount > 0 && (
                    <span className="text-xs font-semibold" style={{ color: "#DC2626" }}>Đã hoàn: -{fmt(order.refundAmount)}</span>
                  )}
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
                    {hasReview ? "Xem đánh giá" : "Đánh giá"}
                  </button>
                )}
                {onComplaint && isCreator && order.status === "confirmed" && (
                  <button
                    onClick={() => onComplaint(order)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}
                  >
                    <MessageSquare className="w-3 h-3" /> Khiếu nại
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
