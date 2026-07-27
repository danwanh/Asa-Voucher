import { useState } from "react"
import { Bell, CheckCheck, QrCode, AlertCircle, Info } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"

interface Notification {
  id: string
  type: "verify" | "system" | "alert"
  title: string
  body: string
  time: string
  read: boolean
}

const MOCK_NOTIFS: Notification[] = [
  { id: "n1", type: "verify", title: "Voucher đã xác nhận", body: "Bạn đã xác nhận voucher ASA-PH-7F3K2 cho khách Nguyễn Thị Mai", time: "2026-07-09T09:30:00", read: false },
  { id: "n2", type: "alert", title: "Voucher không hợp lệ", body: "Mã ASA-XX-INVALID không tồn tại trong hệ thống", time: "2026-07-09T08:15:00", read: false },
  { id: "n3", type: "system", title: "Cập nhật hệ thống", body: "Hệ thống sẽ bảo trì lúc 02:00 ngày 10/07/2026", time: "2026-07-08T18:00:00", read: true },
  { id: "n4", type: "verify", title: "Voucher đã xác nhận", body: "Bạn đã xác nhận voucher ASA-CG-8H5N1 cho khách Trần Văn B", time: "2026-07-08T14:20:00", read: true },
  { id: "n5", type: "system", title: "Đăng nhập mới", body: "Phiên đăng nhập mới từ thiết bị iPhone 14", time: "2026-07-07T10:00:00", read: true },
]

const TYPE_CONFIG = {
  verify: { icon: <QrCode className="w-4 h-4" />, color: "#E8F5EE", text: "#2D7A52" },
  alert: { icon: <AlertCircle className="w-4 h-4" />, color: "#FCEAEA", text: "#C0392B" },
  system: { icon: <Info className="w-4 h-4" />, color: "#EEF2FF", text: "#4338CA" },
}

export function StaffNotificationsPage() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS)
  const [tab, setTab] = useState<"all" | "unread">("all")

  const markAllRead = () => setNotifs((n) => n.map((x) => ({ ...x, read: true })))
  const markRead = (id: string) => setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: true } : x))
  const unreadCount = notifs.filter((n) => !n.read).length

  const shown = tab === "unread" ? notifs.filter((n) => !n.read) : notifs

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Thông báo</h1>
          {unreadCount > 0 && (
            <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>{unreadCount} thông báo chưa đọc</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm font-semibold hover:underline" style={{ color: C.apricot }}>
            <CheckCheck className="w-4 h-4" /> Đọc tất cả
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[{ value: "all", label: "Tất cả" }, { value: "unread", label: `Chưa đọc (${unreadCount})` }].map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value as typeof tab)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              backgroundColor: tab === t.value ? C.apricot : "white",
              color: tab === t.value ? C.indigo : "#6B7280",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-black/5">
          <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: "#D1D5DB" }} />
          <div className="font-bold" style={{ color: C.indigo }}>Không có thông báo</div>
          <div className="text-sm mt-1" style={{ color: "#9CA3AF" }}>Tất cả thông báo sẽ hiển thị ở đây</div>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((n) => {
            const cfg = TYPE_CONFIG[n.type]
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className="w-full flex items-start gap-4 p-4 rounded-2xl text-left transition-all hover:shadow-sm"
                style={{ backgroundColor: n.read ? "white" : "#FFFBF0", border: `1px solid ${n.read ? "#F3F4F6" : "#F2CC8F40"}` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.color }}>
                  <span style={{ color: cfg.text }}>{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm" style={{ color: C.indigo }}>{n.title}</span>
                    {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: C.apricot }} />}
                  </div>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#4B5563" }}>{n.body}</p>
                  <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>{fmtDate(n.time)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
