import { useEffect, useState, useCallback, useRef } from "react"
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { securityService } from "@/services/securityService"
import { api } from "@/services/api"

type TabKey = "all" | "auth" | "admin" | "order" | "payment"

interface UnifiedLog {
  id: string
  rawId: string
  time: string
  level: "info" | "warning" | "success" | "error"
  type: string
  message: string
  actor?: string
  action?: string
  detail?: Record<string, any>
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "auth", label: "Xác thực" },
  { key: "admin", label: "Hành động admin" },
  { key: "order", label: "Đơn hàng" },
  { key: "payment", label: "Thanh toán" },
]

const LEVEL_COLOR: Record<string, string> = {
  info: "#1A5FAD", warning: "#856404", success: "#2D7A52", error: "#C0392B",
}
const LEVEL_BG: Record<string, string> = {
  info: "#E0EEFF", warning: "#FFF3CD", success: "#E8F5EE", error: "#FCEAEA",
}

const ACTION_OPTIONS = [
  { value: "", label: "Tất cả hành động", tab: "all" as const },
  { value: "LOGIN", label: "Đăng nhập", tab: "auth" as const },
  { value: "LOGOUT", label: "Đăng xuất", tab: "auth" as const },
  { value: "VERIFY_EMAIL", label: "Xác thực email", tab: "auth" as const },
  { value: "REGISTER", label: "Đăng ký", tab: "auth" as const },
  { value: "PAYMENT_CREATED", label: "Tạo thanh toán", tab: "payment" as const },
  { value: "PAYMENT_SUCCESS", label: "Thanh toán thành công", tab: "payment" as const },
  { value: "PAYMENT_FAILED", label: "Thanh toán thất bại", tab: "payment" as const },
  { value: "user_created", label: "Tạo người dùng", tab: "admin" as const },
  { value: "user_updated", label: "Cập nhật người dùng", tab: "admin" as const },
  { value: "user_deactivated", label: "Vô hiệu hóa người dùng", tab: "admin" as const },
  { value: "user_activated", label: "Kích hoạt người dùng", tab: "admin" as const },
  { value: "partner_approved", label: "Duyệt đối tác", tab: "admin" as const },
  { value: "partner_rejected", label: "Từ chối đối tác", tab: "admin" as const },
  { value: "partner_status_changed", label: "Đổi trạng thái đối tác", tab: "admin" as const },
  { value: "voucher_approved", label: "Duyệt voucher", tab: "admin" as const },
  { value: "voucher_rejected", label: "Từ chối voucher", tab: "admin" as const },
  { value: "voucher_status_changed", label: "Đổi trạng thái voucher", tab: "admin" as const },
  { value: "complaint_assigned", label: "Gán khiếu nại", tab: "admin" as const },
  { value: "complaint_resolved", label: "Giải quyết khiếu nại", tab: "admin" as const },
  { value: "complaint_closed", label: "Đóng khiếu nại", tab: "admin" as const },
  { value: "security_lock_account", label: "Khóa tài khoản", tab: "admin" as const },
  { value: "security_unlock_account", label: "Mở khóa tài khoản", tab: "admin" as const },
  { value: "security_review_alert", label: "Xem xét cảnh báo", tab: "admin" as const },
]

const ACTION_LABELS: Record<string, { label: string; level: UnifiedLog["level"] }> = {
  user_created:            { label: "Tạo người dùng",           level: "info" },
  user_updated:            { label: "Cập nhật người dùng",      level: "info" },
  user_deactivated:        { label: "Vô hiệu hóa người dùng",   level: "warning" },
  user_activated:          { label: "Kích hoạt người dùng",     level: "success" },
  partner_approved:        { label: "Duyệt đối tác",             level: "success" },
  partner_rejected:        { label: "Từ chối đối tác",           level: "warning" },
  partner_status_changed:  { label: "Đổi trạng thái đối tác",   level: "info" },
  voucher_approved:        { label: "Duyệt voucher",             level: "success" },
  voucher_rejected:        { label: "Từ chối voucher",           level: "warning" },
  voucher_status_changed:  { label: "Đổi trạng thái voucher",   level: "info" },
  complaint_assigned:      { label: "Gán khiếu nại",             level: "info" },
  complaint_resolved:      { label: "Giải quyết khiếu nại",     level: "success" },
  complaint_closed:        { label: "Đóng khiếu nại",            level: "info" },
  security_lock_account:   { label: "Khóa tài khoản",            level: "error" },
  security_unlock_account: { label: "Mở khóa tài khoản",         level: "success" },
  security_review_alert:   { label: "Xem xét cảnh báo",          level: "info" },
}

