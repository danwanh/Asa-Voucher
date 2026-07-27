import { useState } from "react"
import { LogOut, CheckCircle, Eye, EyeOff, Lock, AlertCircle, Camera, User } from "lucide-react"
import { C } from "@/utils/constants"
import type { AppUser } from "@/types"

interface Props {
  user: AppUser
  onLogout: () => void
}

export function ProfilePage({ user, onLogout }: Props) {
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState("0901234567")
  const [address, setAddress] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("")
  const [saved, setSaved] = useState(false)
  const [avatarHover, setAvatarHover] = useState(false)

  const [oldPw, setOldPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState("")

  const saveProfile = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const changePassword = () => {
    setPwError("")
    if (!oldPw) { setPwError("Vui lòng nhập mật khẩu hiện tại"); return }
    if (newPw.length < 8) { setPwError("Mật khẩu mới phải có ít nhất 8 ký tự"); return }
    if (newPw === oldPw) { setPwError("Mật khẩu mới không được trùng mật khẩu cũ"); return }
    if (newPw !== confirmPw) { setPwError("Mật khẩu xác nhận không khớp"); return }
    setPwSaved(true)
    setOldPw(""); setNewPw(""); setConfirmPw("")
    setTimeout(() => setPwSaved(false), 3000)
  }

  const inputStyle = { borderColor: "#E2DFC8", backgroundColor: C.eggshell, fontFamily: "'Inter', sans-serif" }
  const inputCls = "w-full px-4 py-3 rounded-2xl border text-sm outline-none"

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Hồ sơ cá nhân</h1>

      {/* Profile card */}
      <div className="bg-card rounded-3xl p-6 shadow-sm">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b" style={{ borderColor: "#F0EDD8" }}>
          <div className="relative flex-shrink-0" onMouseEnter={() => setAvatarHover(true)} onMouseLeave={() => setAvatarHover(false)}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black overflow-hidden" style={{ backgroundColor: C.peach + "20", color: C.peach }}>
              <User className="w-10 h-10" />
            </div>
            {avatarHover && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="font-black text-lg" style={{ color: C.indigo }}>{name || user.name}</div>
            <div className="text-sm mb-2" style={{ color: "#8A8DA8" }}>{user.email}</div>
            <button className="text-xs font-semibold px-3 py-1 rounded-lg" style={{ backgroundColor: C.peach + "15", color: C.peach }}>
              Đổi ảnh đại diện
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Họ và tên <span style={{ color: C.peach }}>*</span></label>
            <input className={inputCls} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập họ và tên" />
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Email</label>
            <input className={inputCls + " opacity-60"} style={inputStyle} value={user.email} disabled />
            <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Email không thể thay đổi</p>
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Số điện thoại <span style={{ color: C.peach }}>*</span></label>
            <input className={inputCls} style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Địa chỉ</label>
            <textarea
              className={inputCls + " resize-none"}
              style={inputStyle}
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Nhập địa chỉ (tối đa 255 ký tự)"
              maxLength={255}
            />
            <p className="text-xs mt-1 text-right" style={{ color: "#8A8DA8" }}>{address.length}/255</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Ngày sinh</label>
              <input type="date" className={inputCls} style={inputStyle} value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Giới tính</label>
              <select
                className={inputCls}
                style={inputStyle}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Chọn giới tính</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
        </div>

        {saved && (
          <div className="mt-4 p-3 rounded-2xl text-sm flex items-center gap-2" style={{ backgroundColor: C.teal + "20", color: "#2D7A52" }}>
            <CheckCircle className="w-4 h-4" /> Đã lưu thay đổi
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={saveProfile} className="flex-1 py-3 rounded-2xl font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: C.peach }}>
            Lưu thay đổi
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold border transition-colors hover:bg-muted" style={{ borderColor: "#E2DFC8", color: C.indigo }}>
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </div>

      {/* Change password card */}
      <div className="bg-card rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: C.indigo + "10" }}>
            <Lock className="w-4 h-4" style={{ color: C.indigo }} />
          </div>
          <h2 className="text-lg font-black" style={{ color: C.indigo }}>Đổi mật khẩu</h2>
        </div>

        <div className="space-y-4">
          {[
            { label: "Mật khẩu hiện tại", val: oldPw, set: setOldPw, show: showOld, toggle: () => setShowOld(!showOld), ph: "••••••••" },
            { label: "Mật khẩu mới", val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(!showNew), ph: "Tối thiểu 8 ký tự" },
            { label: "Xác nhận mật khẩu mới", val: confirmPw, set: setConfirmPw, show: showConfirm, toggle: () => setShowConfirm(!showConfirm), ph: "••••••••" },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>{f.label}</label>
              <div className="relative">
                <input
                  type={f.show ? "text" : "password"}
                  className="w-full px-4 py-3 pr-11 rounded-2xl border text-sm outline-none"
                  style={{
                    ...inputStyle,
                    borderColor: f.label.includes("Xác nhận") && f.val && f.val !== newPw ? C.peach : "#E2DFC8",
                  }}
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.ph}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "#8A8DA8" }} onClick={f.toggle}>
                  {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {f.label === "Mật khẩu mới" && newPw.length > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{
                      backgroundColor: newPw.length < 8 && i === 1 ? C.peach : newPw.length >= 8 && newPw.length < 12 && i <= 2 ? C.apricot : newPw.length >= 12 ? C.teal : "#E2DFC8",
                    }} />
                  ))}
                  <span className="text-xs ml-1" style={{ color: "#8A8DA8" }}>
                    {newPw.length < 8 ? "Yếu" : newPw.length < 12 ? "Trung bình" : "Mạnh"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {pwError && (
          <div className="mt-4 p-3 rounded-2xl text-sm flex items-center gap-2" style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {pwError}
          </div>
        )}
        {pwSaved && (
          <div className="mt-4 p-3 rounded-2xl text-sm flex items-center gap-2" style={{ backgroundColor: C.teal + "20", color: "#2D7A52" }}>
            <CheckCircle className="w-4 h-4" /> Đổi mật khẩu thành công
          </div>
        )}

        <button onClick={changePassword} className="mt-6 w-full py-3 rounded-2xl font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: C.indigo }}>
          Cập nhật mật khẩu
        </button>
      </div>
    </div>
  )
}
