import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { AlertCircle, CheckCircle, Eye, EyeOff, ImagePlus, Lock, LogOut, User } from "lucide-react"
import { toast } from "sonner"
import { C } from "@/utils/constants"
import type { AppUser, Role } from "@/types"
import { authService } from "@/services/authService"
import { useAuthStore } from "@/stores/authStore"
import { LoadingState } from "@/components/LoadingState"
import { mediaUploadService } from "@/services/mediaUploadService"

interface Props {
  user: AppUser
  onLogout: () => void
  showPasswordSection?: boolean
}

interface ProfileForm {
  full_name: string
  phone: string
  address: string
  city: string
  district: string
  dob: string
  gender: "" | "male" | "female" | "other"
}

const emptyForm: ProfileForm = {
  full_name: "",
  phone: "",
  address: "",
  city: "",
  district: "",
  dob: "",
  gender: "",
}

const ROLE_LABELS: Record<Role, string> = {
  buyer: "Người mua",
  partner_owner: "Chủ tài khoản đối tác",
  partner_voucher_staff: "Nhân viên tạo voucher",
  partner_store_staff: "Nhân viên cửa hàng",
  admin_content: "Quản trị nội dung",
  admin_operations: "Quản trị vận hành",
  admin_security: "Quản trị bảo mật",
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? fallback
  }
  return fallback
}

function profileFormFromResponse(profile: Record<string, unknown>): ProfileForm {
  const gender = profile.gender === "male" || profile.gender === "female" || profile.gender === "other"
    ? profile.gender
    : ""

  return {
    full_name: typeof profile.full_name === "string" ? profile.full_name : "",
    phone: typeof profile.phone === "string" ? profile.phone : "",
    address: typeof profile.address === "string" ? profile.address : "",
    city: typeof profile.city === "string" ? profile.city : "",
    district: typeof profile.district === "string" ? profile.district : "",
    dob: typeof profile.dob === "string" ? profile.dob.slice(0, 10) : "",
    gender,
  }
}

