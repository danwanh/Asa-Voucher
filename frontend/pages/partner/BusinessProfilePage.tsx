import { useState } from "react"
import { CheckCircle, Camera, ClipboardList, Clock, BadgeCheck } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"

type ProfileStatus = "unsubmitted" | "pending" | "approved"

const STATUS_OPTIONS: { value: ProfileStatus; label: string; icon: string; color: string }[] = [
  { value: "unsubmitted", label: "Chưa nộp hồ sơ", icon: "document", color: "#6B7280" },
  { value: "pending", label: "Chờ phê duyệt", icon: "help", color: "#D97706" },
  { value: "approved", label: "Đã được duyệt", icon: "check", color: "#2D7A52" },
]

export function BusinessProfilePage() {
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("approved")

  const [form, setForm] = useState({
    name: "Pizza Hut Vietnam",
    taxCode: "0123456789",
    representative: "Nguyễn Văn Giám Đốc",
    email: "contact@pizzahut.vn",
    phone: "028 1234 5678",
    address: "123 Nguyễn Trãi, Quận 1, TP.HCM",
    website: "https://pizzahut.vn",
    description: "Pizza Hut là chuỗi nhà hàng pizza nổi tiếng với hơn 20 năm hoạt động tại Việt Nam.",
  })
  const [saved, setSaved] = useState(false)

  const [onboardForm, setOnboardForm] = useState({
    name: "", taxCode: "", representative: "", email: "", phone: "", address: "", description: "", terms: false,
  })
  const [onboardErrors, setOnboardErrors] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const saveProfile = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const validateOnboard = () => {
    const errs: Record<string, string> = {}
    if (!onboardForm.name.trim()) errs.name = "Bắt buộc"
    if (!onboardForm.taxCode.trim()) errs.taxCode = "Bắt buộc"
    if (!onboardForm.representative.trim()) errs.representative = "Bắt buộc"
    if (!onboardForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(onboardForm.email)) errs.email = "Email không hợp lệ"
    if (!onboardForm.phone.trim()) errs.phone = "Bắt buộc"
    if (!onboardForm.terms) errs.terms = "Vui lòng đồng ý điều khoản"
    setOnboardErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmitProfile = () => {
    if (!validateOnboard()) return
    setProfileStatus("pending")
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border text-sm outline-none"
  const inputStyle = { borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif", backgroundColor: "white" }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Hồ sơ đối tác</h1>

      {/* Demo profile status switcher */}
      <div className="rounded-2xl p-3 border" style={{ backgroundColor: C.indigo + "08", borderColor: C.indigo + "20" }}>
        <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: C.indigo }}><AppIcon name="settings" className="w-3.5 h-3.5" /> Demo — Chọn trạng thái hồ sơ để xem flow:</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setProfileStatus(s.value)}
              className="text-xs px-3 py-1.5 rounded-full font-bold border-2 transition-all"
              style={{
                borderColor: profileStatus === s.value ? s.color : "#E2DFC8",
                backgroundColor: profileStatus === s.value ? s.color + "18" : "white",
                color: profileStatus === s.value ? s.color : "#8A8DA8",
              }}
            >
              <AppIcon name={s.icon} className="w-4 h-4" /> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Unsubmitted: Complete profile onboarding ─────────────────────── */}
      {profileStatus === "unsubmitted" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-6 h-6" style={{ color: C.peach }} />
            <h2 className="text-xl font-black" style={{ color: C.indigo }}>Hoàn thiện hồ sơ đối tác</h2>
          </div>
          <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>
            Điền đầy đủ thông tin doanh nghiệp để gửi hồ sơ phê duyệt. Sau khi được duyệt bạn mới có thể sử dụng đầy đủ tính năng.
          </p>
          <div className="space-y-4">
            {[
              { key: "name", label: "Tên doanh nghiệp *", ph: "Công ty TNHH ABC" },
              { key: "taxCode", label: "Mã số thuế *", ph: "0123456789" },
              { key: "representative", label: "Người đại diện *", ph: "Nguyễn Văn A" },
              { key: "email", label: "Email liên hệ *", ph: "contact@company.vn" },
              { key: "phone", label: "Số điện thoại *", ph: "028 1234 5678" },
              { key: "address", label: "Địa chỉ trụ sở", ph: "123 Đường ABC, Quận 1" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>{f.label}</label>
                <input
                  className={inputCls}
                  style={{ ...inputStyle, borderColor: onboardErrors[f.key] ? C.peach : "#E2DFC8" }}
                  placeholder={f.ph}
                  value={onboardForm[f.key as keyof typeof onboardForm] as string}
                  onChange={(e) => setOnboardForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
                {onboardErrors[f.key] && <p className="text-xs mt-1" style={{ color: C.peach }}>{onboardErrors[f.key]}</p>}
              </div>
            ))}
            <div>
              <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Mô tả doanh nghiệp</label>
              <textarea className={inputCls + " resize-none"} style={inputStyle} rows={3} placeholder="Mô tả ngắn..." value={onboardForm.description} onChange={(e) => setOnboardForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={onboardForm.terms} onChange={(e) => setOnboardForm((p) => ({ ...p, terms: e.target.checked }))} className="mt-0.5 rounded" />
              <span className="text-sm" style={{ color: C.indigo }}>
                Tôi xác nhận thông tin chính xác và đồng ý với <span className="font-bold" style={{ color: C.peach }}>Điều khoản đối tác</span>
              </span>
            </label>
            {onboardErrors.terms && <p className="text-xs" style={{ color: C.peach }}>{onboardErrors.terms}</p>}
          </div>
          <button onClick={handleSubmitProfile} className="mt-6 w-full py-3 rounded-xl font-bold text-white hover:opacity-90" style={{ backgroundColor: C.peach }}>
            Nộp hồ sơ đối tác
          </button>
        </div>
      )}

      {/* ── Pending: Waiting for approval ────────────────────────────────── */}
      {profileStatus === "pending" && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: C.apricot + "20" }}>
            <Clock className="w-10 h-10" style={{ color: C.apricot }} />
          </div>
          <h2 className="text-xl font-black mb-3" style={{ color: C.indigo }}>Đang chờ phê duyệt</h2>
          <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>
            Hồ sơ đã gửi thành công. Quản trị viên sẽ xem xét trong <strong>1–3 ngày làm việc</strong>. Bạn nhận thông báo khi được duyệt.
          </p>
          <div className="flex justify-center gap-6 mb-6">
            {[
              { label: "Nộp hồ sơ", done: true },
              { label: "Chờ duyệt", done: false, active: true },
              { label: "Được duyệt", done: false },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2"
                  style={{
                    backgroundColor: step.done ? C.teal : step.active ? C.apricot : "white",
                    borderColor: step.done ? C.teal : step.active ? C.apricot : "#E2DFC8",
                    color: step.done || step.active ? "white" : "#8A8DA8",
                  }}
                >
                  {step.done ? <AppIcon name="check" className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs font-semibold" style={{ color: step.active ? C.apricot : step.done ? C.teal : "#8A8DA8" }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl text-xs font-semibold" style={{ backgroundColor: C.apricot + "18", color: "#D97706" }}>
            <AppIcon name="help" className="w-4 h-4 inline-block mr-1" /> Trạng thái: Chờ phê duyệt
          </div>
        </div>
      )}

      {/* ── Approved: Full profile edit ──────────────────────────────────── */}
      {profileStatus === "approved" && (
        <>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-5 mb-6 pb-6 border-b" style={{ borderColor: "#F0EDD8" }}>
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: C.peach + "15" }}><AppIcon name="gift" className="w-10 h-10" /></div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: C.peach, color: "white" }}>
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <h2 className="text-xl font-black" style={{ color: C.indigo }}>{form.name}</h2>
                <p className="text-sm mt-0.5" style={{ color: "#8A8DA8" }}>MST: {form.taxCode}</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit mt-1" style={{ backgroundColor: "#E8F5EE", color: "#2D7A52" }}>
                  <BadgeCheck className="w-3 h-3" /> Đã duyệt
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { key: "name", label: "Tên doanh nghiệp *" },
                { key: "taxCode", label: "Mã số thuế" },
                { key: "representative", label: "Người đại diện" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Số điện thoại" },
                { key: "address", label: "Địa chỉ" },
                { key: "website", label: "Website" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>{f.label}</label>
                  <input className={inputCls} style={inputStyle} value={form[f.key as keyof typeof form]} onChange={(e) => set(f.key, e.target.value)} />
                </div>
              ))}
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Mô tả</label>
                <textarea className={inputCls + " resize-none"} style={inputStyle} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
            </div>

            {saved && (
              <div className="mt-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ backgroundColor: C.teal + "20", color: "#2D7A52" }}>
                <CheckCircle className="w-4 h-4" /> Đã lưu thay đổi
              </div>
            )}
            <button onClick={saveProfile} className="mt-6 w-full py-3 rounded-xl font-bold text-white" style={{ backgroundColor: C.peach }}>
              Lưu thay đổi
            </button>
          </div>

        </>
      )}
    </div>
  )
}
