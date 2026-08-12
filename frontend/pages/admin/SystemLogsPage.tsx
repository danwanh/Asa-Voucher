import { useEffect, useState, useCallback } from "react"
import { X } from "lucide-react"
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
  { value: "", label: "Tất cả hành động" },
  { value: "LOGIN", label: "Đăng nhập" },
  { value: "LOGOUT", label: "Đăng xuất" },
  { value: "VERIFY_EMAIL", label: "Xác thực email" },
  { value: "REGISTER", label: "Đăng ký" },
  { value: "PAYMENT_CREATED", label: "Tạo thanh toán" },
  { value: "PAYMENT_SUCCESS", label: "Thanh toán thành công" },
  { value: "PAYMENT_FAILED", label: "Thanh toán thất bại" },
  { value: "user_created", label: "Tạo người dùng" },
  { value: "user_updated", label: "Cập nhật người dùng" },
  { value: "user_deactivated", label: "Vô hiệu hóa người dùng" },
  { value: "user_activated", label: "Kích hoạt người dùng" },
  { value: "partner_approved", label: "Duyệt đối tác" },
  { value: "partner_rejected", label: "Từ chối đối tác" },
  { value: "partner_status_changed", label: "Đổi trạng thái đối tác" },
  { value: "voucher_approved", label: "Duyệt voucher" },
  { value: "voucher_rejected", label: "Từ chối voucher" },
  { value: "voucher_status_changed", label: "Đổi trạng thái voucher" },
  { value: "complaint_assigned", label: "Gán khiếu nại" },
  { value: "complaint_resolved", label: "Giải quyết khiếu nại" },
  { value: "complaint_closed", label: "Đóng khiếu nại" },
  { value: "security_lock_account", label: "Khóa tài khoản" },
  { value: "security_unlock_account", label: "Mở khóa tài khoản" },
  { value: "security_review_alert", label: "Xem xét cảnh báo" },
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

function toISOString(dateStr: string): string | undefined {
  if (!dateStr) return undefined
  return new Date(dateStr + "T00:00:00.000Z").toISOString()
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

function mapOrderLogs(raw: any[], userMap: Map<string, string>): UnifiedLog[] {
  return (raw ?? []).map((l) => {
    const userName = l.users?.full_name || l.users?.email || userMap.get(l.user_id) || l.user_email || l.user_id || ""
    return {
      id: `order-${l.id}`,
      rawId: l.id,
      time: l.occurred_at || l.created_at,
      level: "info" as const,
      type: "Đơn hàng",
      message: `${l.action ?? ""} ${l.description ?? ""}`.trim(),
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

interface AdminOption { id: string; email: string; full_name: string }

export function SystemLogsPage() {
  const [logs, setLogs] = useState<UnifiedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [actorFilter, setActorFilter] = useState("")
  const [adminList, setAdminList] = useState<AdminOption[]>([])
  const [detailLog, setDetailLog] = useState<UnifiedLog | null>(null)

  const dateError = dateFrom && dateTo && dateTo < dateFrom
    ? "Khoảng thời gian không hợp lệ"
    : ""

  const hasDateFilter = dateFrom || dateTo
  const clearDateFilter = () => { setDateFrom(""); setDateTo("") }

  useEffect(() => {
    api.get("/users", { params: { limit: 1000 } })
      .then((r) => {
        const data = unwrap<any>(r)
        setAdminList(data.items ?? data ?? [])
      })
      .catch(() => {})
  }, [])

  const fetchLogs = useCallback(async () => {
    if (dateError) { setLoading(false); return }
    setLoading(true)
    try {
      const baseParams: Record<string, any> = { limit: 100 }
      if (dateFrom) baseParams.date_from = toISOString(dateFrom)
      if (dateTo) baseParams.date_to = toISOString(dateTo + "T23:59:59")

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

  return (
    <div className="p-6">
      <h2 className="font-black text-lg mb-5" style={{ color: C.indigo }}>Nhật ký hệ thống</h2>

      {/* Filters row 1: Tabs */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              backgroundColor: activeTab === tab.key ? C.indigo : "white",
              color: activeTab === tab.key ? "white" : "#6B7280",
              border: `1px solid ${activeTab === tab.key ? C.indigo : "#E5E7EB"}`,
            }}
          >
            {tab.label}
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
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs border bg-white"
          style={{ borderColor: "#E5E7EB", color: C.indigo, minWidth: 160 }}
        >
          <option value="">Tất cả tác nhân</option>
          {adminList.map((a) => (
            <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
          ))}
        </select>

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
          filtered.map((log) => (
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
