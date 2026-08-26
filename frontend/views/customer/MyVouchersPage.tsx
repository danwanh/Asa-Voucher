import { useState } from "react"
import { Search, QrCode, Gift, Star, MessageSquare, ChevronLeft, ChevronRight, Lock } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { StatusBadge } from "@/components/StatusBadge"
import { MockQR } from "@/components/MockQR"
import type { ComplaintStatus, IssuedVoucher, Order, OrderItem } from "@/types"

interface Props {
  orders: Order[]
  ownerId?: string
  loading?: boolean
  onReview?: (order: Order, issuedVoucher: IssuedVoucher) => void
  onComplaint?: (order: Order, issuedVoucher: IssuedVoucher) => void
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onFilterChange?: (status?: string) => void
}

interface VoucherEntry {
  order: Order
  item: OrderItem
  issuedVoucher: IssuedVoucher
}

const TABS = [
  { label: "Đang hoạt động", value: "active", statuses: ["active"] },
  { label: "Đã sử dụng", value: "used", statuses: ["used"] },
  { label: "Hết hạn", value: "expired", statuses: ["expired", "revoked"] },
]

const COMPLAINT_STATUS: Record<ComplaintStatus, { label: string; color: string; background: string }> = {
  under_review: { label: "Đang xem xét", color: "#1D4ED8", background: "#DBEAFE" },
  closed: { label: "Đã đóng", color: "#6B7280", background: "#F3F4F6" },
  open: { label: "Chờ tiếp nhận", color: "#B66A00", background: C.apricot + "25" },
  contacting_partner: { label: "Đang liên hệ đối tác", color: "#B66A00", background: "#FEF3C7" },
  reissued: { label: "Đã cấp lại", color: "#15803D", background: "#DCFCE7" },
  refunded: { label: "Đã hoàn tiền", color: "#15803D", background: "#DCFCE7" },
}

function buildEntries(orders: Order[]): VoucherEntry[] {
  return orders.flatMap((order) => {
    const items = order.items ?? []
    const entries = items.flatMap((item) => (item.issuedVouchers ?? []).map((issuedVoucher) => ({ order, item, issuedVoucher })))
    return entries
  })
}

