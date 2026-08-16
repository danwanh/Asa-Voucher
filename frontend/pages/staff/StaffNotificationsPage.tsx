import { useEffect, useState } from "react"
import { Bell, CheckCheck, QrCode, AlertCircle, Info } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"
import { notificationService, type AppNotification } from "@/services/notificationService"
import { LoadingSpinner } from "@/components/LoadingState"

function typeConfig(type: string) {
  if (type === "verify") return { icon: <QrCode className="w-4 h-4" />, color: "#E8F5EE", text: "#2D7A52" }
  if (type === "verify_failed") return { icon: <AlertCircle className="w-4 h-4" />, color: "#FCEAEA", text: "#C0392B" }
  return { icon: <Info className="w-4 h-4" />, color: "#EEF2FF", text: "#4338CA" }
}

export function StaffNotificationsPage() {
  const [notifs, setNotifs] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<"all" | "unread">("all")

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const page = await notificationService.list()
        if (!isMounted) return
        setNotifs(page.rows)
        setUnreadCount(page.unread_count)
      } catch {
        if (!isMounted) return
        setLoadError("Không thể tải thông báo.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead()
      setNotifs((n) => n.map((x) => ({ ...x, is_read: true })))
      setUnreadCount(0)
    } catch {
      // Keep current state if the request fails.
    }
  }

  const markRead = async (id: string) => {
    try {
      await notificationService.markRead(id)
      setNotifs((n) => n.map((x) => x.id === id ? { ...x, is_read: true } : x))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // Keep current state if the request fails.
    }
  }

  const shown = tab === "unread" ? notifs.filter((n) => !n.is_read) : notifs

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

      {isLoading && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white p-4 text-sm font-semibold shadow-sm" style={{ color: C.indigo }} role="status" aria-live="polite">
          <LoadingSpinner size="sm" />
          Đang tải thông báo...
        </div>
      )}
      {loadError && !isLoading && (
        <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{loadError}</div>
      )}

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
            const cfg = typeConfig(n.type)
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className="w-full flex items-start gap-4 p-4 rounded-2xl text-left transition-all hover:shadow-sm"
                style={{ backgroundColor: n.is_read ? "white" : "#FFFBF0", border: `1px solid ${n.is_read ? "#F3F4F6" : "#F2CC8F40"}` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.color }}>
                  <span style={{ color: cfg.text }}>{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm" style={{ color: C.indigo }}>{n.title}</span>
                    {!n.is_read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: C.apricot }} />}
                  </div>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#4B5563" }}>{n.content}</p>
                  <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>{fmtDate(n.created_at)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
