import { useState, useEffect } from "react"
import { AlertCircle, Eye, EyeOff, Building2, User as UserIcon } from "lucide-react"
import { C } from "@/utils/constants"
import type { AppUser, Role } from "@/types"

type AuthPage = "login" | "register" | "forgot"

interface Props {
  onLogin: (u: AppUser) => void
  onBack?: () => void
}

interface DemoAccount {
  label: string
  email: string
  hint: string
  role: Role
  color: string
}

// Row 1: end-users
const USER_ACCOUNTS: DemoAccount[] = [
  { label: "Khách hàng",         email: "customer@asa.vn",      hint: "Nguyễn Thị Mai",      role: "buyer",                   color: C.teal },
  { label: "🏢 Đối tác chủ TK", email: "partner@asa.vn",       hint: "Pizza Hut Vietnam",   role: "partner_owner",          color: C.peach },
  { label: "🏷️ NV Tạo Voucher", email: "voucher-staff@asa.vn", hint: "Nguyễn Văn Hùng",     role: "partner_voucher_staff",  color: "#F2CC8F" },
  { label: "🔖 NV Cửa hàng",   email: "staff@asa.vn",          hint: "Trần Văn Nam",         role: "partner_store_staff",    color: C.apricot },
]

// Row 2: admin roles
const ADMIN_ACCOUNTS: DemoAccount[] = [
  { label: "📝 Admin Nội dung",  email: "admin-content@asa.vn",  hint: "Duyệt voucher & nội dung", role: "admin_content", color: "#81B29A" },
  { label: "👤 Admin Tài khoản", email: "admin-account@asa.vn",  hint: "Người dùng & đối tác",     role: "admin_account", color: "#3D405B" },
  { label: "🔐 Admin Bảo mật",  email: "admin-security@asa.vn", hint: "Nhật ký & phân quyền",     role: "admin_security", color: "#E07A5F" },
]

const ALL_ACCOUNTS = [...USER_ACCOUNTS, ...ADMIN_ACCOUNTS]

function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden" style={{ backgroundColor: C.indigo }}>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg" style={{ backgroundColor: C.peach, color: "white" }}>A</div>
          <span className="text-2xl font-black text-white tracking-tight">Asa Vouchers</span>
        </div>
        <h1 className="text-4xl font-black text-white leading-tight mb-6">
          Mua voucher ưu đãi<br />
          <span style={{ color: C.apricot }}>tiết kiệm hơn mỗi ngày</span>
        </h1>
        <p className="text-lg" style={{ color: "rgba(244,241,222,0.7)" }}>
          Hàng nghìn voucher giảm giá từ các đối tác uy tín — ẩm thực, làm đẹp, du lịch và giải trí.
        </p>
      </div>
      <div className="relative z-10 grid grid-cols-2 gap-4">
        {[
          { label: "Voucher đang bán", value: "8.932+" },
          { label: "Đối tác",          value: "124" },
          { label: "Khách hàng",       value: "25.000+" },
          { label: "Đơn hàng/ngày",    value: "245" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-sm" style={{ color: "rgba(244,241,222,0.6)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: C.peach }} />
      <div className="absolute bottom-32 -right-8 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: C.apricot }} />
    </div>
  )
}