export function MyVouchersPage({ orders, ownerId, loading = false, onReview, onComplaint, page = 1, totalPages = 1, onPageChange, onFilterChange }: Props) {
  const ownedOrders = ownerId ? orders.filter((order) => order.recipientId === ownerId) : orders
  const entries = buildEntries(ownedOrders)
  const [tab, setTab] = useState("active")
  const [search, setSearch] = useState("")
  const [qrOpen, setQrOpen] = useState<string | null>(null)

  const currentTab = TABS.find((t) => t.value === tab)!
  const filtered = entries.filter(({ order, item, issuedVoucher }) => {
    const matchTab = currentTab.statuses.includes(issuedVoucher.status)
    const title = item.voucherTitle ?? order.voucherTitle
    const matchSearch = !search || title.toLowerCase().includes(search.toLowerCase()) || issuedVoucher.code.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })
  const openEntry = entries.find(({ issuedVoucher }) => issuedVoucher.id === qrOpen)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Voucher của tôi</h1>
        <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Voucher bạn tự mua và voucher được tặng</p>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = entries.filter(({ issuedVoucher }) => t.statuses.includes(issuedVoucher.status)).length
          return (
            <button
              key={t.value}
               onClick={() => {
                 setTab(t.value)
                 onFilterChange?.(t.value)
                 onPageChange?.(1)
               }}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
              style={{ backgroundColor: tab === t.value ? C.indigo : "white", color: tab === t.value ? "white" : C.indigo, border: `1px solid ${tab === t.value ? C.indigo : "#E2DFC8"}` }}
            >
              {t.label}
              {count > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tab === t.value ? "rgba(255,255,255,0.2)" : C.eggshell }}>{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
        <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8", backgroundColor: "white", fontFamily: "'Inter', sans-serif" }} placeholder="Tìm voucher, mã..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4" role="status" aria-live="polite">
          {[1, 2].map((item) => <div key={item} className="h-56 rounded-3xl bg-white animate-pulse border border-black/5" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <AppIcon name="ticket" className="w-14 h-14 mb-4 mx-auto" />
          <div className="font-bold text-lg" style={{ color: C.indigo }}>{search ? "Không tìm thấy voucher" : `Không có voucher ${currentTab.label.toLowerCase()}`}</div>
          <div className="text-sm mt-2" style={{ color: "#8A8DA8" }}>{!search && tab === "active" ? "Mua voucher hoặc nhận quà để bắt đầu" : "Thử tìm với từ khóa khác"}</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(({ order, item, issuedVoucher }) => {
            const title = item.voucherTitle ?? order.voucherTitle
            const partner = item.partnerName ?? order.partnerName
            const canAct = order.status === "confirmed" || issuedVoucher.status === "used"
            const complaintStatus = issuedVoucher.complaint ? COMPLAINT_STATUS[issuedVoucher.complaint.status] : null
            const isInvalidated = issuedVoucher.status === "revoked" || issuedVoucher.status === "cancelled"
            return (
              <div key={issuedVoucher.id} className="flex h-full flex-col bg-card rounded-3xl overflow-hidden shadow-sm" style={{ opacity: isInvalidated ? 0.7 : 1, borderColor: isInvalidated ? "#FCA5A5" : undefined, borderWidth: isInvalidated ? 1 : 0, borderStyle: "solid" }}>
                <div className="flex-1 p-5 flex items-start gap-4">
                  <div className="flex-shrink-0"><MockQR code={issuedVoucher.qrPayload || issuedVoucher.code} disabled={isInvalidated} /></div>
                  <div className="flex-1 min-w-0">
                    <StatusBadge status={issuedVoucher.status} />
                    <p className="font-bold text-sm mt-2 leading-snug" style={{ color: C.indigo }}>{title}</p>
                    <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>{partner}</p>
                    {order.isGift && <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: C.peach + "15", color: C.peach }}><Gift className="w-3 h-3" /> Được tặng{order.giverName ? ` bởi ${order.giverName}` : ""}</span>}
                    <div className="mt-3"><code className="text-xs font-black tracking-wider px-2 py-1 rounded-lg" style={{ backgroundColor: C.eggshell, color: C.indigo, fontFamily: "'Inter', monospace" }}>{issuedVoucher.code}</code></div>
                  </div>
                </div>
                <div className="px-5 py-3 border-t space-y-2" style={{ borderColor: "#F0EDD8" }}>
                  <div className="flex items-center justify-between text-xs" style={{ color: "#8A8DA8" }}>
                    <span>{order.isGift ? "Ngày nhận" : "Ngày mua"}: {fmtDate(order.createdAt)}</span>
                    <span className="font-bold" style={{ color: C.peach }}>{fmt(item.subtotal || order.amount)}</span>
                  </div>
                  <div className="min-h-7">
                    {complaintStatus && <div className="flex items-center justify-between"><span className="text-xs font-semibold" style={{ color: "#6B7280" }}>Trạng thái khiếu nại</span><span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: complaintStatus.background, color: complaintStatus.color }}>{complaintStatus.label}</span></div>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isInvalidated ? (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}><Lock className="w-3 h-3" /> Đã khóa</span>
                    ) : (
                      <button onClick={() => setQrOpen(issuedVoucher.id)} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: C.indigo + "10", color: C.indigo }}><QrCode className="w-3 h-3" /> Xem QR</button>
                    )}
                    {onReview && (issuedVoucher.review || canAct) && (issuedVoucher.review ? <button onClick={() => onReview(order, issuedVoucher)} className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: C.teal + "15", color: C.teal }}><Star className="w-3 h-3" /> Xem đánh giá</button> : <button onClick={() => onReview(order, issuedVoucher)} className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: C.apricot + "25", color: "#B66A00" }}><Star className="w-3 h-3" /> Đánh giá</button>)}
                    {onComplaint && (issuedVoucher.complaint || canAct) && (issuedVoucher.complaint ? <button onClick={() => onComplaint(order, issuedVoucher)} className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: "#DBEAFE", color: "#2563EB" }}><MessageSquare className="w-3 h-3" /> Xem khiếu nại</button> : <button onClick={() => onComplaint(order, issuedVoucher)} className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}><MessageSquare className="w-3 h-3" /> Khiếu nại</button>)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} className="p-2 rounded-lg border disabled:opacity-40" aria-label="Trang trước"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold">Trang {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)} className="p-2 rounded-lg border disabled:opacity-40" aria-label="Trang sau"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      {qrOpen && openEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setQrOpen(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="font-black text-lg mb-1" style={{ color: C.indigo }}>{openEntry.item.voucherTitle ?? openEntry.order.voucherTitle}</div>
            <div className="text-sm mb-4" style={{ color: "#8A8DA8" }}>{openEntry.item.partnerName ?? openEntry.order.partnerName}</div>
            <div className="flex justify-center mb-4"><MockQR code={openEntry.issuedVoucher.qrPayload || openEntry.issuedVoucher.code} size={120} disabled={openEntry.issuedVoucher.status === "revoked" || openEntry.issuedVoucher.status === "cancelled"} /></div>
            <code className="text-lg font-black tracking-widest block mb-4" style={{ color: C.indigo, fontFamily: "'Inter', monospace" }}>{openEntry.issuedVoucher.code}</code>
            <div className="text-xs mb-1" style={{ color: "#8A8DA8" }}>Trạng thái</div>
            <StatusBadge status={openEntry.issuedVoucher.status} />
            {(openEntry.issuedVoucher.status === "revoked" || openEntry.issuedVoucher.status === "cancelled") && (
              <div className="text-xs font-semibold mt-3" style={{ color: "#DC2626" }}>Voucher đã bị vô hiệu hóa</div>
            )}
            <button className="mt-6 px-5 py-2.5 rounded-xl font-bold text-sm border" style={{ borderColor: "#E2DFC8", color: C.indigo }} onClick={() => setQrOpen(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  )
}
