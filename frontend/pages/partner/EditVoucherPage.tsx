import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle, FileEdit, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { C, fmt, fmtDate, STATUS_LABEL, statusColor } from "@/utils/constants"
import { voucherService } from "@/services/voucherService"
import type { Voucher } from "@/types"
import { parseApplicableAreas, serializeApplicableAreas } from "@/utils/applicableArea"

interface Props {
  voucher: Voucher
  onBack: () => void
  onSave: (v: Voucher) => void
}

type FormState = {
  title: string
  description: string
  applicableArea: string
  originalPrice: string
  price: string
  quantity: string
  validFrom: string
  validTo: string
  terms: string
  usageInstructions: string
  image: string
}

function toDateInputValue(value?: string | null): string {
  if (!value) return ""
  return value.slice(0, 10)
}

function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
}

function getErrorMessage(error: unknown, fallback: string) {
  const err = error as { response?: { data?: { error?: { message?: string } } } }
  return err?.response?.data?.error?.message ?? fallback
}

export function EditVoucherPage({ voucher, onBack, onSave }: Props) {
  const [isLoadingDetail, setIsLoadingDetail] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<FormState>({
    title: voucher.title,
    description: voucher.description,
    applicableArea: serializeApplicableAreas(parseApplicableAreas(voucher.applicableArea)),
    originalPrice: String(voucher.originalPrice),
    price: String(voucher.price),
    quantity: String(voucher.quantity),
    validFrom: toDateInputValue(voucher.validFrom),
    validTo: toDateInputValue(voucher.validTo),
    terms: "",
    usageInstructions: "",
    image: voucher.image,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let isMounted = true

    async function loadDetail() {
      setIsLoadingDetail(true)
      try {
        const detail = await voucherService.getDetail(voucher.id)
        if (!isMounted) return
        setForm((current) => ({
          ...current,
          title: detail.voucher.title,
          description: detail.voucher.description,
          applicableArea: serializeApplicableAreas(parseApplicableAreas(detail.applicableArea)),
          originalPrice: String(detail.voucher.originalPrice),
          price: String(detail.voucher.price),
          quantity: String(detail.voucher.quantity),
          validFrom: toDateInputValue(detail.voucher.validFrom),
          validTo: toDateInputValue(detail.voucher.validTo),
          terms: detail.conditions.join("\n"),
          usageInstructions: detail.usageInstructions.join("\n"),
          image: detail.voucher.image,
        }))
      } catch {
        if (!isMounted) return
      } finally {
        if (!isMounted) return
        setIsLoadingDetail(false)
      }
    }

    void loadDetail()
    return () => {
      isMounted = false
    }
  }, [voucher.id])

  const up = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: "" }))
  }

  const autoDiscountRate = useMemo(() => {
    const original = Number(form.originalPrice)
    const selling = Number(form.price)
    if (!Number.isFinite(original) || !Number.isFinite(selling) || original <= 0) return 0
    const raw = ((original - selling) / original) * 100
    if (!Number.isFinite(raw)) return 0
    return Math.max(0, Math.round(raw * 100) / 100)
  }, [form.originalPrice, form.price])

  const validate = () => {
    const e: Record<string, string> = {}
    const originalPrice = Number(form.originalPrice)
    const sellingPrice = Number(form.price)
    const quantity = Number(form.quantity)

    if (!form.title.trim()) e.title = "Vui lòng nhập tên voucher"
    if (!form.description.trim()) e.description = "Vui lòng nhập mô tả"
    if (!Number.isFinite(originalPrice) || originalPrice <= 0) e.originalPrice = "Giá gốc phải lớn hơn 0"
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) e.price = "Giá bán phải lớn hơn 0"
    if (Number.isFinite(originalPrice) && Number.isFinite(sellingPrice) && sellingPrice >= originalPrice) {
      e.price = "Giá bán phải nhỏ hơn giá gốc"
    }
    if (!Number.isInteger(quantity) || quantity <= 0) e.quantity = "Số lượng phải là số nguyên dương"
    if (!form.validFrom) e.validFrom = "Vui lòng chọn ngày bắt đầu"
    if (!form.validTo) e.validTo = "Vui lòng chọn ngày kết thúc"
    if (form.validFrom && form.validTo && form.validFrom > form.validTo) e.validTo = "Ngày kết thúc phải sau ngày bắt đầu"
    if (toLines(form.terms).length === 0) e.terms = "Vui lòng nhập điều kiện sử dụng"

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setIsSaving(true)
    try {
      const updated = await voucherService.updateVoucher(voucher.id, {
        category_id: voucher.categoryId,
        name: form.title.trim(),
        description: form.description.trim(),
        applicable_area: serializeApplicableAreas(parseApplicableAreas(form.applicableArea)) || undefined,
        thumbnail_url: form.image.trim() || undefined,
        original_price: Number(form.originalPrice),
        selling_price: Number(form.price),
        total_quantity: Number(form.quantity),
        sale_start_date: form.validFrom,
        sale_end_date: form.validTo,
        terms_and_conditions: toLines(form.terms),
        usage_instructions: toLines(form.usageInstructions),
      })
      onSave(updated)
      setSaved(true)
      toast.success("Lưu voucher thành công")
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu voucher"))
    } finally {
      setIsSaving(false)
    }
  }

  if (saved) {
    const isDraft = voucher.status === "draft"
    return (
      <div className="p-6 flex flex-col items-center justify-center h-80">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: isDraft ? C.apricot + "30" : C.teal + "20" }}>
          {isDraft ? <FileEdit className="w-8 h-8" style={{ color: "#856404" }} /> : <CheckCircle className="w-8 h-8" style={{ color: C.teal }} />}
        </div>
        <h2 className="text-xl font-black mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
          {isDraft ? "Đã lưu bản nháp!" : "Lưu thành công!"}
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: "#8A8DA8" }}>
          {isDraft ? "Bạn có thể tiếp tục chỉnh sửa và gửi duyệt khi sẵn sàng." : "Voucher đã được cập nhật."}
        </p>
        <button onClick={onBack} className="px-6 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: C.peach }}>
          Quay lại danh sách
        </button>
      </div>
    )
  }

  if (isLoadingDetail) {
    return (
      <div className="p-6">
        <div className="inline-flex items-center gap-2 text-sm" style={{ color: "#8A8DA8" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải dữ liệu voucher...
        </div>
      </div>
    )
  }

  const sc = statusColor(voucher.status)

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <span className="px-3 py-1 rounded-xl text-xs font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>
          {STATUS_LABEL[voucher.status]}
        </span>
      </div>

      <h2 className="text-xl font-black mb-6" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Chỉnh sửa voucher</h2>

      <div className="space-y-5">
        {/* Basic info */}
        <div className="bg-white rounded-2xl p-6 border border-black/5">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Thông tin cơ bản</h3>
          <div className="space-y-4">
            <Field label="Tên voucher *" error={errors.title}>
              <input className={inputCls(errors.title)} value={form.title} onChange={(e) => up("title", e.target.value)} placeholder="VD: Combo cà phê 2 ly" />
            </Field>
            <Field label="Danh mục">
              <input className={inputCls()} value={voucher.category} readOnly />
            </Field>
            <Field label="Mô tả *" error={errors.description}>
              <textarea rows={3} className={inputCls() + " resize-none"} value={form.description} onChange={(e) => up("description", e.target.value)} placeholder="Điều kiện sử dụng, chi tiết ưu đãi..." />
            </Field>
            <Field label="Khu vực áp dụng">
              <input className={inputCls()} value={form.applicableArea} onChange={(e) => up("applicableArea", e.target.value)} placeholder="VD: TP. Hồ Chí Minh" />
            </Field>
            <Field label="Ảnh đại diện (URL)">
              <input className={inputCls()} value={form.image} onChange={(e) => up("image", e.target.value)} placeholder="https://..." />
              {form.image && (
                <div className="mt-2 w-32 h-20 rounded-xl overflow-hidden">
                  <img src={form.image} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
            </Field>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl p-6 border border-black/5">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Giá & Giảm giá</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Giá gốc (đ) *" error={errors.originalPrice}>
              <input type="number" className={inputCls(errors.originalPrice)} value={form.originalPrice} onChange={(e) => up("originalPrice", e.target.value)} placeholder="70000" />
            </Field>
            <Field label="Giá bán (đ) *" error={errors.price}>
              <input type="number" className={inputCls(errors.price)} value={form.price} onChange={(e) => up("price", e.target.value)} placeholder="49000" />
            </Field>
            <Field label="Mức giảm tự động">
              <input className={inputCls()} value={`${autoDiscountRate.toFixed(2)}%`} readOnly />
            </Field>
            <Field label="Số lượng *" error={errors.quantity}>
              <input type="number" className={inputCls(errors.quantity)} value={form.quantity} onChange={(e) => up("quantity", e.target.value)} placeholder="100" />
            </Field>
            <Field label="Đơn hàng tối thiểu (đ)">
              <input className={inputCls()} value={fmt(voucher.minOrder)} readOnly />
            </Field>
          </div>
        </div>

        {/* Validity */}
        <div className="bg-white rounded-2xl p-6 border border-black/5">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Thời hạn</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Ngày bắt đầu *" error={errors.validFrom}>
              <input type="date" className={inputCls(errors.validFrom)} value={form.validFrom} onChange={(e) => up("validFrom", e.target.value)} />
            </Field>
            <Field label="Ngày kết thúc *" error={errors.validTo}>
              <input type="date" className={inputCls(errors.validTo)} value={form.validTo} onChange={(e) => up("validTo", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-black/5">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Điều kiện sử dụng</h3>
          <div className="space-y-4">
            <Field label="Điều kiện áp dụng *" error={errors.terms}>
              <textarea rows={4} className={inputCls(errors.terms) + " resize-none"} value={form.terms} onChange={(e) => up("terms", e.target.value)} />
            </Field>
            <Field label="Hướng dẫn sử dụng">
              <textarea rows={3} className={inputCls() + " resize-none"} value={form.usageInstructions} onChange={(e) => up("usageInstructions", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="py-3 px-5 rounded-2xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-60"
            style={{ backgroundColor: C.peach }}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1.5" style={{ color: "#3D405B" }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{error}</p>}
    </div>
  )
}

function inputCls(error?: string) {
  return `w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none transition-colors ${error ? "border-red-400" : "border-gray-200 focus:border-opacity-60"}`
}
