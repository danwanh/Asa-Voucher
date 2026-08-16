import { useEffect, useState } from "react"
import { CheckCircle, XCircle, QrCode, Users } from "lucide-react"
import { C } from "@/utils/constants"
import { dashboardService, type StaffDashboardStats } from "@/services/dashboardService"
import { LoadingSpinner } from "@/components/LoadingState"

const EMPTY: StaffDashboardStats = {
  checked_today: 0,
  confirmed_today: 0,
  invalid_today: 0,
  customers_today: 0,
  recent_verifications: [],
}

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  used: { label: "Đã dùng", bg: "#E0EEFF", text: "#1A5FAD" },
  valid: { label: "Hợp lệ", bg: "#E8F5EE", text: "#2D7A52" },
  invalid: { label: "Không hợp lệ", bg: "#FCEAEA", text: "#C0392B" },
}

export function StaffDashboardPage() {
  const [stats, setStats] = useState<StaffDashboardStats>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const data = await dashboardService.getStaffStats()
        if (!isMounted) return
        setStats(data)
      } catch {
        if (!isMounted) return
        setLoadError("Không thể tải dữ liệu tổng quan.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const KPI = [
    { label: "Voucher kiểm tra hôm nay", value: isLoading ? "..." : String(stats.checked_today), icon: <QrCode className="w-5 h-5" />, color: C.indigo },
    { label: "Voucher đã xác nhận", value: isLoading ? "..." : String(stats.confirmed_today), icon: <CheckCircle className="w-5 h-5" />, color: C.teal },
    { label: "Voucher không hợp lệ", value: isLoading ? "..." : String(stats.invalid_today), icon: <XCircle className="w-5 h-5" />, color: C.peach },
    { label: "Lượt khách hôm nay", value: isLoading ? "..." : String(stats.customers_today), icon: <Users className="w-5 h-5" />, color: "#7C3AED" },
  ]

  const recent = stats.recent_verifications

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Tổng quan hôm nay</h1>
        <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Chi nhánh của bạn — {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {isLoading && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-white p-4 text-sm font-semibold shadow-sm" style={{ color: C.indigo }} role="status" aria-live="polite">
          <LoadingSpinner size="sm" />
          Đang tải dữ liệu tổng quan...
        </div>
      )}
      {loadError && !isLoading && (
        <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{loadError}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {KPI.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: k.color + "15", color: k.color }}>
              {k.icon}
            </div>
            <div className="text-3xl font-black" style={{ color: C.indigo }}>{k.value}</div>
            <div className="text-xs mt-1 leading-tight" style={{ color: "#8A8DA8" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: "#F0EDD8" }}>
          <h2 className="font-black" style={{ color: C.indigo }}>Xác nhận gần đây</h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "#8A8DA8" }}>
            {isLoading ? "Đang tải..." : "Chưa có xác nhận nào hôm nay."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.eggshell }}>
                {["Mã Voucher", "Tên Voucher", "Khách hàng", "Thời gian", "Kết quả"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => {
                const sc = STATUS_STYLE[r.status] ?? STATUS_STYLE.used
                return (
                  <tr key={`${r.code}-${r.time}`} className="border-t hover:bg-muted/20" style={{ borderColor: "#F0EDD8" }}>
                    <td className="px-4 py-3"><code className="text-xs font-bold" style={{ color: C.indigo, fontFamily: "'Inter', monospace" }}>{r.code}</code></td>
                    <td className="px-4 py-3 text-xs" style={{ color: C.indigo }}>{r.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{r.customer}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {new Date(r.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
