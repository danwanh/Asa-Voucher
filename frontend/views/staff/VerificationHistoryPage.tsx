import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { voucherUsageService, type VoucherUsageItem } from "@/services/issuedVoucherService"
import { useAuthStore } from "@/stores/authStore"
import { LoadingSpinner } from "@/components/LoadingState"

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  valid: { label: "Hợp lệ", bg: "#E8F5EE", text: "#2D7A52" },
  used: { label: "Đã dùng", bg: "#E0EEFF", text: "#1A5FAD" },
  invalid: { label: "Không hợp lệ", bg: "#FCEAEA", text: "#C0392B" },
}

export function VerificationHistoryPage() {
  const user = useAuthStore((s) => s.user)
  const [history, setHistory] = useState<VoucherUsageItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const page = await voucherUsageService.list({ limit: 100, branch_id: user?.branchId })
        if (!isMounted) return
        setHistory(page.items)
      } catch {
        if (!isMounted) return
        setLoadError("Không thể tải lịch sử xác nhận.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null
    const verifiedAtMs = (value: string) => new Date(value).getTime()

    return history.filter((h) => {
      const matchSearch =
        !search ||
        h.voucherCode.toLowerCase().includes(search.toLowerCase()) ||
        h.customerName.toLowerCase().includes(search.toLowerCase()) ||
        h.voucherTitle.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || h.status === statusFilter
      const matchDate =
        (fromMs === null || verifiedAtMs(h.verifiedAt) >= fromMs) &&
        (toMs === null || verifiedAtMs(h.verifiedAt) <= toMs)
      return matchSearch && matchStatus && matchDate
    })
  }, [history, search, statusFilter, dateFrom, dateTo])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo }}>Lịch sử xác nhận</h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
            <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }} placeholder="Tìm mã, tên, khách hàng..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="valid">Hợp lệ</option>
            <option value="used">Đã dùng</option>
            <option value="invalid">Không hợp lệ</option>
          </select>
          <input type="date" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Từ ngày" />
          <input type="date" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Đến ngày" />
        </div>
      </div>

      {isLoading && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white p-4 text-sm font-semibold shadow-sm" style={{ color: C.indigo }} role="status" aria-live="polite">
          <LoadingSpinner size="sm" />
          Đang tải lịch sử xác nhận...
        </div>
      )}
      {loadError && !isLoading && (
        <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{loadError}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.eggshell }}>
                {["Mã Voucher", "Tên Voucher", "Khách hàng", "Chi nhánh", "Nhân viên", "Thời gian", "Kết quả"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const sc = STATUS_MAP[h.status] ?? STATUS_MAP.used
                return (
                  <tr key={h.id} className="border-t hover:bg-muted/20" style={{ borderColor: "#F0EDD8" }}>
                    <td className="px-4 py-3"><code className="text-xs font-bold" style={{ fontFamily: "'Inter', monospace", color: C.indigo }}>{h.voucherCode}</code></td>
                    <td className="px-4 py-3 text-xs max-w-36 truncate" style={{ color: C.indigo }}>{h.voucherTitle}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{h.customerName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{h.branchName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{h.staffName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {new Date(h.verifiedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>{sc.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <AppIcon name="document" className="w-8 h-8 mb-2 mx-auto" />
            <div className="font-bold text-sm" style={{ color: C.indigo }}>Không có lịch sử xác nhận</div>
          </div>
        )}
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: "#F0EDD8", color: "#8A8DA8" }}>
          Hiển thị {filtered.length}/{history.length} kết quả
        </div>
      </div>
    </div>
  )
}
