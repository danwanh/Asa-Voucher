import { useState } from "react"
import { Search, Plus, X, Lock, Unlock, RefreshCw, UserCheck, ChevronDown } from "lucide-react"
import { C, fmtDate, STATUS_LABEL, statusColor } from "@/utils/constants"
import { PARTNERS } from "@/data/mock"
import type { StaffMember } from "@/types"

const MOCK_STAFF: StaffMember[] = [
  { id: "s1", partnerId: "p1", branchId: "b1", branchName: "Pizza Hut Q.1", name: "Trần Văn Nam", email: "staff@asa.vn", phone: "0912345678", username: "staff_nam", status: "active", joinDate: "2025-01-15" },
  { id: "s2", partnerId: "p1", branchId: "b2", branchName: "Pizza Hut Q.3", name: "Lê Thị Hoa", email: "hoa.le@pizza.vn", phone: "0923456789", username: "staff_hoa", status: "active", joinDate: "2025-03-20" },
  { id: "s3", partnerId: "p2", branchId: "b3", branchName: "CGV Vincom", name: "Nguyễn Minh Tú", email: "tu.nguyen@cgv.vn", phone: "0934567890", username: "staff_tu", status: "banned", joinDate: "2025-05-10" },
  { id: "s4", partnerId: "p3", branchId: "b4", branchName: "Calla Spa Q.7", name: "Phạm Thị Lan", email: "lan.pham@calla.vn", phone: "0945678901", username: "staff_lan", status: "active", joinDate: "2025-06-01" },
  { id: "s5", partnerId: "p1", branchId: "b1", branchName: "Pizza Hut Q.1", name: "Võ Văn Bình", email: "binh.vo@pizza.vn", phone: "0956789012", username: "staff_binh", status: "active", joinDate: "2025-07-01" },
]

const PARTNER_OPTIONS = [
  { value: "all", label: "Tất cả doanh nghiệp" },
  { value: "p1", label: "Pizza Hut Vietnam" },
  { value: "p2", label: "CGV Cinemas" },
  { value: "p3", label: "Calla Spa" },
]

