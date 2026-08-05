import { useMemo, useState } from "react"
import { BadgeCheck, Clock, XCircle, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { C } from "@/utils/constants"
import type { AppUser } from "@/types"
import { authService } from "@/services/authService"
import { partnerService, type PartnerProfile, type PartnerCreateInput, type PartnerUpdateInput } from "@/services/partnerService"

type Props = {
  user: AppUser
  partner: PartnerProfile | null
  onPartnerUpdated: (partner: PartnerProfile | null) => void
}

type PartnerForm = {
  businessName: string
  businessCode: string
  businessType: string
  taxNumber: string
  website: string
  description: string
}

type RepresentativeForm = {
  fullName: string
  email: string
  phone: string
  address: string
}

function approvalLabel(status: PartnerProfile["approvalStatus"]) {
  if (status === "approved") return "Đã duyệt"
  if (status === "pending") return "Chờ duyệt"
  return "Bị từ chối"
}

function approvalMeta(status: PartnerProfile["approvalStatus"]) {
  if (status === "approved") {
    return { icon: <BadgeCheck className="w-4 h-4" />, color: "#2D7A52", bg: "#E8F5EE" }
  }
  if (status === "pending") {
    return { icon: <Clock className="w-4 h-4" />, color: "#D97706", bg: "#FEF3C7" }
  }
  return { icon: <XCircle className="w-4 h-4" />, color: "#B91C1C", bg: "#FEE2E2" }
}

function businessTypeOptions() {
  return [
    { value: "", label: "Chọn loại hình" },
    { value: "restaurant", label: "Ẩm thực" },
    { value: "spa", label: "Làm đẹp" },
    { value: "entertainment", label: "Giải trí" },
    { value: "hotel", label: "Du lịch/Khách sạn" },
    { value: "other", label: "Khác" },
  ]
}

function mapPartnerToForm(partner: PartnerProfile | null): PartnerForm {
  return {
    businessName: partner?.businessName ?? "",
    businessCode: partner?.businessCode ?? "",
    businessType: partner?.businessType ?? "",
    taxNumber: partner?.taxNumber ?? "",
    website: partner?.websiteUrl ?? "",
    description: partner?.description ?? "",
  }
}

function mapUserToRepresentative(user: AppUser): RepresentativeForm {
  return {
    fullName: user.name,
    email: user.email,
    phone: "",
    address: "",
  }
}

export function BusinessProfilePage({ user, partner, onPartnerUpdated }: Props) {
  const [partnerForm, setPartnerForm] = useState<PartnerForm>(() => mapPartnerToForm(partner))
  const [representative, setRepresentative] = useState<RepresentativeForm>(() => mapUserToRepresentative(user))
  const [isSaving, setIsSaving] = useState(false)

  const hasProfile = Boolean(partner)
  const pendingReadonly = partner?.approvalStatus === "pending"

  const statusMeta = useMemo(
    () => (partner ? approvalMeta(partner.approvalStatus) : null),
    [partner],
  )

  const setPartnerField = (key: keyof PartnerForm, value: string) => {
    setPartnerForm((prev) => ({ ...prev, [key]: value }))
  }

  const setRepresentativeField = (key: keyof RepresentativeForm, value: string) => {
    setRepresentative((prev) => ({ ...prev, [key]: value }))
  }

  const validateProfile = () => {
    if (!partnerForm.businessName.trim()) {
      toast.error("Tên doanh nghiệp là bắt buộc")
      return false
    }
    if (!hasProfile && !partnerForm.businessCode.trim()) {
      toast.error("Mã doanh nghiệp là bắt buộc khi đăng ký mới")
      return false
    }
    if (!representative.fullName.trim()) {
      toast.error("Tên người đại diện là bắt buộc")
      return false
    }
    return true
  }

  const loadRepresentativeFromApi = async () => {
    try {
      const profile = await authService.getProfile(user.id)
      setRepresentative((prev) => ({
        ...prev,
        fullName: (profile.full_name as string) || prev.fullName,
        email: (profile.email as string) || prev.email,
        phone: (profile.phone as string) || "",
        address: (profile.address as string) || "",
      }))
    } catch {
      // Keep local user values as fallback if profile API fails.
    }
  }

  const syncLatestPartnerAndUser = async () => {
    await loadRepresentativeFromApi()
    if (!user.partnerId) return
    try {
      const refreshedPartner = await partnerService.getPartner(user.partnerId)
      onPartnerUpdated(refreshedPartner)
      setPartnerForm(mapPartnerToForm(refreshedPartner))
    } catch {
      // Ignore refresh error to keep UI responsive after successful save.
    }
  }

  const saveProfile = async () => {
    if (!validateProfile()) return

    setIsSaving(true)
    try {
      const profilePayload = {
        full_name: representative.fullName,
        phone: representative.phone || undefined,
        address: representative.address || undefined,
      }

      if (!hasProfile) {
        const createPayload: PartnerCreateInput = {
          business_name: partnerForm.businessName,
          business_code: partnerForm.businessCode,
          business_type: partnerForm.businessType || undefined,
          tax_number: partnerForm.taxNumber || undefined,
          website_url: partnerForm.website || undefined,
          description: partnerForm.description || undefined,
        }

        const [createdPartner] = await Promise.all([
          partnerService.createMyPartner(createPayload),
          authService.updateProfile(user.id, profilePayload),
        ])

        onPartnerUpdated(createdPartner)
        setPartnerForm(mapPartnerToForm(createdPartner))
        toast.success("Đã tạo hồ sơ đối tác thành công")
      } else {
        const updatePayload: PartnerUpdateInput = {
          business_name: partnerForm.businessName,
          business_type: partnerForm.businessType || undefined,
          tax_number: partnerForm.taxNumber || undefined,
          website_url: partnerForm.website || undefined,
          description: partnerForm.description || undefined,
        }

        await Promise.all([
          partnerService.updatePartner(partner.id, updatePayload),
          authService.updateProfile(user.id, profilePayload),
        ])

        toast.success("Đã lưu hồ sơ đối tác")
      }

      await syncLatestPartnerAndUser()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } }
      toast.error(err?.response?.data?.error?.message ?? "Không thể lưu hồ sơ đối tác")
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border text-sm outline-none bg-white"
  const inputStyle = { borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Hồ sơ đối tác</h1>
        {!hasProfile && (
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>
            Bạn chưa có hồ sơ doanh nghiệp. Hoàn tất thông tin để gửi xét duyệt.
          </p>
        )}
      </div>

      {partner && statusMeta && (
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: statusMeta.bg }}>
          <div>
            <div className="text-sm font-bold" style={{ color: statusMeta.color }}>Trạng thái hồ sơ: {approvalLabel(partner.approvalStatus)}</div>
            <div className="text-xs mt-1" style={{ color: "#6B7280" }}>
              Trạng thái hoạt động: {partner.status === "active" ? "Đang hoạt động" : partner.status === "suspended" ? "Tạm ngưng" : "Đã đóng"}
            </div>
          </div>
          <div style={{ color: statusMeta.color }}>{statusMeta.icon}</div>
        </div>
      )}

      {pendingReadonly && (
        <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
          Hồ sơ đang chờ duyệt. Bạn chỉ nên chỉnh sửa thông tin liên hệ khi cần thiết.
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="font-black text-lg" style={{ color: C.indigo }}>Thông tin doanh nghiệp</h2>

        <div>
          <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Tên doanh nghiệp *</label>
          <input
            className={inputClass}
            style={inputStyle}
            value={partnerForm.businessName}
            onChange={(event) => setPartnerField("businessName", event.target.value)}
            disabled={isSaving || pendingReadonly}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Mã doanh nghiệp *</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={partnerForm.businessCode}
              onChange={(event) => setPartnerField("businessCode", event.target.value)}
              disabled={isSaving || hasProfile}
            />
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Mã số thuế</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={partnerForm.taxNumber}
              onChange={(event) => setPartnerField("taxNumber", event.target.value)}
              disabled={isSaving || pendingReadonly}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Loại hình kinh doanh</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={partnerForm.businessType}
              onChange={(event) => setPartnerField("businessType", event.target.value)}
              disabled={isSaving || pendingReadonly}
            >
              {businessTypeOptions().map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Website</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={partnerForm.website}
              onChange={(event) => setPartnerField("website", event.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Mô tả doanh nghiệp</label>
          <textarea
            className={inputClass + " resize-none"}
            style={inputStyle}
            rows={4}
            value={partnerForm.description}
            onChange={(event) => setPartnerField("description", event.target.value)}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="font-black text-lg" style={{ color: C.indigo }}>Thông tin người đại diện</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Họ tên *</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={representative.fullName}
              onChange={(event) => setRepresentativeField("fullName", event.target.value)}
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Email</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={representative.email}
              onChange={(event) => setRepresentativeField("email", event.target.value)}
              disabled
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Số điện thoại</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={representative.phone}
              onChange={(event) => setRepresentativeField("phone", event.target.value)}
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Địa chỉ</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={representative.address}
              onChange={(event) => setRepresentativeField("address", event.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      <button
        onClick={saveProfile}
        disabled={isSaving}
        className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-70"
        style={{ backgroundColor: C.peach }}
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {hasProfile ? "Lưu thay đổi" : "Gửi đăng ký hồ sơ"}
      </button>
    </div>
  )
}