function LoginForm({ onLogin, onNavigate }: { onLogin: (u: AppUser) => void; onNavigate: (p: AuthPage) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [emailErr, setEmailErr] = useState("")
  const [pwErr, setPwErr] = useState("")
  const [generalErr, setGeneralErr] = useState("")

  const selectDemo = (a: DemoAccount) => {
    setEmail(a.email)
    setPassword("123456")
    setEmailErr(""); setPwErr(""); setGeneralErr("")
  }

  const validate = () => {
    let ok = true
    setEmailErr(""); setPwErr(""); setGeneralErr("")
    if (!email) { setEmailErr("Vui lòng nhập email"); ok = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr("Email không đúng định dạng"); ok = false }
    if (!password) { setPwErr("Vui lòng nhập mật khẩu"); ok = false }
    else if (password.length < 6) { setPwErr("Mật khẩu tối thiểu 6 ký tự"); ok = false }
    return ok
  }

  const handleLogin = () => {
    if (!validate()) return
    const found = ALL_ACCOUNTS.find((a) => a.email === email)
    if (found && password === "123456") {
      const extras: Partial<AppUser> = {}
      if (found.role === "partner_owner")         extras.partnerId = "p1"
      if (found.role === "partner_store_staff")   { extras.partnerId = "p1"; extras.branchId = "b1" }
      if (found.role === "partner_voucher_staff") { extras.partnerId = "p1" }
      onLogin({ id: found.role + "-1", name: found.hint, email: found.email, role: found.role, ...extras })
    } else {
      setGeneralErr("Email hoặc mật khẩu không đúng. Mật khẩu demo: 123456")
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors"
  const inputStyle = { backgroundColor: "white", fontFamily: "'Inter', sans-serif" }

  const DemoBtn = (a: DemoAccount) => (
    <button
      key={a.email}
      onClick={() => selectDemo(a)}
      className="p-3 rounded-2xl border-2 text-left transition-all hover:scale-105"
      style={{
        borderColor: email === a.email ? a.color : "transparent",
        backgroundColor: email === a.email ? a.color + "15" : "white",
      }}
    >
      <div className="text-xs font-bold truncate" style={{ color: a.color }}>{a.label}</div>
      <div className="text-xs mt-0.5 truncate" style={{ color: "#8A8DA8" }}>{a.hint}</div>
    </button>
  )

  return (
    <div className="w-full max-w-md">
      <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg" style={{ backgroundColor: C.peach, color: "white" }}>A</div>
        <span className="text-2xl font-black" style={{ color: C.indigo }}>Asa Vouchers</span>
      </div>

      <h2 className="text-2xl font-black mb-1" style={{ color: C.indigo }}>Đăng nhập</h2>
      <p className="text-sm mb-4" style={{ color: "#8A8DA8" }}>Chọn tài khoản demo để trải nghiệm nhanh</p>

      {/* User accounts: 2×2 grid */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {USER_ACCOUNTS.map(DemoBtn)}
      </div>

      {/* Admin accounts — visually grouped */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px" style={{ backgroundColor: "#E2DFC8" }} />
          <span className="text-xs font-bold px-1" style={{ color: "#9CA3AF" }}>Quản trị viên</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#E2DFC8" }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ADMIN_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              onClick={() => selectDemo(a)}
              className="p-3 rounded-2xl border-2 text-left transition-all hover:scale-105"
              style={{
                borderColor: email === a.email ? a.color : "transparent",
                backgroundColor: email === a.email ? a.color + "15" : "white",
              }}
            >
              <div className="text-xs font-bold truncate" style={{ color: a.color }}>{a.label}</div>
              <div className="text-xs mt-0.5 truncate" style={{ color: "#8A8DA8" }}>{a.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold block mb-1.5" style={{ color: C.indigo }}>Email</label>
          <input
            className={inputCls}
            style={{ ...inputStyle, borderColor: emailErr ? "#E07A5F" : "#E2DFC8" }}
            placeholder="email@domain.vn"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailErr("") }}
          />
          {emailErr && <p className="text-xs mt-1" style={{ color: C.peach }}>{emailErr}</p>}
        </div>
        <div>
          <label className="text-sm font-semibold block mb-1.5" style={{ color: C.indigo }}>Mật khẩu</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              className={inputCls + " pr-11"}
              style={{ ...inputStyle, borderColor: pwErr ? "#E07A5F" : "#E2DFC8" }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwErr("") }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "#8A8DA8" }} onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pwErr && <p className="text-xs mt-1" style={{ color: C.peach }}>{pwErr}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded" />
          <span className="text-sm" style={{ color: C.indigo }}>Ghi nhớ đăng nhập</span>
        </label>
        <button className="text-sm font-semibold transition-opacity hover:opacity-70" style={{ color: C.peach }} onClick={() => onNavigate("forgot")}>
          Quên mật khẩu?
        </button>
      </div>

      {generalErr && (
        <div className="mt-4 p-3 rounded-2xl text-sm flex items-center gap-2" style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />{generalErr}
        </div>
      )}

      <button onClick={handleLogin} className="mt-6 w-full py-3.5 rounded-2xl font-bold text-white transition-all hover:opacity-90 active:scale-95" style={{ backgroundColor: C.peach }}>
        Đăng nhập
      </button>

      <p className="text-center text-sm mt-6" style={{ color: "#8A8DA8" }}>
        Chưa có tài khoản?{" "}
        <button className="font-bold transition-opacity hover:opacity-70" style={{ color: C.peach }} onClick={() => onNavigate("register")}>
          Đăng ký ngay
        </button>
      </p>
    </div>
  )
}

type RegStep = "role" | "form" | "otp" | "partner-pending"

function RegisterForm({ onNavigate }: { onNavigate: (p: AuthPage) => void }) {
  const [step, setStep] = useState<RegStep>("role")
  const [regRole, setRegRole] = useState<"customer" | "partner">("customer")
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirm: "",
    businessName: "", taxCode: "", terms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // OTP state
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState("")
  const [timeLeft, setTimeLeft] = useState(300)
  const [expired, setExpired] = useState(false)
  const [resendTick, setResendTick] = useState(0)
  const MOCK_OTP = "123456"

  useEffect(() => {
    if (step !== "otp") return
    setTimeLeft(300)
    setExpired(false)
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); setExpired(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [step, resendTick])

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  const EXISTING_EMAILS = ALL_ACCOUNTS.map((a) => a.email)

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: "" }))
  }

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Vui lòng nhập họ tên"
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email không hợp lệ"
    else if (EXISTING_EMAILS.includes(form.email)) errs.email = "Email này đã được đăng ký"
    if (!form.phone || !/^(0|\+84)[0-9]{8,9}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "Số điện thoại không hợp lệ"
    if (form.password.length < 8) errs.password = "Mật khẩu tối thiểu 8 ký tự"
    if (form.password !== form.confirm) errs.confirm = "Mật khẩu xác nhận không khớp"
    if (regRole === "partner") {
      if (!form.businessName.trim()) errs.businessName = "Vui lòng nhập tên doanh nghiệp"
      if (!form.taxCode.trim()) errs.taxCode = "Vui lòng nhập mã số thuế"
    }
    if (!form.terms) errs.terms = "Vui lòng đồng ý điều khoản"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleFormSubmit = () => {
    if (!validateForm()) return
    setOtp(""); setOtpError("")
    setStep("otp")
  }

  const handleOtpVerify = () => {
    if (expired) { setOtpError("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới."); return }
    if (otp !== MOCK_OTP) { setOtpError("Mã OTP không đúng. Vui lòng nhập lại."); return }
    if (regRole === "customer") {
      onNavigate("login")
    } else {
      setStep("partner-pending")
    }
  }

  const handleResend = () => {
    setOtp(""); setOtpError("")
    setResendTick((n) => n + 1)
  }

  const inputCls = "w-full px-4 py-3 rounded-2xl border text-sm outline-none"
  const inputStyle = { backgroundColor: "white", fontFamily: "'Inter', sans-serif" }

  // ── Step: Role selection ──────────────────────────────────────────────────
  if (step === "role") {
    return (
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-black mb-1" style={{ color: C.indigo }}>Tạo tài khoản</h2>
        <p className="text-sm mb-8" style={{ color: "#8A8DA8" }}>Bạn muốn đăng ký với tư cách nào?</p>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { value: "customer" as const, icon: <UserIcon className="w-10 h-10" />, label: "Khách hàng", desc: "Mua voucher ưu đãi", color: C.teal },
            { value: "partner" as const, icon: <Building2 className="w-10 h-10" />, label: "Đối tác", desc: "Bán voucher cho khách", color: C.peach },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => { setRegRole(r.value); setStep("form") }}
              className="flex flex-col items-center p-6 rounded-3xl border-2 transition-all hover:scale-105 hover:shadow-md"
              style={{ borderColor: "#E2DFC8", backgroundColor: "white" }}
            >
              <div className="mb-3" style={{ color: r.color }}>{r.icon}</div>
              <div className="font-black text-base" style={{ color: C.indigo }}>{r.label}</div>
              <div className="text-xs mt-1 text-center" style={{ color: "#8A8DA8" }}>{r.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-center text-sm" style={{ color: "#8A8DA8" }}>
          Đã có tài khoản?{" "}
          <button className="font-bold hover:opacity-70" style={{ color: C.peach }} onClick={() => onNavigate("login")}>
            Đăng nhập
          </button>
        </p>
      </div>
    )
  }

  // ── Step: OTP ─────────────────────────────────────────────────────────────
  if (step === "otp") {
    return (
      <div className="w-full max-w-md">
        <button onClick={() => setStep("form")} className="flex items-center gap-1 text-sm font-semibold mb-6 hover:underline" style={{ color: C.indigo }}>
          ← Quay lại
        </button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4" style={{ backgroundColor: C.teal + "25" }}>📱</div>
          <h2 className="text-2xl font-black mb-1" style={{ color: C.indigo }}>Xác minh OTP</h2>
          <p className="text-sm" style={{ color: "#8A8DA8" }}>
            Mã xác minh đã gửi đến <strong>{form.email}</strong>
          </p>
          <p className="text-xs mt-1 px-3 py-1 rounded-full inline-block" style={{ backgroundColor: C.apricot + "25", color: "#7C5E10" }}>
            Demo: nhập <strong>123456</strong>
          </p>
        </div>

        <div className="mb-4">
          <label className="text-sm font-bold block mb-2" style={{ color: C.indigo }}>Mã OTP (6 chữ số)</label>
          <input
            className={inputCls + " text-center text-2xl font-black"}
            style={{ ...inputStyle, borderColor: otpError ? C.peach : "#E2DFC8", letterSpacing: "0.4em" }}
            maxLength={6}
            placeholder="------"
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError("") }}
          />
          {otpError && (
            <div className="mt-2 p-2.5 rounded-xl flex items-center gap-2 text-xs" style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {otpError}
            </div>
          )}
        </div>

        <div className="text-center mb-5">
          {!expired ? (
            <span className="text-sm" style={{ color: "#8A8DA8" }}>
              Mã hết hạn sau:{" "}
              <strong style={{ color: timeLeft < 60 ? C.peach : C.indigo }}>{fmtTime(timeLeft)}</strong>
            </span>
          ) : (
            <div className="p-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}>
              Mã OTP đã hết hạn
            </div>
          )}
        </div>

        <button
          onClick={handleOtpVerify}
          disabled={otp.length !== 6}
          className="w-full py-3.5 rounded-2xl font-bold text-white mb-3 transition-all hover:opacity-90"
          style={{ backgroundColor: otp.length === 6 ? C.peach : "#D1D5DB" }}
        >
          Xác minh OTP
        </button>

        <button
          onClick={handleResend}
          className="w-full py-3 rounded-2xl font-bold text-sm border transition-all hover:bg-muted"
          style={{ borderColor: "#E2DFC8", color: C.indigo }}
        >
          Gửi lại mã OTP
        </button>
      </div>
    )
  }

  // ── Step: Partner Pending Approval ────────────────────────────────────────
  if (step === "partner-pending") {
    return (
      <div className="w-full max-w-md text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-6" style={{ backgroundColor: C.apricot + "20" }}>⏳</div>
        <h2 className="text-2xl font-black mb-3" style={{ color: C.indigo }}>Đang chờ phê duyệt</h2>
        <p className="text-sm mb-2" style={{ color: "#8A8DA8" }}>
          Tài khoản đối tác <strong>{form.businessName}</strong> đã được đăng ký thành công.
        </p>
        <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>
          Quản trị viên sẽ xem xét trong <strong>1–3 ngày làm việc</strong>. Thông báo gửi về{" "}
          <strong>{form.email}</strong>.
        </p>
        <div className="rounded-2xl p-4 mb-6 text-left" style={{ backgroundColor: C.apricot + "15", border: `1.5px solid ${C.apricot}` }}>
          <div className="text-sm font-bold mb-1" style={{ color: C.indigo }}>Hồ sơ đối tác</div>
          <div className="text-xs" style={{ color: "#6B7280" }}>{form.businessName} • MST: {form.taxCode}</div>
          <div className="text-xs mt-1.5 font-bold" style={{ color: "#D97706" }}>🟡 Chờ phê duyệt</div>
        </div>
        <button
          onClick={() => onNavigate("login")}
          className="w-full py-3.5 rounded-2xl font-bold text-white hover:opacity-90"
          style={{ backgroundColor: C.peach }}
        >
          Về trang đăng nhập
        </button>
      </div>
    )
  }

  // ── Step: Registration Form ───────────────────────────────────────────────
  return (
    <div className="w-full max-w-md">
      <button onClick={() => setStep("role")} className="flex items-center gap-1 text-sm font-semibold mb-4 hover:underline" style={{ color: C.indigo }}>
        ← Chọn lại vai trò
      </button>
      <h2 className="text-2xl font-black mb-1" style={{ color: C.indigo }}>
        Đăng ký {regRole === "customer" ? "Khách hàng" : "Đối tác"}
      </h2>
      <p className="text-sm mb-5" style={{ color: "#8A8DA8" }}>Điền đầy đủ thông tin để tạo tài khoản</p>

      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {regRole === "partner" && (
          <>
            {[
              { key: "businessName", label: "Tên doanh nghiệp *", ph: "Công ty TNHH ABC", type: "text" },
              { key: "taxCode", label: "Mã số thuế *", ph: "0123456789", type: "text" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: C.indigo }}>{f.label}</label>
                <input
                  type={f.type}
                  className={inputCls}
                  style={{ ...inputStyle, borderColor: errors[f.key] ? C.peach : "#E2DFC8" }}
                  placeholder={f.ph}
                  value={form[f.key as keyof typeof form] as string}
                  onChange={(e) => set(f.key, e.target.value)}
                />
                {errors[f.key] && <p className="text-xs mt-1" style={{ color: C.peach }}>{errors[f.key]}</p>}
              </div>
            ))}
            <div className="h-px mt-1 mb-1" style={{ backgroundColor: "#E2DFC8" }} />
          </>
        )}

        {[
          { key: "name", label: regRole === "customer" ? "Họ và tên *" : "Người đại diện *", ph: "Nguyễn Văn A", type: "text" },
          { key: "email", label: "Email *", ph: "email@domain.vn", type: "email" },
          { key: "phone", label: "Số điện thoại *", ph: "0901234567", type: "tel" },
        ].map((f) => (
          <div key={f.key}>
            <label className="text-sm font-semibold block mb-1.5" style={{ color: C.indigo }}>{f.label}</label>
            <input
              type={f.type}
              className={inputCls}
              style={{ ...inputStyle, borderColor: errors[f.key] ? C.peach : "#E2DFC8" }}
              placeholder={f.ph}
              value={form[f.key as keyof typeof form] as string}
              onChange={(e) => set(f.key, e.target.value)}
            />
            {errors[f.key] && <p className="text-xs mt-1" style={{ color: C.peach }}>{errors[f.key]}</p>}
          </div>
        ))}

        <div>
          <label className="text-sm font-semibold block mb-1.5" style={{ color: C.indigo }}>Mật khẩu *</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              className={inputCls + " pr-11"}
              style={{ ...inputStyle, borderColor: errors.password ? C.peach : "#E2DFC8" }}
              placeholder="Tối thiểu 8 ký tự"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "#8A8DA8" }} onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs mt-1" style={{ color: C.peach }}>{errors.password}</p>}
        </div>

        <div>
          <label className="text-sm font-semibold block mb-1.5" style={{ color: C.indigo }}>Xác nhận mật khẩu *</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className={inputCls + " pr-11"}
              style={{ ...inputStyle, borderColor: errors.confirm ? C.peach : "#E2DFC8" }}
              placeholder="Nhập lại mật khẩu"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "#8A8DA8" }} onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirm && <p className="text-xs mt-1" style={{ color: C.peach }}>{errors.confirm}</p>}
        </div>

        <div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={form.terms} onChange={(e) => set("terms", e.target.checked)} className="mt-0.5 rounded" />
            <span className="text-sm" style={{ color: C.indigo }}>
              Tôi đồng ý với{" "}
              <span className="font-bold" style={{ color: C.peach }}>Điều khoản sử dụng</span> và{" "}
              <span className="font-bold" style={{ color: C.peach }}>Chính sách bảo mật</span>
            </span>
          </label>
          {errors.terms && <p className="text-xs mt-1" style={{ color: C.peach }}>{errors.terms}</p>}
        </div>
      </div>

      <button
        onClick={handleFormSubmit}
        className="mt-5 w-full py-3.5 rounded-2xl font-bold text-white hover:opacity-90 active:scale-95 transition-all"
        style={{ backgroundColor: C.peach }}
      >
        Tiếp tục → Xác minh OTP
      </button>
      <p className="text-center text-sm mt-5" style={{ color: "#8A8DA8" }}>
        Đã có tài khoản?{" "}
        <button className="font-bold hover:opacity-70 transition-opacity" style={{ color: C.peach }} onClick={() => onNavigate("login")}>
          Đăng nhập
        </button>
      </p>
    </div>
  )
}