export function AdminStaffPage() {
  const [search, setSearch] = useState("")
  const [filterPartner, setFilterPartner] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [staff, setStaff] = useState<StaffMember[]>(MOCK_STAFF)
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState<{ type: "lock" | "unlock" | "reset"; id: string } | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", partnerId: "p1", branchId: "b1", username: "" })

  const filtered = staff.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
    const matchPartner = filterPartner === "all" || s.partnerId === filterPartner
    const matchStatus = filterStatus === "all" || s.status === filterStatus
    return matchSearch && matchPartner && matchStatus
  })

  const toggleStatus = (id: string) => {
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, status: s.status === "active" ? "banned" : "active" } : s))
    setShowConfirm(null)
  }

  const addStaff = () => {
    if (!form.name || !form.email) return
    const newStaff: StaffMember = {
      id: `s${Date.now()}`, partnerId: form.partnerId, branchId: form.branchId, branchName: "Chi nhánh",
      name: form.name, email: form.email, phone: form.phone, username: form.username || form.email.split("@")[0],
      status: "active", joinDate: new Date().toISOString().split("T")[0],
    }
    setStaff((prev) => [newStaff, ...prev])
    setShowModal(false)
    setForm({ name: "", email: "", phone: "", partnerId: "p1", branchId: "b1", username: "" })
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Quản lý Nhân viên</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>Tất cả nhân viên của các doanh nghiệp đối tác</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
          style={{ backgroundColor: C.indigo }}
        >
          <Plus className="w-4 h-4" /> Thêm nhân viên
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm nhân viên..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none bg-white" style={{ borderColor: "#E5E7EB" }} />
        </div>
        <select value={filterPartner} onChange={(e) => setFilterPartner(e.target.value)} className="px-3 py-2.5 rounded-xl border text-sm outline-none bg-white" style={{ borderColor: "#E5E7EB", color: C.indigo }}>
          {PARTNER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 rounded-xl border text-sm outline-none bg-white" style={{ borderColor: "#E5E7EB", color: C.indigo }}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="banned">Bị khóa</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Tổng nhân viên", value: staff.length, color: C.indigo },
          { label: "Đang hoạt động", value: staff.filter((s) => s.status === "active").length, color: "#2D7A52" },
          { label: "Bị khóa", value: staff.filter((s) => s.status === "banned").length, color: "#C0392B" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/5 text-center">
            <div className="text-2xl font-black" style={{ color: s.color, fontFamily: "'Nunito', sans-serif" }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: C.eggshell }}>
                {["Nhân viên", "Doanh nghiệp / Chi nhánh", "Liên hệ", "Username", "Ngày tham gia", "Trạng thái", "Hành động"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold" style={{ color: "#6B7280" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const sc = statusColor(s.status)
                return (
                  <tr key={s.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: "#F3F4F6" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: C.indigo }}>
                          {s.name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: C.indigo }}>{s.name}</div>
                          <div className="text-xs" style={{ color: "#9CA3AF" }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold" style={{ color: C.indigo }}>
                        {PARTNER_OPTIONS.find((p) => p.value === s.partnerId)?.label || s.partnerId}
                      </div>
                      <div className="text-xs" style={{ color: "#9CA3AF" }}>{s.branchName}</div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#6B7280" }}>{s.phone}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs px-2 py-0.5 rounded-lg" style={{ backgroundColor: C.muted, color: C.indigo }}>{s.username}</code>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#6B7280" }}>{fmtDate(s.joinDate)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowConfirm({ type: s.status === "active" ? "lock" : "unlock", id: s.id })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title={s.status === "active" ? "Khóa" : "Mở khóa"}
                        >
                          {s.status === "active"
                            ? <Lock className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                            : <Unlock className="w-3.5 h-3.5" style={{ color: "#2D7A52" }} />}
                        </button>
                        <button
                          onClick={() => setShowConfirm({ type: "reset", id: s.id })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Reset mật khẩu"
                        >
                          <RefreshCw className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <UserCheck className="w-10 h-10 mx-auto mb-2" style={{ color: "#D1D5DB" }} />
              <div className="text-sm font-bold" style={{ color: "#6B7280" }}>Không tìm thấy nhân viên</div>
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Thêm nhân viên</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" style={{ color: "#6B7280" }} /></button>
            </div>
            <div className="space-y-3">
              {[
                { key: "name", label: "Họ và tên *", type: "text" },
                { key: "email", label: "Email *", type: "email" },
                { key: "phone", label: "Số điện thoại", type: "tel" },
                { key: "username", label: "Username", type: "text" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-bold mb-1" style={{ color: "#6B7280" }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: "#E5E7EB" }}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "#6B7280" }}>Doanh nghiệp</label>
                <select value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E5E7EB" }}>
                  {PARTNER_OPTIONS.filter((p) => p.value !== "all").map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Hủy</button>
              <button onClick={addStaff} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: C.indigo }}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <div className="text-3xl mb-3">{showConfirm.type === "lock" ? "🔒" : showConfirm.type === "unlock" ? "🔓" : "🔑"}</div>
            <h3 className="font-black text-lg mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
              {showConfirm.type === "lock" ? "Khóa tài khoản?" : showConfirm.type === "unlock" ? "Mở khóa tài khoản?" : "Reset mật khẩu?"}
            </h3>
            <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
              {showConfirm.type === "reset" ? "Mật khẩu sẽ được đặt lại về mặc định và gửi qua email." : "Bạn có chắc muốn thực hiện hành động này?"}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Hủy</button>
              <button
                onClick={() => showConfirm.type !== "reset" ? toggleStatus(showConfirm.id) : setShowConfirm(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                style={{ backgroundColor: showConfirm.type === "lock" ? "#EF4444" : C.teal }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
