import { useState } from "react"
import { AlertTriangle, Shield, Lock, Unlock, Eye, CheckCircle2, XCircle, Wifi, Clock } from "lucide-react"
import { C } from "@/utils/constants"

interface SecurityAlert {
  id: string
  userId: string
  userName: string
  email: string
  type: "brute_force" | "unusual_ip" | "multiple_device" | "suspicious_time"
  detail: string
  ip: string
  time: string
  status: "open" | "reviewed" | "locked"
}

const MOCK_ALERTS: SecurityAlert[] = [
  { id: "a1", userId: "u1", userName: "Nguyễn Văn A",   email: "nguyenvana@gmail.com", type: "brute_force",     detail: "7 lần đăng nhập thất bại trong 10 phút",    ip: "113.161.44.12",  time: "2025-07-19 08:14", status: "open" },
  { id: "a2", userId: "u2", userName: "Trần Thị Bích",  email: "bich.tran@mail.vn",   type: "unusual_ip",      detail: "Đăng nhập từ IP bất thường (Singapore)",    ip: "203.177.12.88",  time: "2025-07-19 09:30", status: "open" },
  { id: "a3", userId: "u3", userName: "Lê Minh Quân",   email: "quanle@company.vn",   type: "multiple_device",  detail: "Đăng nhập đồng thời từ 3 thiết bị khác nhau", ip: "42.112.55.201",  time: "2025-07-18 22:45", status: "reviewed" },
  { id: "a4", userId: "u4", userName: "Phạm Thu Hà",    email: "ha.pham@biz.vn",      type: "suspicious_time",  detail: "Đăng nhập lúc 3:21 sáng — ngoài giờ thường", ip: "1.55.102.44",   time: "2025-07-18 03:21", status: "locked" },
  { id: "a5", userId: "u5", userName: "Võ Đức Thành",   email: "thanh.vo@test.vn",    type: "brute_force",      detail: "5 lần thất bại, tài khoản đã tạm khóa 15 phút", ip: "118.70.13.55",  time: "2025-07-17 16:02", status: "locked" },
  { id: "a6", userId: "u6", userName: "Hoàng Yến Nhi",  email: "nhihy@gmail.com",     type: "unusual_ip",       detail: "Đăng nhập từ IP chưa từng thấy trước đây",  ip: "103.9.188.4",   time: "2025-07-17 11:18", status: "reviewed" },
]

const TYPE_LABELS: Record<SecurityAlert["type"], { label: string; color: string; icon: React.ReactNode }> = {
  brute_force:     { label: "Đăng nhập thất bại",    color: "#DC2626", icon: <XCircle className="w-3.5 h-3.5" /> },
  unusual_ip:      { label: "IP bất thường",          color: "#D97706", icon: <Wifi className="w-3.5 h-3.5" /> },
  multiple_device: { label: "Nhiều thiết bị",         color: "#7C3AED", icon: <Shield className="w-3.5 h-3.5" /> },
  suspicious_time: { label: "Thời gian bất thường",   color: "#0891B2", icon: <Clock className="w-3.5 h-3.5" /> },
}

const STATUS_CONFIG: Record<SecurityAlert["status"], { label: string; bg: string; color: string }> = {
  open:     { label: "Chưa xử lý",  bg: "#FEF2F2", color: "#DC2626" },
  reviewed: { label: "Đã xem xét", bg: "#F0FDF4", color: "#16A34A" },
  locked:   { label: "Đã khóa TK", bg: "#FFF7ED", color: "#D97706" },
}

export function SecurityMonitorPage() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS)
  const [filter, setFilter] = useState<"all" | SecurityAlert["status"]>("all")
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const visible = filter === "all" ? alerts : alerts.filter((a) => a.status === filter)

  const lockAccount = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "locked" } : a))
    setConfirmId(null)
  }
  const markReviewed = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "reviewed" } : a))
  }

  const openCount = alerts.filter((a) => a.status === "open").length

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Giám sát Bảo mật</h1>
        <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Phát hiện đăng nhập bất thường, quản lý cảnh báo và khóa tài khoản nghi vấn</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Cảnh báo chưa xử lý", value: openCount,                                          color: "#DC2626", bg: "#FEF2F2" },
          { label: "Đã xem xét",           value: alerts.filter((a) => a.status === "reviewed").length, color: "#16A34A", bg: "#F0FDF4" },
          { label: "Tài khoản đã khóa",    value: alerts.filter((a) => a.status === "locked").length,   color: "#D97706", bg: "#FFF7ED" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0" style={{ backgroundColor: s.bg, color: s.color }}>
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
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              backgroundColor: filter === f ? C.indigo : "white",
              color: filter === f ? "white" : "#6B7280",
              border: `1px solid ${filter === f ? C.indigo : "#E5E7EB"}`,
            }}
          >
            {{ all: "Tất cả", open: "Chưa xử lý", reviewed: "Đã xem", locked: "Đã khóa" }[f]}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#FAFAF7" }}>
              {["Người dùng", "Loại cảnh báo", "Chi tiết", "IP / Thời gian", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => {
              const typeInfo   = TYPE_LABELS[a.type]
              const statusInfo = STATUS_CONFIG[a.status]
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
                    <code className="text-xs block" style={{ color: "#8A8DA8" }}>{a.ip}</code>
                    <div className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{a.time}</div>
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
                          <button onClick={() => markReviewed(a.id)} className="p-1.5 rounded-lg hover:bg-green-50 transition-colors" title="Đánh dấu đã xem">
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
                        <button onClick={() => setAlerts((p) => p.map((x) => x.id === a.id ? { ...x, status: "reviewed" } : x))} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Mở khóa">
                          <Unlock className="w-4 h-4" style={{ color: "#0891B2" }} />
                        </button>
                      )}
                      <button className="p-1.5 rounded-lg hover:bg-muted/30 transition-colors" title="Xem chi tiết">
                        <Eye className="w-4 h-4" style={{ color: "#8A8DA8" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: "#8A8DA8" }}>Không có cảnh báo nào</div>
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
              <button onClick={() => setConfirmId(null)} className="flex-1 py-2.5 rounded-xl border font-bold text-sm" style={{ borderColor: "#E5E7EB", color: "#6B7280" }}>
                Huỷ
              </button>
              <button onClick={() => lockAccount(confirmId)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: "#DC2626" }}>
                Khóa tài khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
