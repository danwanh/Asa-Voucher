import { useState } from "react"
import { CheckCircle, Eye, EyeOff, AlertCircle, Camera } from "lucide-react"
import { C } from "@/utils/constants"
import type { AppUser } from "@/types"

interface Props {
  user: AppUser
  onLogout: () => void
}

export function StaffProfilePage({ user, onLogout }: Props) {
  const [form, setForm] = useState({ name: user.name, phone: "0901234567", address: "", dob: "", gender: "" })
  const [saved, setSaved] = useState(false)
  const [oldPw, setOldPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwError, setPwError] = useState("")
  const [pwSaved, setPwSaved] = useState(false)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const saveProfile = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const changePassword = () => {
    setPwError("")
    if (!oldPw) { setPwError("Vui lòng nhập mật khẩu hiện tại"); return }
    if (newPw.length < 8) { setPwError("Mật khẩu mới tối thiểu 8 ký tự"); return }
    if (newPw === oldPw) { setPwError("Mật khẩu mới không được trùng mật khẩu cũ"); return }
    if (newPw !== confirmPw) { setPwError("Mật khẩu xác nhận không khớp"); return }
    setPwSaved(true); setOldPw(""); setNewPw(""); setConfirmPw("")
    setTimeout(() => setPwSaved(false), 2000)
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border text-sm outline-none"
  const inputStyle = { borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif", backgroundColor: "white" }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Hồ sơ cá nhân</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b" style={{ borderColor: "#F0EDD8" }}>
          <div className="relative">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black" style={{ backgroundColor: C.apricot + "20", color: C.apricot }}>
              {user.name[0]}
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: C.peach, color: "white" }}>
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <div>
            <div className="font-black text-lg" style={{ color: C.indigo }}>{form.name}</div>
            <div className="text-sm" style={{ color: "#8A8DA8" }}>{user.email}</div>
            <div className="text-xs mt-1 font-semibold" style={{ color: C.teal }}>Nhân viên — Chi nhánh Nguyễn Trãi</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Họ và tên *</label>
            <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Email</label>
            <input className={inputCls + " opacity-60"} style={inputStyle} value={user.email} disabled />
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Số điện thoại</label>
            <input className={inputCls} style={inputStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Địa chỉ</label>
            <input className={inputCls} style={inputStyle} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Nhập địa chỉ" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Ngày sinh</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.dob} onChange={(e) => set("dob", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Giới tính</label>
              <select className={inputCls} style={inputStyle} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Chọn</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Chi nhánh</label>
            <input className={inputCls + " opacity-60"} style={inputStyle} value="Chi nhánh Nguyễn Trãi" disabled />
          </div>
        </div>

        {saved && <div className="mt-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ backgroundColor: C.teal + "20", color: "#2D7A52" }}><CheckCircle className="w-4 h-4" /> Đã lưu</div>}
        <button onClick={saveProfile} className="mt-6 w-full py-3 rounded-xl font-bold text-white" style={{ backgroundColor: C.peach }}>Lưu thay đổi</button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-black mb-5" style={{ color: C.indigo }}>Đổi mật khẩu</h2>
        <div className="space-y-4">
          {[
            { label: "Mật khẩu hiện tại", val: oldPw, set: setOldPw, show: showOld, toggle: () => setShowOld(!showOld) },
            { label: "Mật khẩu mới", val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(!showNew) },
            { label: "Xác nhận mật khẩu", val: confirmPw, set: setConfirmPw, show: false, toggle: () => {} },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>{f.label}</label>
              <div className="relative">
                <input type={f.show ? "text" : "password"} className={inputCls + " pr-11"} style={inputStyle} value={f.val} onChange={(e) => f.set(e.target.value)} placeholder="••••••••" />
                {f.label !== "Xác nhận mật khẩu" && (
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "#8A8DA8" }} onClick={f.toggle}>
                    {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {pwError && <div className="mt-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}><AlertCircle className="w-4 h-4" />{pwError}</div>}
        {pwSaved && <div className="mt-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ backgroundColor: C.teal + "20", color: "#2D7A52" }}><CheckCircle className="w-4 h-4" />Đổi mật khẩu thành công</div>}
        <button onClick={changePassword} className="mt-6 w-full py-3 rounded-xl font-bold text-white" style={{ backgroundColor: C.indigo }}>Cập nhật mật khẩu</button>
      </div>
    </div>
  )
}
