import { useState } from "react"
import { Camera, Eye, EyeOff, Save, CheckCircle2 } from "lucide-react"
import { C } from "@/utils/constants"
import type { AppUser } from "@/types"

interface Props {
  user: AppUser
  onLogout: () => void
}

export function AdminProfilePage({ user, onLogout }: Props) {
  const [info, setInfo] = useState({ name: user.name, email: user.email, phone: "0901234567" })
  const [pwd, setPwd] = useState({ old: "", new: "", confirm: "" })
  const [showPwd, setShowPwd] = useState({ old: false, new: false, confirm: false })
  const [savedInfo, setSavedInfo] = useState(false)
  const [savedPwd, setSavedPwd] = useState(false)
  const [pwdError, setPwdError] = useState("")

  const saveInfo = () => {
    setSavedInfo(true)
    setTimeout(() => setSavedInfo(false), 2500)
  }

  const savePwd = () => {
    if (!pwd.old) { setPwdError("Vui lòng nhập mật khẩu hiện tại"); return }
    if (pwd.new.length < 8) { setPwdError("Mật khẩu mới tối thiểu 8 ký tự"); return }
    if (pwd.new !== pwd.confirm) { setPwdError("Xác nhận mật khẩu không khớp"); return }
    setPwdError("")
    setSavedPwd(true)
    setPwd({ old: "", new: "", confirm: "" })
    setTimeout(() => setSavedPwd(false), 2500)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Hồ sơ Admin</h1>

      {/* Avatar */}
      <div className="bg-white rounded-2xl p-6 border border-black/5 mb-5 flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white" style={{ background: `linear-gradient(135deg, ${C.indigo}, #4D5170)` }}>
            {user.name[0]}
          </div>
          <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: C.peach }}>
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div>
          <div className="font-black text-lg" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{user.name}</div>
          <div className="text-sm" style={{ color: "#6B7280" }}>{user.email}</div>
          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-xs font-bold" style={{ backgroundColor: `${C.indigo}15`, color: C.indigo }}>
            🛡️ Quản trị viên hệ thống
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl p-6 border border-black/5 mb-5">
        <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Thông tin cá nhân</h3>
        <div className="space-y-4">
          {[
            { key: "name", label: "Họ và tên", type: "text" },
            { key: "email", label: "Email", type: "email" },
            { key: "phone", label: "Số điện thoại", type: "tel" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>{f.label}</label>
              <input
                type={f.type}
                value={info[f.key as keyof typeof info]}
                onChange={(e) => setInfo({ ...info, [f.key]: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none"
                style={{ borderColor: "#E5E7EB" }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={saveInfo}
          className="flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
          style={{ backgroundColor: C.indigo }}
        >
          {savedInfo ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savedInfo ? "Đã lưu!" : "Lưu thay đổi"}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl p-6 border border-black/5">
        <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Đổi mật khẩu</h3>
        <div className="space-y-4">
          {[
            { key: "old", label: "Mật khẩu hiện tại" },
            { key: "new", label: "Mật khẩu mới" },
            { key: "confirm", label: "Xác nhận mật khẩu mới" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>{f.label}</label>
              <div className="relative">
                <input
                  type={showPwd[f.key as keyof typeof showPwd] ? "text" : "password"}
                  value={pwd[f.key as keyof typeof pwd]}
                  onChange={(e) => { setPwd({ ...pwd, [f.key]: e.target.value }); setPwdError("") }}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border-2 text-sm outline-none"
                  style={{ borderColor: pwdError ? "#EF4444" : "#E5E7EB" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd({ ...showPwd, [f.key]: !showPwd[f.key as keyof typeof showPwd] })}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPwd[f.key as keyof typeof showPwd]
                    ? <EyeOff className="w-4 h-4" style={{ color: "#9CA3AF" }} />
                    : <Eye className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
                </button>
              </div>
            </div>
          ))}
          {pwdError && <p className="text-xs" style={{ color: "#EF4444" }}>{pwdError}</p>}
        </div>
        <button
          onClick={savePwd}
          className="flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
          style={{ backgroundColor: C.peach }}
        >
          {savedPwd ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savedPwd ? "Đã cập nhật!" : "Đổi mật khẩu"}
        </button>
      </div>
    </div>
  )
}
