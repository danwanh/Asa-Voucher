import { useState } from "react"
import { Plus, Search, Edit2, Lock, Unlock, Key, X, CheckCircle } from "lucide-react"
import { C, STATUS_LABEL, statusColor } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { StaffMember } from "@/types"

const BRANCHES_LIST = [
  { id: "b1", name: "Chi nhánh Nguyễn Trãi" },
  { id: "b2", name: "Chi nhánh Lê Văn Sỹ" },
  { id: "b3", name: "Chi nhánh Quận 7" },
]

const STAFF_ROLES: { value: "voucher-creator" | "store-staff"; label: string; icon: string; desc: string }[] = [
  { value: "voucher-creator", label: "NV Tạo Voucher", icon: "tag", desc: "Tạo & quản lý voucher" },
  { value: "store-staff",     label: "NV Cửa hàng",   icon: "ticket", desc: "Xác thực voucher KH" },
]

const MOCK_STAFF: StaffMember[] = [
  { id: "s1", partnerId: "p1", branchId: "b1", branchName: "Chi nhánh Nguyễn Trãi", name: "Trần Văn Nam",    email: "nam@pizzahut.vn",  phone: "0901234567", username: "nam.tran",     status: "active", joinDate: "2024-01-15", staffRole: "voucher-creator" },
  { id: "s2", partnerId: "p1", branchId: "b1", branchName: "Chi nhánh Nguyễn Trãi", name: "Lê Thị Hoa",     email: "hoa@pizzahut.vn",  phone: "0912345678", username: "hoa.le",       status: "active", joinDate: "2024-02-20", staffRole: "store-staff" },
  { id: "s3", partnerId: "p1", branchId: "b2", branchName: "Chi nhánh Lê Văn Sỹ",   name: "Nguyễn Minh Tuấn", email: "tuan@pizzahut.vn", phone: "0923456789", username: "tuan.nguyen", status: "banned", joinDate: "2023-11-10", staffRole: "store-staff" },
]

type FormMode = "add" | "edit"

interface StaffForm {
  name: string; email: string; phone: string; username: string
  password: string; confirm: string
  branchId: string
  staffRole: "voucher-creator" | "store-staff"
}

const BLANK_FORM: StaffForm = {
  name: "", email: "", phone: "", username: "",
  password: "", confirm: "",
  branchId: "b1", staffRole: "store-staff",
}