type Envelope<T> = { data: T; message?: string }
function unwrap<T = any>(response: { data: Envelope<T> } | any): T {
  return response.data.data
}

function toISOString(dateStr: string, endOfDay = false): string | undefined {
  if (!dateStr) return undefined
  const time = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"
  return new Date(dateStr + time).toISOString()
}

function buildUserMap(list: AdminOption[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const u of list) {
    map.set(u.id, u.full_name || u.email)
  }
  return map
}

function mapAuthLogs(raw: any[], userMap: Map<string, string>): UnifiedLog[] {
  return (raw ?? []).map((l) => {
    const status = String(l.status ?? "").toLowerCase()
    const level: UnifiedLog["level"] =
      status === "failed" || status === "error" ? "error" :
      status === "success" || status === "authenticated" ? "success" : "info"
    const userName = l.users?.full_name || l.users?.email || userMap.get(l.user_id) || l.user_id || ""
    return {
      id: `auth-${l.id}`,
      rawId: l.id,
      time: l.occurred_at || l.created_at,
      level,
      type: "Xác thực",
      message: `${l.action ?? "Đăng nhập"} — ${l.detail ?? l.status ?? ""}`,
      actor: userName,
      action: l.action,
      detail: l,
    }
  })
}

function mapAdminLogs(raw: any[]): UnifiedLog[] {
  return (raw ?? []).map((l) => {
    const actionInfo = ACTION_LABELS[l.action]
    const actorName = l.adminName || l.admin?.full_name || l.admin_email || l.admin?.email || ""
    return {
      id: `admin-${l.id}`,
      rawId: l.id,
      time: l.occurredAt || l.occurred_at || l.created_at,
      level: actionInfo?.level ?? "info",
      type: actionInfo?.label ?? l.action ?? "Admin",
      message: l.description ?? "",
      actor: actorName,
      action: l.action,
      detail: l,
    }
  })
}

// Action thực tế của order-logs (theo dữ liệu backend đang trả về) — gắn nhãn
// tiếng Việt + level màu, cùng kiểu với ACTION_LABELS của admin logs.
const ORDER_ACTION_LABELS: Record<string, { label: string; level: UnifiedLog["level"] }> = {
  CREATE_ORDER:         { label: "Tạo đơn hàng",           level: "info" },
  COMPLETE_ORDER:       { label: "Hoàn tất đơn hàng",       level: "success" },
  CANCEL_ORDER:         { label: "Hủy đơn hàng",            level: "warning" },
  CANCEL_ORDER_EXPIRED: { label: "Hủy đơn hàng do hết hạn", level: "warning" },
  REFUND_ORDER:         { label: "Hoàn tiền đơn hàng",      level: "info" },
  REFUND_VOUCHER:       { label: "Hoàn voucher",             level: "info" },
  REISSUE_VOUCHER:      { label: "Cấp lại voucher",          level: "info" },
  PAYMENT_SUCCESS:      { label: "Thanh toán thành công",   level: "success" },
}

function mapOrderLogs(raw: any[], userMap: Map<string, string>): UnifiedLog[] {
  return (raw ?? []).map((l) => {
    const actionInfo = ORDER_ACTION_LABELS[l.action]
    const userName = l.users?.full_name || l.users?.email || userMap.get(l.user_id) || l.user_email || l.user_id || ""
    return {
      id: `order-${l.id}`,
      rawId: l.id,
      time: l.occurred_at || l.created_at,
      level: actionInfo?.level ?? "info",
      type: "Đơn hàng",
      message: `${actionInfo?.label ?? l.action ?? ""} ${l.description ?? ""}`.trim(),
      actor: userName,
      action: l.action,
      detail: l,
    }
  })
}

function mapPaymentLogs(raw: any[], userMap: Map<string, string>): UnifiedLog[] {
  return (raw ?? []).map((l) => {
    const status = String(l.status ?? "").toLowerCase()
    const level: UnifiedLog["level"] =
      status === "failed" ? "error" :
      status === "success" || status === "completed" ? "success" : "info"
    const userName = l.users?.full_name || l.users?.email || userMap.get(l.user_id) || l.user_email || l.user_id || ""
    return {
      id: `pay-${l.id}`,
      rawId: l.id,
      time: l.occurred_at || l.created_at,
      level,
      type: "Thanh toán",
      message: `${l.action ?? ""} ${l.status ?? ""} ${l.description ?? ""}`.trim(),
      actor: userName,
      action: l.action,
      detail: l,
    }
  })
}

