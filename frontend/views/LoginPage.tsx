import { useState, useEffect } from "react"
import { AlertCircle, Eye, EyeOff, Building2, User as UserIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { AppUser, Role } from "@/types"
import { useAuthStore } from "@/stores/authStore"
import { authService } from "@/services/authService"

type AuthPage = "login" | "register" | "forgot"

interface Props {
  onLogin: (u: AppUser) => void
  onBack?: () => void
  initialPage?: AuthPage
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
  { label: "Đối tác chủ TK", email: "partner@asa.vn",       hint: "Pizza Hut Vietnam",   role: "partner_owner",          color: C.peach },
  { label: "NV Tạo Voucher", email: "voucher-staff@asa.vn", hint: "Nguyễn Văn Hùng",     role: "partner_voucher_staff",  color: "#F2CC8F" },
  { label: "NV Cửa hàng",   email: "staff@asa.vn",          hint: "Trần Văn Nam",         role: "partner_store_staff",    color: C.apricot },
]

// Row 2: admin roles
const ADMIN_ACCOUNTS: DemoAccount[] = [
  { label: "Admin Nội dung",  email: "admin-content@asa.vn",  hint: "Duyệt voucher & nội dung", role: "admin_content", color: "#81B29A" },
  { label: "Admin Vận hành", email: "admin.operations@asa.test",  hint: "Người dùng & đối tác",     role: "admin_operations", color: "#3D405B" },
  { label: "Admin Bảo mật",  email: "admin-security@asa.vn", hint: "Nhật ký & phân quyền",     role: "admin_security", color: "#E07A5F" },
]

function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden" style={{ backgroundColor: C.indigo }}>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-16">
          <img src="/logo.png" alt="Asa" className="h-10 object-contain" />
        </div>
        <h1 className="text-4xl font-black text-white leading-tight mb-6">
          Mua voucher ưu đãi<br />
          <span style={{ color: C.apricot }}>tiết kiệm hơn mỗi ngày</span>
        </h1>
        <p className="text-lg" style={{ color: "rgba(244,241,222,0.7)" }}>
          Hàng nghìn voucher giảm giá từ các đối tác uy tín — ẩm thực, làm đẹp, du lịch và giải trí.
        </p>
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
  const [emailErr, setEmailErr] = useState("")
  const [pwErr, setPwErr] = useState("")
  const [generalErr, setGeneralErr] = useState("")
  const [canResendVerification, setCanResendVerification] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const storeLogin = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => setResendCooldown((value) => Math.max(value - 1, 0)), 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const selectDemo = (a: DemoAccount) => {
    setEmail(a.email)
    setPassword("123456")
    setEmailErr(""); setPwErr(""); setGeneralErr("")
  }

  const validate = () => {
    let ok = true
    setEmailErr(""); setPwErr(""); setGeneralErr("")
    setCanResendVerification(false)
    if (!email) { setEmailErr("Vui lòng nhập email"); ok = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr("Email không đúng định dạng"); ok = false }
    if (!password) { setPwErr("Vui lòng nhập mật khẩu"); ok = false }
    else if (password.length < 8) { setPwErr("Mật khẩu tối thiểu 8 ký tự"); ok = false }
    return ok
  }

  const handleLogin = async () => {
    if (!validate()) return
    try {
      await storeLogin(email, password)
      const user = useAuthStore.getState().user
      if (user) onLogin(user)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { code?: string; message?: string } } } }
      const code = err?.response?.data?.error?.code
      setCanResendVerification(code === "EMAIL_NOT_VERIFIED")
      const messages: Record<string, string> = {
        ACCOUNT_NOT_FOUND: "Sai tên đăng nhập hoặc không tồn tại tài khoản, vui lòng đăng ký phù hợp",
        INVALID_PASSWORD: "Sai mật khẩu",
        ACCOUNT_LOCKED: "Tài khoản đang bị khóa. Vui lòng thử lại sau 15 phút.",
        EMAIL_NOT_VERIFIED: "Vui lòng xác thực email trước khi đăng nhập.",
        PARTNER_PENDING: "Hồ sơ đối tác đang chờ quản trị viên phê duyệt.",
        PARTNER_REJECTED: "Hồ sơ đối tác đã bị từ chối. Vui lòng liên hệ hỗ trợ.",
        PARTNER_INACTIVE: "Hồ sơ đối tác đang tạm ngưng hoạt động.",
      }
      setGeneralErr(messages[code ?? ""] ?? err?.response?.data?.error?.message ?? "Đăng nhập thất bại")
    }
  }

  const handleResendVerification = async () => {
    if (resendLoading || resendCooldown > 0) return
    setResendLoading(true)
    try {
      await authService.resendVerification(email)
      setResendCooldown(60)
      toast.success("Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string; details?: { cooldown_seconds?: number } } } } }
      const retryAfter = err?.response?.data?.error?.details?.cooldown_seconds
      if (typeof retryAfter === "number") setResendCooldown(retryAfter)
      toast.error(err?.response?.data?.error?.message ?? "Không thể gửi lại email xác thực")
    } finally {
      setResendLoading(false)
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
        <img src="/logo.png" alt="Asa Vouchers" className="h-10 object-contain" />
      </div>

      <h2 className="text-2xl font-black mb-4" style={{ color: C.indigo }}>Đăng nhập</h2>
      {/* <p className="text-sm mb-4" style={{ color: "#8A8DA8" }}>Chọn tài khoản demo để trải nghiệm nhanh</p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        {USER_ACCOUNTS.map(DemoBtn)}
      </div>

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
      </div> */}

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold block mb-1.5" style={{ color: C.indigo }}>Email</label>
          <input
            className={inputCls}
            style={{ ...inputStyle, borderColor: emailErr ? "#E07A5F" : "#E2DFC8" }}
            placeholder="email@domain.vn"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailErr("") }}
            disabled={isLoading}
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
              disabled={isLoading}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "#8A8DA8" }} onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pwErr && <p className="text-xs mt-1" style={{ color: C.peach }}>{pwErr}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div />
        <button className="text-sm font-semibold transition-opacity hover:opacity-70" style={{ color: C.peach }} onClick={() => onNavigate("forgot")}>
          Quên mật khẩu?
        </button>
      </div>

      {generalErr && (
        <div className="mt-4 p-3 rounded-2xl text-sm flex items-center gap-2" style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />{generalErr}
          {canResendVerification && (
            <button
              type="button"
              disabled={resendLoading || resendCooldown > 0}
              onClick={handleResendVerification}
              className="ml-auto shrink-0 font-bold underline disabled:opacity-60"
            >
              {resendLoading ? "Đang gửi" : resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : "Gửi lại email xác thực"}
            </button>
          )}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="mt-6 w-full py-3.5 rounded-2xl font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ backgroundColor: C.peach }}
      >
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang đăng nhập...</> : "Đăng nhập"}
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

type RegStep = "role" | "form" | "success" | "partner-pending"

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
  const [generalErr, setGeneralErr] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState("")

  const storeRegister = useAuthStore((s) => s.register)
  const storeRegisterPartner = authService.registerPartner
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: "" }))
  }

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Vui lòng nhập họ tên"
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email không hợp lệ"
    if (!form.phone || !/^(0|\+84)[0-9]{8,9}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "Số điện thoại không hợp lệ"
    if (form.password.length < 8 || form.password.length > 64 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) errs.password = "Mật khẩu 8-64 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
    if (form.password !== form.confirm) errs.confirm = "Mật khẩu xác nhận không khớp"
    if (regRole === "partner") {
      if (!form.businessName.trim()) errs.businessName = "Vui lòng nhập tên doanh nghiệp"
      if (!form.taxCode.trim()) errs.taxCode = "Vui lòng nhập mã số thuế"
    }
    if (!form.terms) errs.terms = "Vui lòng đồng ý điều khoản"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleFormSubmit = async () => {
    if (!validateForm()) return
    setGeneralErr("")
    try {
      if (regRole === "partner") {
        await storeRegisterPartner({
          email: form.email,
          password: form.password,
          confirm_password: form.confirm,
          full_name: form.name,
          phone: form.phone,
          business_name: form.businessName,
          tax_number: form.taxCode,
        })
      } else {
        await storeRegister({
          email: form.email,
          password: form.password,
          confirm_password: form.confirm,
          full_name: form.name,
          phone: form.phone
        })
      }
      if (regRole === "customer") {
        setStep("success")
      } else {
        setStep("partner-pending")
      }
      setResendCooldown(60)
      setResendMessage("")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } }
      setGeneralErr(err?.response?.data?.error?.message ?? "Đăng ký thất bại")
    }
  }

  const handleResendVerification = async () => {
    if (resendLoading || resendCooldown > 0) return
    setResendLoading(true)
    setResendMessage("")
    try {
      await authService.resendVerification(form.email)
      setResendMessage("Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.")
      setResendCooldown(60)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string; details?: { cooldown_seconds?: number } } } } }
      const retryAfter = err?.response?.data?.error?.details?.cooldown_seconds
      if (typeof retryAfter === "number") setResendCooldown(retryAfter)
      setResendMessage(err?.response?.data?.error?.message ?? "Không thể gửi lại email xác thực")
    } finally {
      setResendLoading(false)
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-2xl border text-sm outline-none"
  const inputStyle = { backgroundColor: "white", fontFamily: "'Inter', sans-serif" }

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

  if (step === "success") {
    return (
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: C.teal + "20" }}><AppIcon name="check" className="w-10 h-10" /></div>
        <h2 className="text-2xl font-black mb-2" style={{ color: C.indigo }}>Đăng ký thành công</h2>
        <p className="mb-2" style={{ color: "#8A8DA8" }}>
          Tài khoản <strong>{form.email}</strong> đã được tạo. Vui lòng kiểm tra email để xác thực.
        </p>
        <p className="mb-6 text-sm" style={{ color: "#8A8DA8" }}>
          Sau khi xác thực email, bạn có thể quay lại đăng nhập.
        </p>
        {resendMessage && <p className="mb-4 text-sm" style={{ color: C.teal }}>{resendMessage}</p>}
        <button
          disabled={resendLoading || resendCooldown > 0}
          onClick={handleResendVerification}
          className="w-full py-3.5 mb-3 rounded-2xl font-bold text-white hover:opacity-90 transition-all disabled:opacity-60"
          style={{ backgroundColor: C.teal }}
        >
          {resendLoading ? "Đang gửi email xác thực..." : resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : "Gửi lại email xác thực"}
        </button>
        <button
          onClick={() => onNavigate("login")}
          className="w-full py-3.5 rounded-2xl font-bold text-white hover:opacity-90 transition-all"
          style={{ backgroundColor: C.peach }}
        >
          Đăng nhập ngay
        </button>
      </div>
    )
  }

  if (step === "partner-pending") {
    return (
      <div className="w-full max-w-md text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-6" style={{ backgroundColor: C.apricot + "20" }}>⏳</div>
        <h2 className="text-2xl font-black mb-3" style={{ color: C.indigo }}>Đang chờ phê duyệt</h2>
        <p className="text-sm mb-2" style={{ color: "#8A8DA8" }}>
           Hồ sơ đối tác <strong>{form.businessName}</strong> đã được tạo. Vui lòng xác thực email trước.
        </p>
        <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>
           Sau khi xác thực email, quản trị viên sẽ xem xét trong <strong>1–3 ngày làm việc</strong>. Thông báo gửi về{" "}
          <strong>{form.email}</strong>.
        </p>
        <div className="rounded-2xl p-4 mb-6 text-left" style={{ backgroundColor: C.apricot + "15", border: `1.5px solid ${C.apricot}` }}>
          <div className="text-sm font-bold mb-1" style={{ color: C.indigo }}>Hồ sơ đối tác</div>
          <div className="text-xs" style={{ color: "#6B7280" }}>{form.businessName} • MST: {form.taxCode}</div>
          <div className="text-xs mt-1.5 font-bold flex items-center gap-1" style={{ color: "#D97706" }}><AppIcon name="help" className="w-3.5 h-3.5" /> Chờ phê duyệt</div>
        </div>
        {resendMessage && <p className="mb-4 text-sm" style={{ color: C.teal }}>{resendMessage}</p>}
        <button
          disabled={resendLoading || resendCooldown > 0}
          onClick={handleResendVerification}
          className="w-full py-3.5 mb-3 rounded-2xl font-bold text-white hover:opacity-90 transition-all disabled:opacity-60"
          style={{ backgroundColor: C.teal }}
        >
          {resendLoading ? "Đang gửi email xác thực..." : resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : "Gửi lại email xác thực"}
        </button>
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

      {generalErr && (
        <div className="mt-3 p-3 rounded-2xl text-sm flex items-center gap-2" style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />{generalErr}
        </div>
      )}

      <button
        onClick={handleFormSubmit}
        disabled={isLoading}
        className="mt-5 w-full py-3.5 rounded-2xl font-bold text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ backgroundColor: C.peach }}
      >
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : "Đăng ký"}
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
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generalErr, setGeneralErr] = useState("")

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((seconds) => Math.max(seconds - 1, 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const handleSend = async () => {
    if (cooldown > 0 || loading) return
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr("Vui lòng nhập email hợp lệ"); return
    }
    setLoading(true)
    setGeneralErr("")
    try {
      await authService.forgotPassword(email)
      setSent(true)
      setCooldown(60)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string; details?: { cooldown_seconds?: number } } } } }
      const retryAfter = err?.response?.data?.error?.details?.cooldown_seconds
      if (typeof retryAfter === "number") setCooldown(retryAfter)
      setGeneralErr(err?.response?.data?.error?.message ?? "Không thể gửi email, vui lòng thử lại")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: C.teal + "20" }}><AppIcon name="mail" className="w-10 h-10" /></div>
        <h2 className="text-2xl font-black mb-2" style={{ color: C.indigo }}>Kiểm tra email</h2>
        <p className="mb-6" style={{ color: "#8A8DA8" }}>
          Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>
        </p>
        <button
          disabled={cooldown > 0 || loading}
          onClick={handleSend}
          className="w-full py-3.5 rounded-2xl font-bold text-white hover:opacity-90 transition-all disabled:opacity-60"
          style={{ backgroundColor: C.peach }}
        >
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại email"}
        </button>
        <button className="font-bold text-sm hover:opacity-70 transition-opacity" style={{ color: C.peach }} onClick={() => onNavigate("login")}>
          <span className="inline-block mt-5">Quay lại đăng nhập</span>
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
      {generalErr && <p className="mt-3 text-sm" style={{ color: C.peach }}>{generalErr}</p>}
      <button disabled={loading || cooldown > 0} onClick={handleSend} className="mt-6 w-full py-3.5 rounded-2xl font-bold text-white hover:opacity-90 transition-all disabled:opacity-60" style={{ backgroundColor: C.peach }}>
        {loading ? "Đang gửi..." : cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi Email đặt lại"}
      </button>
      <p className="text-center text-sm mt-6" style={{ color: "#8A8DA8" }}>
        <button className="font-bold hover:opacity-70 transition-opacity" style={{ color: C.peach }} onClick={() => onNavigate("login")}>
          ← Quay lại đăng nhập
        </button>
      </p>
    </div>
  )
}

export function LoginPage({ onLogin, onBack, initialPage = "login" }: Props) {
  const [authPage, setAuthPage] = useState<AuthPage>(initialPage)

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: C.content, fontFamily: "'Nunito', sans-serif" }}>
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