export function StaffManagementPage() {
  const [staff, setStaff] = useState(MOCK_STAFF)
  const [search, setSearch] = useState("")
  const [formMode, setFormMode] = useState<FormMode>("add")
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formSaved, setFormSaved] = useState(false)
  const [resetPwId, setResetPwId] = useState<string | null>(null)
  const [form, setForm] = useState<StaffForm>(BLANK_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const filtered = staff.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setForm(BLANK_FORM)
    setFormErrors({})
    setFormMode("add")
    setFormSaved(false)
    setEditTarget(null)
    setShowForm(true)
  }

  const openEdit = (s: StaffMember) => {
    setForm({
      name: s.name, email: s.email, phone: s.phone, username: s.username,
      password: "", confirm: "",
      branchId: s.branchId,
      staffRole: s.staffRole ?? "store-staff",
    })
    setFormErrors({})
    setFormMode("edit")
    setFormSaved(false)
    setEditTarget(s)
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setFormSaved(false); setEditTarget(null) }

  const toggleStatus = (id: string) =>
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, status: s.status === "active" ? "banned" : "active" } : s))

  const validate = (mode: FormMode) => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Bắt buộc"
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email không hợp lệ"
    if (mode === "add") {
      if (form.password.length < 8) errs.password = "Tối thiểu 8 ký tự"
      if (form.password !== form.confirm) errs.confirm = "Không khớp"
    } else if (form.password && form.password.length < 8) {
      errs.password = "Tối thiểu 8 ký tự"
      if (form.password !== form.confirm) errs.confirm = "Không khớp"
    }
    return errs
  }

  const saveForm = () => {
    const errs = validate(formMode)
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return

    const branchName = BRANCHES_LIST.find((b) => b.id === form.branchId)?.name ?? "Chi nhánh"

    if (formMode === "add") {
      setStaff((prev) => [...prev, {
        id: "s" + Date.now(), partnerId: "p1",
        branchId: form.branchId, branchName,
        name: form.name, email: form.email, phone: form.phone,
        username: form.username || form.email.split("@")[0],
        status: "active", joinDate: new Date().toISOString().split("T")[0],
        staffRole: form.staffRole,
      }])
    } else if (editTarget) {
      setStaff((prev) => prev.map((s) => s.id === editTarget.id ? {
        ...s,
        name: form.name, email: form.email, phone: form.phone,
        username: form.username || s.username,
        branchId: form.branchId, branchName,
        staffRole: form.staffRole,
      } : s))
    }
    setFormSaved(true)
  }

  const roleLabel = (s: StaffMember) => {
    const r = STAFF_ROLES.find((r) => r.value === (s.staffRole ?? "store-staff"))
    return r?.label ?? "NV Cửa hàng"
  }

  const fld = (key: keyof StaffForm, label: string, ph: string, type = "text") => (
    <div key={key}>
      <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>{label}</label>
      <input
        type={type}
        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
        style={{ borderColor: formErrors[key] ? C.peach : "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
        placeholder={ph}
        value={form[key] as string}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
      />
      {formErrors[key] && <p className="text-xs mt-1" style={{ color: C.peach }}>{formErrors[key]}</p>}
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Quản lý Nhân viên</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>{staff.length} nhân viên</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: C.peach }}>
          <Plus className="w-4 h-4" /> Thêm nhân viên
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
        <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none bg-white" style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }} placeholder="Tìm nhân viên..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: C.eggshell }}>
              {["Nhân viên", "Email", "SĐT", "Vai trò", "Chi nhánh", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const sc = statusColor(s.status)
              const role = STAFF_ROLES.find((r) => r.value === (s.staffRole ?? "store-staff"))
              return (
                <tr key={s.id} className="border-t hover:bg-muted/30" style={{ borderColor: "#F0EDD8" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black" style={{ backgroundColor: C.peach + "20", color: C.peach }}>{s.name[0]}</div>
                      <div>
                        <div className="font-bold text-xs" style={{ color: C.indigo }}>{s.name}</div>
                        <div className="text-xs" style={{ color: "#8A8DA8" }}>@{s.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{s.email}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{s.phone}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1"
                      style={{
                        backgroundColor: s.staffRole === "voucher-creator" ? C.peach + "15" : C.teal + "15",
                        color: s.staffRole === "voucher-creator" ? C.peach : C.teal,
                      }}>
                      <span>{role?.icon}</span> {role?.label ?? "NV Cửa hàng"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{s.branchName}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>{STATUS_LABEL[s.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button title="Sửa thông tin" onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Edit2 className="w-3.5 h-3.5" style={{ color: C.indigo }} />
                      </button>
                      <button title={s.status === "active" ? "Khóa tài khoản" : "Mở khóa"} onClick={() => toggleStatus(s.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        {s.status === "active" ? <Lock className="w-3.5 h-3.5" style={{ color: C.peach }} /> : <Unlock className="w-3.5 h-3.5" style={{ color: C.teal }} />}
                      </button>
                      <button title="Đặt lại mật khẩu" onClick={() => setResetPwId(s.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Key className="w-3.5 h-3.5" style={{ color: "#8A8DA8" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12"><AppIcon name="users" className="w-8 h-8 mb-2 mx-auto" /><div className="font-bold text-sm" style={{ color: C.indigo }}>Không tìm thấy nhân viên</div></div>
        )}
      </div>

      {/* Add / Edit staff modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {formSaved ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: C.teal + "20" }}>
                  <CheckCircle className="w-7 h-7" style={{ color: C.teal }} />
                </div>
                <h2 className="text-lg font-black mb-1" style={{ color: C.indigo }}>
                  {formMode === "add" ? "Thêm nhân viên thành công!" : "Cập nhật thành công!"}
                </h2>
                <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>
                  {formMode === "edit" ? `Thông tin của ${editTarget?.name} đã được cập nhật.` : "Nhân viên mới đã được thêm vào hệ thống."}
                </p>
                <button onClick={closeForm} className="px-6 py-2.5 rounded-xl font-bold text-white" style={{ backgroundColor: C.peach }}>
                  Đóng
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-black" style={{ color: C.indigo }}>
                    {formMode === "add" ? "Thêm Nhân viên" : `Chỉnh sửa: ${editTarget?.name}`}
                  </h2>
                  <button onClick={closeForm}><X className="w-5 h-5" style={{ color: "#8A8DA8" }} /></button>
                </div>

                <div className="space-y-4">
                  {/* Role selection */}
                  <div>
                    <label className="text-sm font-bold block mb-2" style={{ color: C.indigo }}>Vai trò nhân viên *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {STAFF_ROLES.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, staffRole: r.value }))}
                          className="flex flex-col items-center p-3 rounded-xl border-2 text-center transition-all"
                          style={{
                            borderColor: form.staffRole === r.value ? C.peach : "#E2DFC8",
                            backgroundColor: form.staffRole === r.value ? C.peach + "10" : "white",
                          }}
                        >
                          <div className="text-xl mb-1">{r.icon}</div>
                          <div className="text-xs font-bold" style={{ color: C.indigo }}>{r.label}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>{r.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Chi nhánh phụ trách *</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif", backgroundColor: "white", color: C.indigo }}
                      value={form.branchId}
                      onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                    >
                      {BRANCHES_LIST.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>

                  {fld("name", "Họ tên *", "Nguyễn Văn A")}
                  {fld("email", "Email *", "email@company.vn")}
                  {fld("phone", "Số điện thoại", "0901234567")}
                  {fld("username", "Tên đăng nhập", "ten.nhanvien")}

                  <div>
                    <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>
                      {formMode === "add" ? "Mật khẩu *" : "Mật khẩu mới (để trống nếu không đổi)"}
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                      style={{ borderColor: formErrors.password ? C.peach : "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                      placeholder="Tối thiểu 8 ký tự"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    />
                    {formErrors.password && <p className="text-xs mt-1" style={{ color: C.peach }}>{formErrors.password}</p>}
                  </div>

                  {(formMode === "add" || form.password) && (
                    <div>
                      <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Xác nhận mật khẩu *</label>
                      <input
                        type="password"
                        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                        style={{ borderColor: formErrors.confirm ? C.peach : "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                        placeholder="Nhập lại mật khẩu"
                        value={form.confirm}
                        onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                      />
                      {formErrors.confirm && <p className="text-xs mt-1" style={{ color: C.peach }}>{formErrors.confirm}</p>}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={saveForm} className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: C.peach }}>
                    {formMode === "add" ? "Thêm nhân viên" : "Lưu thay đổi"}
                  </button>
                  <button onClick={closeForm} className="px-6 py-2.5 rounded-xl font-bold border text-sm" style={{ borderColor: "#E2DFC8", color: C.indigo }}>Hủy</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reset password confirm */}
      {resetPwId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
            <h3 className="font-black text-lg mb-2" style={{ color: C.indigo }}>Đặt lại mật khẩu?</h3>
            <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>Mật khẩu mới sẽ được gửi qua email của nhân viên. Nhân viên sẽ cần đổi mật khẩu khi đăng nhập lần tiếp theo.</p>
            <div className="flex gap-3">
              <button onClick={() => setResetPwId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: C.indigo }}>Xác nhận gửi</button>
              <button onClick={() => setResetPwId(null)} className="flex-1 py-2.5 rounded-xl font-bold border text-sm" style={{ borderColor: "#E2DFC8", color: C.indigo }}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