// Đơn hàng (order-logs) không có danh sách action cố định trong hệ thống này,
// nên với tab "order" ta lấy các action THỰC TẾ đang có trong log đã tải về,
// thay vì trộn chung với action của auth/admin/payment như trước.
function humanizeAction(v: string): string {
  return v.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function getActionOptionsForTab(tab: TabKey, logs: UnifiedLog[]) {
  if (tab === "all") return ACTION_OPTIONS
  if (tab === "order") {
    const values = Array.from(new Set(logs.filter((l) => l.type === "Đơn hàng" && l.action).map((l) => l.action as string))).sort()
    return [
      { value: "", label: "Tất cả hành động" },
      ...values.map((v) => ({ value: v, label: ORDER_ACTION_LABELS[v]?.label ?? humanizeAction(v) })),
    ]
  }
  return ACTION_OPTIONS.filter((o) => o.value === "" || o.tab === tab)
}

interface AdminOption { id: string; email: string; full_name: string }

export function SystemLogsPage() {
  const [logs, setLogs] = useState<UnifiedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [actorFilter, setActorFilter] = useState("")
  const [actorSearch, setActorSearch] = useState("")
  const [showActorDropdown, setShowActorDropdown] = useState(false)
  const [adminList, setAdminList] = useState<AdminOption[]>([])
  const [detailLog, setDetailLog] = useState<UnifiedLog | null>(null)
  const actorRef = useRef<HTMLDivElement>(null)

  const dateError = dateFrom && dateTo && dateTo < dateFrom
    ? "Khoảng thời gian không hợp lệ"
    : ""

  const hasDateFilter = dateFrom || dateTo
  const clearDateFilter = () => { setDateFrom(""); setDateTo("") }

  // Đổi tab thì bỏ action filter cũ — action của tab trước có thể không tồn tại
  // ở tab mới (vd đang lọc "Đăng nhập" ở tab auth rồi chuyển sang tab Đơn hàng).
  useEffect(() => { setActionFilter("") }, [activeTab])

  useEffect(() => {
    api.get("/users", { params: { limit: 1000 } })
      .then((r) => {
        const data = unwrap<any>(r)
        setAdminList(data.items ?? data ?? [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actorRef.current && !actorRef.current.contains(e.target as Node)) {
        setShowActorDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Yêu cầu tối thiểu 2 ký tự và chỉ khớp từ ĐẦU tên/email (không match giữa chuỗi
  // như trước) — tránh việc gõ 1 ký tự ra hàng loạt kết quả không liên quan.
  const filteredActors = actorSearch.trim().length >= 2
    ? adminList.filter((a) => {
        const q = actorSearch.trim().toLowerCase()
        const nameWords = (a.full_name || "").toLowerCase().split(/\s+/)
        const emailLocalPart = a.email.toLowerCase().split("@")[0]
        return nameWords.some((w) => w.startsWith(q)) || emailLocalPart.startsWith(q)
      }).slice(0, 8)
    : []

  const fetchLogs = useCallback(async () => {
    if (dateError) { setLoading(false); return }
    setLoading(true)
    try {
      const baseParams: Record<string, any> = { limit: 100 }
      if (dateFrom) baseParams.date_from = toISOString(dateFrom)
      if (dateTo) baseParams.date_to = toISOString(dateTo, true)

      const adminParams = { ...baseParams }
      if (actionFilter) adminParams.action = actionFilter
      if (actorFilter) adminParams.admin_id = actorFilter

      const authParams = { ...baseParams }
      if (actionFilter) authParams.action = actionFilter
      if (actorFilter) authParams.user_id = actorFilter

      const orderParams = { ...baseParams }
      if (actionFilter) orderParams.action = actionFilter
      if (actorFilter) orderParams.user_id = actorFilter

      const paymentParams = { ...baseParams }
      if (actionFilter) paymentParams.action = actionFilter
      if (actorFilter) paymentParams.user_id = actorFilter

      const [adminResult, authResult, orderResult, paymentResult] = await Promise.allSettled([
        securityService.listAdminLogs(adminParams),
        api.get("/authentication-logs", { params: authParams }).then((r) => {
          const data = unwrap<any>(r)
          return data.items ?? data
        }),
        api.get("/order-logs", { params: orderParams }).then((r) => {
          const data = unwrap<any>(r)
          return data.items ?? data
        }),
        api.get("/payment-logs", { params: paymentParams }).then((r) => {
          const data = unwrap<any>(r)
          return data.items ?? data
        }),
      ])

      const userMap = buildUserMap(adminList)

      const all: UnifiedLog[] = [
        ...mapAdminLogs(adminResult.status === "fulfilled" ? adminResult.value.items : []),
        ...mapAuthLogs(authResult.status === "fulfilled" ? authResult.value : [], userMap),
        ...mapOrderLogs(orderResult.status === "fulfilled" ? orderResult.value : [], userMap),
        ...mapPaymentLogs(paymentResult.status === "fulfilled" ? paymentResult.value : [], userMap),
      ]

      all.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setLogs(all)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, actionFilter, actorFilter])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (mounted) await fetchLogs()
    })()
    return () => { mounted = false }
  }, [fetchLogs])

  const filtered = activeTab === "all"
    ? logs
    : logs.filter((l) => {
        if (activeTab === "auth") return l.type === "Xác thực"
        if (activeTab === "admin") return l.type !== "Xác thực" && l.type !== "Đơn hàng" && l.type !== "Thanh toán"
        if (activeTab === "order") return l.type === "Đơn hàng"
        if (activeTab === "payment") return l.type === "Thanh toán"
        return true
      })

  // Số đếm cho từng tab luôn tính từ toàn bộ `logs` (chưa lọc theo tab), nên
  // khi đổi tab các con số khác không nhảy — giống cách đã làm ở Security.
  const tabCounts: Record<TabKey, number> = {
    all: logs.length,
    auth: logs.filter((l) => l.type === "Xác thực").length,
    admin: logs.filter((l) => l.type !== "Xác thực" && l.type !== "Đơn hàng" && l.type !== "Thanh toán").length,
    order: logs.filter((l) => l.type === "Đơn hàng").length,
    payment: logs.filter((l) => l.type === "Thanh toán").length,
  }

  const PAGE_SIZE = 20
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [activeTab, actionFilter, actorFilter, dateFrom, dateTo])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageLogs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const goPrevPage = () => setPage((p) => (p === 1 ? totalPages : p - 1)) // quay vòng về trang cuối
  const goNextPage = () => setPage((p) => (p === totalPages ? 1 : p + 1)) // quay vòng về trang đầu

  function handleExportCSV() {
    const BOM = "\uFEFF"
    const header = "Thời gian,Loại,Hành động,Mức độ,Tác nhân,Mô tả"
    const rows = filtered.map((log) => {
      const time = new Date(log.time).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      const escape = (s: string) => `"${(s || "").replace(/"/g, '""')}"`
      return [time, log.type, log.action || "", log.level, log.actor || "", log.message].map(escape).join(",")
    })
    const csv = BOM + header + "\n" + rows.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const today = new Date().toISOString().slice(0, 10)
    a.download = `nhat-ky-he-thong-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <h2 className="font-black text-lg mb-5" style={{ color: C.indigo }}>Nhật ký hệ thống</h2>

      {/* Filters row 1: Tabs */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5"
            style={{
              backgroundColor: activeTab === tab.key ? C.indigo : "white",
              color: activeTab === tab.key ? "white" : "#6B7280",
              border: `1px solid ${activeTab === tab.key ? C.indigo : "#E5E7EB"}`,
            }}
          >
            {tab.label}
            <span
              className="px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums"
              style={{
                backgroundColor: activeTab === tab.key ? "rgba(255,255,255,0.25)" : "#F3F4F6",
                color: activeTab === tab.key ? "white" : "#6B7280",
              }}
            >
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters row 2: Action, Actor, Date */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs border bg-white"
          style={{ borderColor: "#E5E7EB", color: C.indigo, minWidth: 160 }}
        >
          {getActionOptionsForTab(activeTab, logs).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="relative" ref={actorRef}>
          <input
            type="text"
            value={actorFilter ? actorSearch : actorSearch}
            onChange={(e) => {
              setActorSearch(e.target.value)
              setShowActorDropdown(true)
              if (!e.target.value) {
                setActorFilter("")
              }
            }}
            onFocus={() => setShowActorDropdown(true)}
            placeholder="Tìm tác nhân (tên hoặc email)"
            className="px-3 py-2 rounded-xl text-xs border bg-white"
            style={{ borderColor: "#E5E7EB", color: C.indigo, minWidth: 180 }}
          />
          {actorFilter && (
            <button
              type="button"
              onClick={() => { setActorFilter(""); setActorSearch(""); setShowActorDropdown(false) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {showActorDropdown && actorSearch.trim() && filteredActors.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: "#E5E7EB" }}>
              {filteredActors.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setActorFilter(a.id)
                    setActorSearch(a.full_name || a.email)
                    setShowActorDropdown(false)
                  }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex flex-col"
                  style={{ color: C.indigo }}
                >
                  <span className="font-semibold">{a.full_name || "—"}</span>
                  <span style={{ color: "#8A8DA8" }}>{a.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs border"
            style={{ borderColor: dateError ? "#DC2626" : "#E5E7EB", color: C.indigo }}
          />
          <span className="text-xs" style={{ color: "#8A8DA8" }}>đến</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs border"
            style={{ borderColor: dateError ? "#DC2626" : "#E5E7EB", color: C.indigo }}
          />
          {hasDateFilter && (
            <button
              onClick={clearDateFilter}
              className="px-2 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ color: "#DC2626", backgroundColor: "#FEF2F2" }}
              title="Xóa bộ lọc ngày"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="ml-auto px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: C.indigo, color: "white" }}
        >
          <Download className="w-3.5 h-3.5" />
          Xuất file
        </button>
      </div>

      {/* Log list */}
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        {dateError ? (
          <div className="text-center py-20">
            <div className="text-lg mb-2" style={{ color: "#DC2626" }}>⚠</div>
            <div className="font-bold text-sm" style={{ color: "#DC2626" }}>{dateError}</div>
            <div className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Vui lòng chọn lại khoảng thời gian</div>
          </div>
        ) : loading ? (
          <div className="text-center py-20">
            <AppIcon name="clock" className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: C.indigo }} />
            <div className="font-bold text-sm" style={{ color: C.indigo }}>Đang tải nhật ký...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <AppIcon name="document" className="w-14 h-14 mb-4 mx-auto" style={{ color: "#D1D5DB" }} />
            <div className="font-bold text-sm" style={{ color: C.indigo }}>Không có nhật ký</div>
            <div className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Thử thay đổi bộ lọc hoặc ngày tháng</div>
          </div>
        ) : (
          pageLogs.map((log) => (
            <div
              key={log.id}
              onClick={() => setDetailLog(log)}
              className="flex items-start gap-4 p-4 border-b hover:bg-muted/20 transition-colors cursor-pointer"
              style={{ borderColor: "#F0EDD8" }}
            >
              <div className="text-xs shrink-0 mt-0.5 w-12" style={{ color: "#8A8DA8", fontFamily: "'Inter', monospace" }}>
                {new Date(log.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: LEVEL_BG[log.level], color: LEVEL_COLOR[log.level] }}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: C.eggshell, color: C.indigo }}
                  >
                    {log.type}
                  </span>
                  {log.actor && (
                    <span className="text-xs" style={{ color: "#8A8DA8" }}>{log.actor}</span>
                  )}
                </div>
                <p className="text-sm" style={{ color: C.indigo, fontFamily: "'Inter', sans-serif" }}>{log.message}</p>
              </div>
              <div className="text-xs shrink-0 mt-0.5" style={{ color: "#9CA3AF" }}>
                {new Date(log.time).toLocaleDateString("vi-VN")}
              </div>
            </div>
          ))
        )}
        {!loading && !dateError && filtered.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "#F0EDD8" }}>
            <div className="text-xs" style={{ color: "#8A8DA8" }}>
              Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goPrevPage} className="p-1.5 rounded-lg hover:bg-muted/30 transition-colors" title="Trang trước (quay về trang cuối nếu đang ở trang đầu)">
                <ChevronLeft className="w-4 h-4" style={{ color: C.indigo }} />
              </button>
              <span className="text-xs font-bold tabular-nums" style={{ color: C.indigo }}>
                Trang {page} / {totalPages}
              </span>
              <button onClick={goNextPage} className="p-1.5 rounded-lg hover:bg-muted/30 transition-colors" title="Trang sau (quay về trang đầu nếu đang ở trang cuối)">
                <ChevronRight className="w-4 h-4" style={{ color: C.indigo }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      {detailLog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetailLog(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: C.indigo }}>Chi tiết nhật ký</h3>
              <button onClick={() => setDetailLog(null)} className="p-1 rounded-lg hover:bg-muted/30">
                <X className="w-5 h-5" style={{ color: "#8A8DA8" }} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Thời gian</div>
                <div style={{ color: C.indigo }}>{new Date(detailLog.time).toLocaleString("vi-VN")}</div>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Loại</div>
                <div style={{ color: C.indigo }}>{detailLog.type}</div>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Hành động</div>
                <div style={{ color: C.indigo }}>{detailLog.action ?? "N/A"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Mô tả</div>
                <div style={{ color: C.indigo }}>{detailLog.message || "Không có mô tả"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Tác nhân</div>
                <div style={{ color: C.indigo }}>{detailLog.actor || "N/A"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Mức độ</div>
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: LEVEL_BG[detailLog.level], color: LEVEL_COLOR[detailLog.level] }}
                >
                  {detailLog.level.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}