function ForgotForm({ onNavigate }: { onNavigate: (p: AuthPage) => void }) {
  const [email, setEmail] = useState("")
  const [emailErr, setEmailErr] = useState("")
  const [sent, setSent] = useState(false)

  const handleSend = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr("Vui lòng nhập email hợp lệ"); return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6" style={{ backgroundColor: C.teal + "20" }}>📧</div>
        <h2 className="text-2xl font-black mb-2" style={{ color: C.indigo }}>Kiểm tra email</h2>
        <p className="mb-6" style={{ color: "#8A8DA8" }}>
          Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>
        </p>
        <button className="font-bold text-sm hover:opacity-70 transition-opacity" style={{ color: C.peach }} onClick={() => onNavigate("login")}>
          Quay lại đăng nhập
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-black mb-1" style={{ color: C.indigo }}>Quên mật khẩu</h2>
      <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>Nhập email để nhận link đặt lại mật khẩu</p>
      <div>
        <label className="text-sm font-semibold block mb-1.5" style={{ color: C.indigo }}>Email</label>
        <input
          className="w-full px-4 py-3 rounded-2xl border text-sm outline-none"
          style={{ borderColor: emailErr ? C.peach : "#E2DFC8", backgroundColor: "white", fontFamily: "'Inter', sans-serif" }}
          placeholder="email@domain.vn"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailErr("") }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        {emailErr && <p className="text-xs mt-1" style={{ color: C.peach }}>{emailErr}</p>}
      </div>
      <button onClick={handleSend} className="mt-6 w-full py-3.5 rounded-2xl font-bold text-white hover:opacity-90 transition-all" style={{ backgroundColor: C.peach }}>
        Gửi Email đặt lại
      </button>
      <p className="text-center text-sm mt-6" style={{ color: "#8A8DA8" }}>
        <button className="font-bold hover:opacity-70 transition-opacity" style={{ color: C.peach }} onClick={() => onNavigate("login")}>
          ← Quay lại đăng nhập
        </button>
      </p>
    </div>
  )
}

export function LoginPage({ onLogin, onBack }: Props) {
  const [authPage, setAuthPage] = useState<AuthPage>("login")

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: C.eggshell, fontFamily: "'Nunito', sans-serif" }}>
      <LeftPanel />
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto relative">
        {onBack && (
          <button onClick={onBack} className="absolute top-4 left-4 text-sm font-semibold flex items-center gap-1 hover:underline" style={{ color: C.indigo }}>
            ← Quay lại trang chủ
          </button>
        )}
        {authPage === "login"    && <LoginForm onLogin={onLogin} onNavigate={setAuthPage} />}
        {authPage === "register" && <RegisterForm onNavigate={setAuthPage} />}
        {authPage === "forgot"   && <ForgotForm onNavigate={setAuthPage} />}
      </div>
    </div>
  )
}
