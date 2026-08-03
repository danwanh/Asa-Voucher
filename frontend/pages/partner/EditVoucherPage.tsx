import { useState } from "react"
import { ArrowLeft, CheckCircle, Save, FileEdit } from "lucide-react"
import { C, fmt, fmtDate, STATUS_LABEL, statusColor } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Voucher, VoucherStatus } from "@/types"

interface Props {
  voucher: Voucher
  onBack: () => void
  onSave: (v: Voucher) => void
}

const CATEGORIES = [
  { value: "food", label: "Ẩm thực" },
  { value: "beauty", label: "Làm đẹp" },
  { value: "travel", label: "Du lịch" },
  { value: "entertainment", label: "Giải trí" },
  { value: "sport", label: "Thể thao" },
  { value: "education", label: "Giáo dục" },
]

export function EditVoucherPage({ voucher, onBack, onSave }: Props) {
  const [saved, setSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    title: voucher.title,
    category: voucher.category,
    discountType: voucher.discountType,
    discount: String(voucher.discount),
    price: String(voucher.price),
    originalPrice: String(voucher.originalPrice),
    minOrder: String(voucher.minOrder),
    quantity: String(voucher.quantity),
    validFrom: voucher.validFrom,
    validTo: voucher.validTo,
    description: voucher.description,
    image: voucher.image,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const up = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = "Vui lòng nhập tên voucher"
    if (!form.discount || isNaN(Number(form.discount))) e.discount = "Giá trị giảm không hợp lệ"
    if (!form.price || isNaN(Number(form.price))) e.price = "Giá bán không hợp lệ"
    if (!form.quantity || isNaN(Number(form.quantity))) e.quantity = "Số lượng không hợp lệ"
    if (!form.validTo) e.validTo = "Vui lòng chọn ngày hết hạn"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildUpdated = (overrideStatus?: VoucherStatus): Voucher => ({
    ...voucher,
    title: form.title,
    category: form.category,
    discountType: form.discountType as "percent" | "fixed",
    discount: Number(form.discount),
    price: Number(form.price),
    originalPrice: Number(form.originalPrice) || Number(form.price),
    minOrder: Number(form.minOrder),
    quantity: Number(form.quantity),
    validFrom: form.validFrom,
    validTo: form.validTo,
    description: form.description,
    image: form.image || voucher.image,
    ...(overrideStatus ? { status: overrideStatus } : {}),
  })

  const handleSave = () => {
    if (!validate()) return
    onSave(buildUpdated())
    setSaved(true)
  }

  const handleSubmitForReview = () => {
    if (!validate()) return
    onSave(buildUpdated("pending"))
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-80">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: C.teal + "20" }}>
          <CheckCircle className="w-8 h-8" style={{ color: C.teal }} />
        </div>
        <h2 className="text-xl font-black mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Gửi duyệt thành công!</h2>
        <p className="text-sm text-center mb-1" style={{ color: "#8A8DA8" }}>Voucher <strong style={{ color: C.indigo }}>{form.title}</strong> đã được gửi.</p>
        <p className="text-sm text-center mb-6" style={{ color: "#8A8DA8" }}>Quản trị viên sẽ xem xét và phê duyệt sớm nhất có thể.</p>
        <button onClick={onBack} className="px-6 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: C.peach }}>
          Quay lại danh sách
        </button>
      </div>
    )
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
              <input className={inputCls(errors.title)} value={form.title} onChange={(e) => up("title", e.target.value)} placeholder="VD: Giảm 30% pizza size L" />
            </Field>
            <Field label="Danh mục">
              <select className={inputCls()} value={form.category} onChange={(e) => up("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Mô tả">
              <textarea rows={3} className={inputCls() + " resize-none"} value={form.description} onChange={(e) => up("description", e.target.value)} placeholder="Điều kiện sử dụng, chi tiết ưu đãi..." />
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
            <Field label="Kiểu giảm giá">
              <div className="flex gap-2">
                {[{ value: "percent", label: "%" }, { value: "fixed", label: "VNĐ" }].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => up("discountType", t.value)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                    style={{
                      backgroundColor: form.discountType === t.value ? C.indigo : "transparent",
                      color: form.discountType === t.value ? "white" : C.indigo,
                      borderColor: form.discountType === t.value ? C.indigo : "#E5E7EB",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={form.discountType === "percent" ? "Phần trăm giảm *" : "Số tiền giảm *"} error={errors.discount}>
              <input type="number" className={inputCls(errors.discount)} value={form.discount} onChange={(e) => up("discount", e.target.value)} placeholder={form.discountType === "percent" ? "30" : "50000"} />
            </Field>
            <Field label="Giá bán (đ) *" error={errors.price}>
              <input type="number" className={inputCls(errors.price)} value={form.price} onChange={(e) => up("price", e.target.value)} placeholder="49000" />
            </Field>
            <Field label="Giá gốc (đ)">
              <input type="number" className={inputCls()} value={form.originalPrice} onChange={(e) => up("originalPrice", e.target.value)} placeholder="70000" />
            </Field>
            <Field label="Đơn hàng tối thiểu (đ)">
              <input type="number" className={inputCls()} value={form.minOrder} onChange={(e) => up("minOrder", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Số lượng *" error={errors.quantity}>
              <input type="number" className={inputCls(errors.quantity)} value={form.quantity} onChange={(e) => up("quantity", e.target.value)} placeholder="100" />
            </Field>
          </div>
        </div>

        {/* Validity */}
        <div className="bg-white rounded-2xl p-6 border border-black/5">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Thời hạn</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Ngày bắt đầu">
              <input type="date" className={inputCls()} value={form.validFrom} onChange={(e) => up("validFrom", e.target.value)} />
            </Field>
            <Field label="Ngày hết hạn *" error={errors.validTo}>
              <input type="date" className={inputCls(errors.validTo)} value={form.validTo} onChange={(e) => up("validTo", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="py-3 px-5 rounded-2xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>
            Hủy
          </button>
          {voucher.status === "draft" ? (
            <>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border-2"
                style={{ borderColor: C.apricot, color: "#856404", backgroundColor: C.apricot + "20" }}
              >
                <Save className="w-4 h-4" /> Lưu nháp
              </button>
              <button
                onClick={handleSubmitForReview}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-white"
                style={{ backgroundColor: C.peach }}
              >
                 <AppIcon name="send" className="w-4 h-4" /> Gửi duyệt
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white"
                style={{ backgroundColor: C.peach }}
              >
                <Save className="w-4 h-4" /> Lưu thay đổi
              </button>
              {voucher.status === "rejected" && (
                <button
                  onClick={handleSubmitForReview}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm text-white"
                  style={{ backgroundColor: C.teal }}
                >
                   <AppIcon name="send" className="w-4 h-4" /> Gửi duyệt lại
                </button>
              )}
            </>
          )}
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
