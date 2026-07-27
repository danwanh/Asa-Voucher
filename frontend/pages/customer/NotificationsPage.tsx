import { useState } from "react"
import { Bell, Package, Tag, Settings, Check, CheckCheck } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"

const MOCK_NOTIFS = [
  { id: "n1", type: "order", title: "Đơn hàng #ORD-001 đã hoàn thành", body: "Voucher Pizza Hut đã được xác nhận sử dụng.", createdAt: "2024-08-01", read: false },
  { id: "n2", type: "promo", title: "Flash Sale 50% hôm nay!", body: "Hàng trăm voucher giảm đến 50% chỉ trong hôm nay. Mua ngay trước khi hết!", createdAt: "2024-07-31", read: false },
  { id: "n3", type: "system", title: "Cập nhật điều khoản sử dụng", body: "Chúng tôi đã cập nhật điều khoản sử dụng và chính sách bảo mật.", createdAt: "2024-07-28", read: true },
  { id: "n4", type: "order", title: "Thanh toán thành công", body: "Đơn hàng #ORD-003 đã được thanh toán thành công.", createdAt: "2024-07-25", read: true },
  { id: "n5", type: "promo", title: "Voucher sắp hết hạn", body: "Voucher CGV Cinemas của bạn sẽ hết hạn sau 3 ngày. Dùng ngay!", createdAt: "2024-07-20", read: true },
  { id: "n6", type: "system", title: "Đăng nhập mới từ thiết bị lạ", body: "Phát hiện đăng nhập mới từ IP 103.x.x.x vào lúc 14:35.", createdAt: "2024-07-18", read: true },
]

const TABS = [
  { label: "Tất cả", value: "all", icon: <Bell className="w-4 h-4" /> },
  { label: "Khuyến mãi", value: "promo", icon: <Tag className="w-4 h-4" /> },
  { label: "Đơn hàng", value: "order", icon: <Package className="w-4 h-4" /> },
  { label: "Hệ thống", value: "system", icon: <Settings className="w-4 h-4" /> },
]

export function NotificationsPage() {
  const [tab, setTab] = useState("all")
  const [notifs, setNotifs] = useState(MOCK_NOTIFS)

  const filtered = notifs.filter((n) => tab === "all" || n.type === tab)
  const unreadCount = notifs.filter((n) => !n.read).length

  const markAll = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
  const markOne = (id: string) => setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))

  const typeIcon = (type: string) => {
    if (type === "order") return <Package className="w-4 h-4" style={{ color: C.teal }} />
    if (type === "promo") return <Tag className="w-4 h-4" style={{ color: C.peach }} />
    return <Settings className="w-4 h-4" style={{ color: C.indigo }} />
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black" style={{ color: C.indigo }}>
          Thông báo
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: C.peach, color: "white" }}>{unreadCount}</span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAll} className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70" style={{ color: C.peach }}>
            <CheckCheck className="w-4 h-4" /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {TABS.map((t) => {
          const cnt = t.value === "all" ? notifs.filter((n) => !n.read).length : notifs.filter((n) => n.type === t.value && !n.read).length
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{
                backgroundColor: tab === t.value ? C.indigo : "white",
                color: tab === t.value ? "white" : C.indigo,
                border: `1px solid ${tab === t.value ? C.indigo : "#E2DFC8"}`,
              }}
            >
              {t.icon} {t.label}
              {cnt > 0 && <span className="text-xs w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: tab === t.value ? "rgba(255,255,255,0.25)" : C.peach, color: "white" }}>{cnt}</span>}
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 mx-auto mb-4" style={{ color: "#E2DFC8" }} />
            <div className="font-bold" style={{ color: C.indigo }}>Không có thông báo</div>
          </div>
        ) : filtered.map((n) => (
          <div
            key={n.id}
            className="bg-card rounded-2xl p-4 flex items-start gap-3 cursor-pointer transition-colors hover:bg-muted/30"
            style={{ borderLeft: !n.read ? `3px solid ${C.peach}` : "3px solid transparent" }}
            onClick={() => markOne(n.id)}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.eggshell }}>
              {typeIcon(n.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold leading-snug" style={{ color: C.indigo }}>{n.title}</p>
                {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: C.peach }} />}
              </div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#8A8DA8" }}>{n.body}</p>
              <p className="text-xs mt-2" style={{ color: "#B0B3C8" }}>{fmtDate(n.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
