import { useEffect, useState, useCallback } from "react"
import { AlertTriangle, Shield, Lock, Unlock, Eye, CheckCircle2, XCircle, Wifi, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { AdminPageHeader } from "@/components/admin/AdminPageHeader"
import { securityService, type SecurityAlertItem } from "@/services/securityService"

const TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  brute_force:     { label: "Đăng nhập thất bại",    color: "#DC2626", icon: <XCircle className="w-3.5 h-3.5" /> },
  unusual_ip:      { label: "IP bất thường",          color: "#D97706", icon: <Wifi className="w-3.5 h-3.5" /> },
  multiple_device: { label: "Nhiều thiết bị",         color: "#7C3AED", icon: <Shield className="w-3.5 h-3.5" /> },
  suspicious_time: { label: "Thời gian bất thường",   color: "#0891B2", icon: <Clock className="w-3.5 h-3.5" /> },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  open:     { label: "Chưa xử lý",  bg: "#FEF2F2", color: "#DC2626" },
  reviewed: { label: "Đã xem xét", bg: "#F0FDF4", color: "#16A34A" },
  locked:   { label: "Đã khóa TK", bg: "#FFF7ED", color: "#D97706" },
}

export function SecurityMonitorPage() {
  const [allAlerts, setAllAlerts] = useState<SecurityAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | string>("all")
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [detailAlert, setDetailAlert] = useState<SecurityAlertItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await securityService.listAlerts({ limit: 100 })
      setAllAlerts(result.items)
    } catch {
      setAllAlerts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Table only shows the alerts matching the active filter; counts below
  // always come from allAlerts so switching tabs never moves the stat numbers.
  const alerts = filter === "all" ? allAlerts : allAlerts.filter((a) => a.status === filter)

  const PAGE_SIZE = 20
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [filter])
  const totalPages = Math.max(1, Math.ceil(alerts.length / PAGE_SIZE))
  const pageAlerts = alerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const goPrevPage = () => setPage((p) => (p === 1 ? totalPages : p - 1))
  const goNextPage = () => setPage((p) => (p === totalPages ? 1 : p + 1))

  const openCount = allAlerts.filter((a) => a.status === "open").length
  const reviewedCount = allAlerts.filter((a) => a.status === "reviewed").length
  const lockedCount = allAlerts.filter((a) => a.status === "locked").length
  const filterCounts: Record<string, number> = {
    all: allAlerts.length,
    open: openCount,
    reviewed: reviewedCount,
    locked: lockedCount,
  }

  const handleLock = async (id: string) => {
    setActionLoading(true)
    try {
      await securityService.lockAccount(id)
      setAllAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "locked" } : a))
      toast.success("Đã khóa tài khoản")
    } catch {
      toast.error("Không thể khóa tài khoản")
    } finally {
      setActionLoading(false)
      setConfirmId(null)
    }
  }

  const handleUnlock = async (id: string) => {
    setActionLoading(true)
    try {
      await securityService.unlockAccount(id)
      setAllAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "reviewed" } : a))
      toast.success("Đã mở khóa tài khoản")
    } catch {
      toast.error("Không thể mở khóa tài khoản")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReview = async (id: string) => {
    try {
      await securityService.reviewAlert(id)
      setAllAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "reviewed" } : a))
      toast.success("Đã đánh dấu đã xem xét")
    } catch {
      toast.error("Không thể cập nhật trạng thái")
    }
  }

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const full = await securityService.getAlert(id)
      setDetailAlert(full)
    } catch {
      toast.error("Không thể tải chi tiết cảnh báo")
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Giám sát Bảo mật"
        subtitle="Phát hiện đăng nhập bất thường, quản lý cảnh báo và khóa tài khoản nghi vấn"
        onReload={loadData}
        loading={loading}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Cảnh báo chưa xử lý", value: openCount, color: "#DC2626", bg: "#FEF2F2" },
          { label: "Đã xem xét", value: reviewedCount, color: "#16A34A", bg: "#F0FDF4" },
          { label: "Tài khoản đã khóa", value: lockedCount, color: "#D97706", bg: "#FFF7ED" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0 tabular-nums" style={{ backgroundColor: s.bg, color: s.color }}>
              {s.value}
            </div>
            <div className="text-sm font-semibold" style={{ color: C.indigo }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(["all", "open", "reviewed", "locked"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5"
            style={{
              backgroundColor: filter === f ? C.indigo : "white",
              color: filter === f ? "white" : "#6B7280",
              border: `1px solid ${filter === f ? C.indigo : "#E5E7EB"}`,
            }}
          >
            {{ all: "Tất cả", open: "Chưa xử lý", reviewed: "Đã xem xét", locked: "Đã khóa" }[f]}
            <span
              className="px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums"
              style={{
                backgroundColor: filter === f ? "rgba(255,255,255,0.25)" : "#F3F4F6",
                color: filter === f ? "white" : "#6B7280",
              }}
            >
              {filterCounts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-20">
            <AppIcon name="clock" className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: C.indigo }} />
            <div className="font-bold text-sm" style={{ color: C.indigo }}>Đang tải cảnh báo...</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#FAFAF7" }}>
                {["Người dùng", "Loại cảnh báo", "Chi tiết", "IP / Thời gian", "Trạng thái", "Thao tác"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageAlerts.map((a) => {
                const typeInfo = TYPE_LABELS[a.alertType] ?? { label: a.alertType, color: "#6B7280", icon: <AlertTriangle className="w-3.5 h-3.5" /> }
                const statusInfo = STATUS_CONFIG[a.status] ?? { label: a.status, bg: "#F3F4F6", color: "#6B7280" }
                return (
                  <tr key={a.id} className="border-t hover:bg-muted/20" style={{ borderColor: "#F0EDD8" }}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-xs" style={{ color: C.indigo }}>{a.userName}</div>
                      <div className="text-xs" style={{ color: "#8A8DA8" }}>{a.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: typeInfo.color }}>
                        {typeInfo.icon} {typeInfo.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-52">
                      <div className="text-xs" style={{ color: "#6B7280" }}>{a.detail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs block" style={{ color: "#8A8DA8" }}>{a.ipAddress}</code>
                      <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{new Date(a.createdAt).toLocaleString("vi-VN")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {a.status === "open" && (
                          <>
                            <button onClick={() => handleReview(a.id)} className="p-1.5 rounded-lg hover:bg-green-50 transition-colors" title="Đánh dấu đã xem">
                              <CheckCircle2 className="w-4 h-4" style={{ color: "#16A34A" }} />
                            </button>
                            <button onClick={() => setConfirmId(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Khóa tài khoản">
                              <Lock className="w-4 h-4" style={{ color: "#DC2626" }} />
                            </button>
                          </>
                        )}
                        {a.status === "reviewed" && (
                          <button onClick={() => setConfirmId(a.id)} className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors" title="Khóa tài khoản">
                            <Lock className="w-4 h-4" style={{ color: "#D97706" }} />
                          </button>
                        )}
                        {a.status === "locked" && (
                          <button onClick={() => handleUnlock(a.id)} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Mở khóa">
                            <Unlock className="w-4 h-4" style={{ color: "#0891B2" }} />
                          </button>
                        )}
                          <button onClick={() => handleViewDetail(a.id)} disabled={detailLoading} className="p-1.5 rounded-lg hover:bg-muted/30 transition-colors disabled:opacity-50" title="Xem chi tiết">
                            <Eye className="w-4 h-4" style={{ color: "#8A8DA8" }} />
                          </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && alerts.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: "#8A8DA8" }}>Không có cảnh báo nào</div>
        )}
        {!loading && alerts.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "#F0EDD8" }}>
            <div className="text-xs" style={{ color: "#8A8DA8" }}>
              Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, alerts.length)} / {alerts.length}
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

      {/* Confirm lock dialog */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#FEF2F2" }}>
              <AlertTriangle className="w-6 h-6" style={{ color: "#DC2626" }} />
            </div>
            <h3 className="text-lg font-black text-center mb-2" style={{ color: C.indigo }}>Xác nhận khóa tài khoản</h3>
            <p className="text-sm text-center mb-6" style={{ color: "#6B7280" }}>
              Tài khoản sẽ bị khóa tạm thời và không thể đăng nhập. Bạn có thể mở khóa sau.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl border font-bold text-sm" style={{ borderColor: "#E5E7EB", color: "#6B7280" }}>
                Huỷ
              </button>
              <button onClick={() => handleLock(confirmId)} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2" style={{ backgroundColor: "#DC2626" }}>
                {actionLoading && <AppIcon name="clock" className="w-4 h-4 animate-spin" />}
                {actionLoading ? "Đang xử lý..." : "Khóa tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      {detailAlert && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: C.indigo }}>Chi tiết cảnh báo</h3>
              <button onClick={() => setDetailAlert(null)} className="p-1 rounded-lg hover:bg-muted/30">
                <XCircle className="w-5 h-5" style={{ color: "#8A8DA8" }} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Người dùng</div>
                <div className="font-bold" style={{ color: C.indigo }}>{detailAlert.userName}</div>
                <div style={{ color: "#6B7280" }}>{detailAlert.email}</div>
              </div>

              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Loại cảnh báo</div>
                <div style={{ color: C.indigo }}>{TYPE_LABELS[detailAlert.alertType]?.label ?? detailAlert.alertType}</div>
              </div>

              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Chi tiết</div>
                <div style={{ color: "#6B7280" }}>{detailAlert.detail || "Không có mô tả"}</div>
              </div>

              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Địa chỉ IP</div>
                <code style={{ color: "#6B7280" }}>{detailAlert.ipAddress || "—"}</code>
              </div>

              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Thời gian</div>
                <div style={{ color: "#6B7280" }}>{new Date(detailAlert.createdAt).toLocaleString("vi-VN")}</div>
              </div>

              <div>
                <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Trạng thái</div>
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-xs font-bold mt-1"
                  style={{
                    backgroundColor: STATUS_CONFIG[detailAlert.status]?.bg,
                    color: STATUS_CONFIG[detailAlert.status]?.color,
                  }}
                >
                  {STATUS_CONFIG[detailAlert.status]?.label ?? detailAlert.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}