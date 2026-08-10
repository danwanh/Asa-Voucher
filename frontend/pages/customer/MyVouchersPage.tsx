import { useState } from "react"
import { Search, QrCode, Gift, Star } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { StatusBadge } from "@/components/StatusBadge"
import { MockQR } from "@/components/MockQR"
import type { Order } from "@/types"

interface Props {
  orders: Order[]
  ownerId?: string
  onReview?: (order: Order) => void
}

const TABS = [
  { label: "Đang hoạt động", value: "active", statuses: ["confirmed", "completed"] },
  { label: "Đã sử dụng", value: "used", statuses: ["used"] },
  { label: "Hết hạn", value: "expired", statuses: ["cancelled"] },
]

export function MyVouchersPage({ orders, ownerId, onReview }: Props) {
  const ownedOrders = ownerId ? orders.filter((order) => order.recipientId === ownerId) : orders
  const [tab, setTab] = useState("active")
  const [search, setSearch] = useState("")
  const [qrOpen, setQrOpen] = useState<string | null>(null)

  const currentTab = TABS.find((t) => t.value === tab)!
  const filtered = ownedOrders.filter((o) => {
    const matchTab = currentTab.statuses.includes(o.status)
    const matchSearch = !search || o.voucherTitle.toLowerCase().includes(search.toLowerCase()) || o.code.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const openOrder = ownedOrders.find((o) => o.id === qrOpen)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo }}>
            Voucher của tôi
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Voucher bạn tự mua và voucher được tặng</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = ownedOrders.filter((o) => t.statuses.includes(o.status)).length
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: tab === t.value ? C.indigo : "white",
                color: tab === t.value ? "white" : C.indigo,
                border: `1px solid ${tab === t.value ? C.indigo : "#E2DFC8"}`,
              }}
            >
              {t.label}
              {count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tab === t.value ? "rgba(255,255,255,0.2)" : C.eggshell }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
          style={{ borderColor: "#E2DFC8", backgroundColor: "white", fontFamily: "'Inter', sans-serif" }}
          placeholder="Tìm voucher, mã..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <AppIcon name="ticket" className="w-14 h-14 mb-4 mx-auto" />
          <div className="font-bold text-lg" style={{ color: C.indigo }}>
            {search ? "Không tìm thấy voucher" : `Không có voucher ${currentTab.label.toLowerCase()}`}
          </div>
          <div className="text-sm mt-2" style={{ color: "#8A8DA8" }}>
            {!search && tab === "active" ? "Mua voucher hoặc nhận quà để bắt đầu" : "Thử tìm với từ khóa khác"}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((o) => (
            <div key={o.id} className="bg-card rounded-3xl overflow-hidden shadow-sm" style={{ opacity: tab === "expired" ? 0.7 : 1 }}>
              <div className="p-5 flex items-start gap-4">
                <div className="flex-shrink-0">
                   <MockQR code={o.qrPayload || o.code} />
                </div>
                <div className="flex-1 min-w-0">
                  <StatusBadge status={o.status} />
                  <p className="font-bold text-sm mt-2 leading-snug" style={{ color: C.indigo }}>{o.voucherTitle}</p>
                  <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>{o.partnerName}</p>
                  {o.isGift && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: C.peach + "15", color: C.peach }}>
                      <Gift className="w-3 h-3" /> Được tặng{o.giverName ? ` bởi ${o.giverName}` : ""}
                    </span>
                  )}
                  <div className="mt-3">
                    <code className="text-xs font-black tracking-wider px-2 py-1 rounded-lg" style={{ backgroundColor: C.eggshell, color: C.indigo, fontFamily: "'Inter', monospace" }}>
                      {o.code}
                    </code>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "#F0EDD8" }}>
                <div className="text-xs" style={{ color: "#8A8DA8" }}>
                  <span>{o.isGift ? "Ngày nhận" : "Ngày mua"}: {fmtDate(o.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs" style={{ color: C.peach }}>{fmt(o.amount)}</span>
                  {onReview && (
                    (o.isGift && (o.status === "confirmed" || o.status === "completed" || o.status === "used" || o.paymentStatus === "paid")) ||
                    (!o.isGift && o.status === "used")
                  ) && (
                    <button
                      onClick={() => onReview(o)}
                      className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ backgroundColor: C.apricot + "25", color: "#B66A00" }}
                    >
                      <Star className="w-3 h-3" /> Đánh giá
                    </button>
                  )}
                  <button
                    onClick={() => setQrOpen(o.id)}
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                    style={{ backgroundColor: C.indigo + "10", color: C.indigo }}
                  >
                    <QrCode className="w-3 h-3" /> Xem QR
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      {qrOpen && openOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setQrOpen(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="font-black text-lg mb-1" style={{ color: C.indigo }}>{openOrder.voucherTitle}</div>
            <div className="text-sm mb-4" style={{ color: "#8A8DA8" }}>{openOrder.partnerName}</div>
            <div className="flex justify-center mb-4">
               <MockQR code={openOrder.qrPayload || openOrder.code} size={120} />
            </div>
            <code className="text-lg font-black tracking-widest block mb-4" style={{ color: C.indigo, fontFamily: "'Inter', monospace" }}>
              {openOrder.code}
            </code>
            <div className="text-xs mb-1" style={{ color: "#8A8DA8" }}>Trạng thái</div>
            <StatusBadge status={openOrder.status} />
            <div className="flex gap-2 mt-6">
              <button
                className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm"
                style={{ backgroundColor: C.peach }}
                onClick={() => {
                  navigator.clipboard?.writeText(openOrder.code)
                  setQrOpen(null)
                }}
              >
                Sao chép mã
              </button>
              <button className="px-4 py-2.5 rounded-xl font-bold text-sm border" style={{ borderColor: "#E2DFC8", color: C.indigo }} onClick={() => setQrOpen(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