export function PersonalProfilePage({ user, onLogout, showPasswordSection = true }: Props) {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [form, setForm] = useState<ProfileForm>({ ...emptyForm, full_name: user.name })
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")
  const [profileError, setProfileError] = useState("")
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" })
  const [showPassword, setShowPassword] = useState({ current: false, next: false, confirm: false })
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

  useEffect(() => {
    let active = true
    setLoading(true)
    authService.getProfile(user.id)
      .then((profile) => {
        if (!active) return
        setForm(profileFormFromResponse(profile))
        if (typeof profile.email === "string") setEmail(profile.email)
        if (typeof profile.role === "string") setRole(profile.role as AppUser["role"])
        setAvatarUrl(typeof profile.avatar_url === "string" ? profile.avatar_url : "")
      })
      .catch((error) => {
        if (active) setProfileError(getErrorMessage(error, "Không thể tải thông tin hồ sơ."))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [user.id])

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null)
      return
    }
    const previewUrl = URL.createObjectURL(avatarFile)
    setAvatarPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [avatarFile])

  const updateField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setProfileMessage("")
    setProfileError("")
  }

  const saveProfile = async () => {
    setProfileMessage("")
    setProfileError("")
    if (!form.full_name.trim()) {
      setProfileError("Họ và tên là thông tin bắt buộc.")
      return
    }
    if (form.phone && !/^(0|\+84)[0-9]{8,9}$/.test(form.phone.trim())) {
      setProfileError("Số điện thoại không đúng định dạng.")
      return
    }

    setProfileSubmitting(true)
    try {
      const nextAvatarUrl = avatarFile ? await mediaUploadService.uploadAvatar(avatarFile) : avatarUrl
      const profile = await authService.updateProfile(user.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        district: form.district.trim() || null,
        dob: form.dob || null,
        gender: form.gender || null,
        avatar_url: nextAvatarUrl || null,
      })
      const nextForm = profileFormFromResponse(profile)
      setForm(nextForm)
      const savedAvatarUrl = typeof profile.avatar_url === "string" ? profile.avatar_url : nextAvatarUrl
      setAvatarUrl(savedAvatarUrl)
      setAvatarFile(null)
      const nextName = nextForm.full_name || user.name
      setUser({ ...user, name: nextName, avatarUrl: savedAvatarUrl || undefined })
      setProfileMessage("Đã lưu thay đổi hồ sơ.")
    } catch (error) {
      setProfileError(getErrorMessage(error, "Không thể cập nhật hồ sơ. Vui lòng thử lại."))
    } finally {
      setProfileSubmitting(false)
    }
  }

  const handleAvatarChange = (file: File | undefined) => {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setProfileError("Ảnh đại diện phải là JPG, PNG hoặc WEBP và không quá 5 MB.")
      return
    }
    setAvatarFile(file)
    setProfileMessage("")
    setProfileError("")
  }

  const changePassword = async () => {
    setPasswordMessage("")
    setPasswordError("")
    if (!password.current) return setPasswordError("Vui lòng nhập mật khẩu hiện tại.")
    if (password.next.length < 8 || password.next.length > 64 || !/[A-Z]/.test(password.next) || !/[a-z]/.test(password.next) || !/[0-9]/.test(password.next) || !/[^A-Za-z0-9]/.test(password.next)) {
      return setPasswordError("Mật khẩu mới phải dài 8-64 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.")
    }
    if (password.next !== password.confirm) return setPasswordError("Mật khẩu xác nhận không khớp.")

    setPasswordSubmitting(true)
    try {
      await authService.changePassword(password.current, password.next, password.confirm)
      toast.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại để tiếp tục.")
      clearSession()
      router.replace("/login")
    } catch (error) {
      setPasswordError(getErrorMessage(error, "Không thể đổi mật khẩu. Vui lòng thử lại."))
    } finally {
      setPasswordSubmitting(false)
    }
  }

  const inputClass = "w-full rounded-xl border px-4 py-3 text-sm outline-none"
  const inputStyle = { borderColor: "#E2DFC8", backgroundColor: "white" }
  const passwordFields = [
    { key: "current" as const, label: "Mật khẩu hiện tại" },
    { key: "next" as const, label: "Mật khẩu mới" },
    { key: "confirm" as const, label: "Xác nhận mật khẩu mới" },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Hồ sơ cá nhân</h1>
        <p className="mt-1 text-sm" style={{ color: "#8A8DA8" }}>Quản lý thông tin tài khoản và bảo mật.</p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-4 border-b pb-6" style={{ borderColor: "#F0EDD8" }}>
          <div className="relative h-16 w-16 flex-shrink-0">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-2xl font-black" style={{ backgroundColor: `${C.peach}20`, color: C.peach }}>
              {avatarPreview || avatarUrl ? <img src={avatarPreview || avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" /> : form.full_name.trim().charAt(0).toUpperCase() || <User className="h-8 w-8" />}
            </div>
            <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full border-2 border-white p-1.5 text-white shadow-sm" style={{ backgroundColor: C.peach }} title="Đổi ảnh đại diện">
              <ImagePlus className="h-3.5 w-3.5" />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { handleAvatarChange(event.target.files?.[0]); event.target.value = "" }} />
            </label>
          </div>
          <div>
            <div className="font-black text-lg" style={{ color: C.indigo }}>{form.full_name || user.name}</div>
            <div className="text-sm" style={{ color: "#8A8DA8" }}>{email}</div>
            <div className="mt-1 text-xs font-semibold" style={{ color: C.teal }}>{ROLE_LABELS[role] ?? role}</div>
            <div className="mt-1 text-xs" style={{ color: "#9CA3AF" }}>JPG, PNG hoặc WEBP, tối đa 5 MB</div>
          </div>
        </div>

        {loading ? <LoadingState label="Đang tải thông tin hồ sơ..." variant="section" size="sm" /> : (
          <div className="space-y-4">
            <label className="block text-sm font-bold" style={{ color: C.indigo }}>
              Họ và tên *
              <input className={`${inputClass} mt-1.5`} style={inputStyle} value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} />
            </label>
            <label className="block text-sm font-bold" style={{ color: C.indigo }}>
              Email
              <input className={`${inputClass} mt-1.5 opacity-60`} style={inputStyle} value={email} disabled />
            </label>
            <label className="block text-sm font-bold" style={{ color: C.indigo }}>
              Số điện thoại
              <input className={`${inputClass} mt-1.5`} style={inputStyle} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </label>
            <label className="block text-sm font-bold" style={{ color: C.indigo }}>
              Địa chỉ
              <input className={`${inputClass} mt-1.5`} style={inputStyle} value={form.address} onChange={(event) => updateField("address", event.target.value)} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold" style={{ color: C.indigo }}>
                Thành phố
                <input className={`${inputClass} mt-1.5`} style={inputStyle} value={form.city} onChange={(event) => updateField("city", event.target.value)} />
              </label>
              <label className="block text-sm font-bold" style={{ color: C.indigo }}>
                Quận / huyện
                <input className={`${inputClass} mt-1.5`} style={inputStyle} value={form.district} onChange={(event) => updateField("district", event.target.value)} />
              </label>
              <label className="block text-sm font-bold" style={{ color: C.indigo }}>
                Ngày sinh
                <input type="date" className={`${inputClass} mt-1.5`} style={inputStyle} value={form.dob} onChange={(event) => updateField("dob", event.target.value)} />
              </label>
              <label className="block text-sm font-bold" style={{ color: C.indigo }}>
                Giới tính
                <select className={`${inputClass} mt-1.5`} style={inputStyle} value={form.gender} onChange={(event) => updateField("gender", event.target.value as ProfileForm["gender"])}>
                  <option value="">Chọn giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {profileError && <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{profileError}</div>}
        {profileMessage && <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle className="h-4 w-4 shrink-0" />{profileMessage}</div>}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={saveProfile} disabled={loading || profileSubmitting} className="flex-1 rounded-xl py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: C.peach }}>
            {profileSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
          <button type="button" onClick={onLogout} className="flex items-center gap-2 rounded-xl border px-4 py-3 font-bold" style={{ borderColor: "#E2DFC8", color: C.indigo }}><LogOut className="h-4 w-4" />Đăng xuất</button>
        </div>
      </section>

      {showPasswordSection && <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><Lock className="h-5 w-5" style={{ color: C.indigo }} /><h2 className="text-lg font-black" style={{ color: C.indigo }}>Đổi mật khẩu</h2></div>
        <div className="space-y-4">
          {passwordFields.map((field) => (
            <label key={field.key} className="block text-sm font-bold" style={{ color: C.indigo }}>
              {field.label}
              <div className="relative mt-1.5">
                <input type={showPassword[field.key] ? "text" : "password"} className={`${inputClass} pr-11`} style={inputStyle} value={password[field.key]} onChange={(event) => { setPassword((current) => ({ ...current, [field.key]: event.target.value })); setPasswordError("") }} />
                <button type="button" aria-label={showPassword[field.key] ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((current) => ({ ...current, [field.key]: !current[field.key] }))} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#8A8DA8" }}>
                  {showPassword[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          ))}
        </div>
        {passwordError && <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{passwordError}</div>}
        {passwordMessage && <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle className="h-4 w-4 shrink-0" />{passwordMessage}</div>}
        <button type="button" onClick={changePassword} disabled={passwordSubmitting} className="mt-6 w-full rounded-xl py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: C.indigo }}>
          {passwordSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
        </button>
      </section>}
    </div>
  )
}
