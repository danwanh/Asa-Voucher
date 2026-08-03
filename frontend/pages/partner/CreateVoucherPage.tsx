import { useState } from "react"
import { ArrowLeft, CheckCircle, FileEdit } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Voucher } from "@/types"

interface Props {
  onBack: () => void
  onSaveDraft: (draft: Voucher) => void
}

type SubmitMode = "draft" | "publish"
type PageState = "form" | "success-draft" | "success-publish"

const CATEGORIES = [
  { value: "food",          label: "Ẩm thực" },
  { value: "beauty",        label: "Làm đẹp" },
  { value: "travel",        label: "Du lịch" },
  { value: "entertainment", label: "Giải trí" },
]

export function CreateVoucherPage({ onBack, onSaveDraft }: Props) {
  const [pageState, setPageState] = useState<PageState>("form")
  const [form, setForm] = useState({
    title: "", category: "food", discountType: "percent", discount: "",
    price: "", originalPrice: "", minOrder: "", quantity: "", validTo: "", description: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const up = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = "Vui lòng nhập tên voucher"
    if (!form.discount) e.discount = "Vui lòng nhập mức giảm"
    if (!form.price) e.price = "Vui lòng nhập giá bán"
    if (!form.quantity) e.quantity = "Vui lòng nhập số lượng"
    if (!form.validTo) e.validTo = "Vui lòng chọn ngày hết hạn"
    return e
  }

  const buildDraftVoucher = (): Voucher => ({
    id: "draft-" + Date.now(),
    partnerId: "p1",
    partnerName: "Pizza Hut Vietnam",
    partnerLogo: "gift",
    title: form.title || "Voucher chưa đặt tên",
    category: form.category,
    discount: Number(form.discount) || 0,
    discountType: form.discountType as "percent" | "fixed",
    minOrder: Number(form.minOrder) || 0,
    price: Number(form.price) || 0,
    originalPrice: Number(form.originalPrice) || Number(form.price) || 0,
    validFrom: new Date().toISOString().split("T")[0],
    validTo: form.validTo || "",
    quantity: Number(form.quantity) || 0,
    sold: 0,
    status: "draft",
    rating: 0,
    reviews: 0,
    description: form.description,
    image: "",
    tags: [],
  })

  const handleSaveDraft = () => {
    if (!form.title.trim()) {
      setErrors({ title: "Vui lòng nhập tên voucher để lưu nháp" })
      return
    }
    onSaveDraft(buildDraftVoucher())
    setPageState("success-draft")
  }

  const handlePublish = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setPageState("success-publish")
  }

  if (pageState === "success-draft") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-72">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: C.apricot + "30" }}>
          <FileEdit className="w-8 h-8" style={{ color: "#856404" }} />
        </div>
        <h2 className="text-xl font-black mb-2" style={{ color: C.indigo }}>Đã lưu bản nháp!</h2>
        <p className="text-sm text-center max-w-xs mb-2" style={{ color: "#8A8DA8" }}>
          Voucher <strong style={{ color: C.indigo }}>{form.title}</strong> đã được lưu ở trạng thái <strong>Bản nháp</strong>.
        </p>
        <p className="text-xs text-center mb-7" style={{ color: "#8A8DA8" }}>
          Bạn có thể tiếp tục chỉnh sửa và gửi duyệt khi sẵn sàng.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setPageState("form")}
            className="px-5 py-2.5 rounded-xl font-bold text-sm border-2"
            style={{ borderColor: C.indigo + "30", color: C.indigo }}
          >
            Tiếp tục chỉnh sửa
          </button>
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl font-bold text-white text-sm"
            style={{ backgroundColor: C.peach }}
          >
            Xem danh sách voucher
          </button>
        </div>
      </div>
    )
  }

  if (pageState === "success-publish") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-72">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: C.teal + "20" }}>
          <CheckCircle className="w-8 h-8" style={{ color: C.teal }} />
        </div>
        <h2 className="text-xl font-black mb-2" style={{ color: C.indigo }}>Gửi duyệt thành công!</h2>
        <p className="text-sm text-center mb-6" style={{ color: "#8A8DA8" }}>
          Voucher <strong style={{ color: C.indigo }}>{form.title}</strong> đã được gửi.<br />
          Quản trị viên sẽ xem xét và phê duyệt sớm nhất có thể.
        </p>
        <button onClick={onBack} className="px-6 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: C.peach }}>
          Quay lại danh sách
        </button>
      </div>
    )
  }

  const inputCls = (err?: string) =>
    `w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors ${err ? "border-red-400" : ""}`
  const inputStyle = (err?: string): React.CSSProperties => ({
    borderColor: err ? "#EF4444" : "#E2DFC8",
    backgroundColor: C.eggshell,
    fontFamily: "'Inter', sans-serif",
  })

  return (
    <div className="p-6 max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-2 mb-5 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>
      <h2 className="text-xl font-black mb-1" style={{ color: C.indigo }}>Tạo voucher mới</h2>
      <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>Điền thông tin và chọn <strong>Lưu nháp</strong> để tiếp tục sau, hoặc <strong>Gửi duyệt</strong> khi đã hoàn chỉnh.</p>

      {/* Draft lifecycle reminder */}
      <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl text-xs font-semibold" style={{ backgroundColor: C.apricot + "20", color: "#6B4F00" }}>
         <AppIcon name="document" className="w-4 h-4" />
        <span>Luồng: <strong>Bản nháp</strong> → Chỉnh sửa → <strong>Gửi duyệt</strong> → Được duyệt → Đang bán</span>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
        {/* Title */}
        <div>
          <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Tên voucher *</label>
          <input
            className={inputCls(errors.title)}
            placeholder="VD: Giảm 30% pizza size L"
            style={inputStyle(errors.title)}
            value={form.title}
            onChange={(e) => up("title", e.target.value)}
          />
          {errors.title && <p className="text-xs mt-1 text-red-500">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Danh mục</label>
            <select className={inputCls()} style={inputStyle()} value={form.category} onChange={(e) => up("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Loại giảm giá</label>
            <select className={inputCls()} style={inputStyle()} value={form.discountType} onChange={(e) => up("discountType", e.target.value)}>
              <option value="percent">Phần trăm (%)</option>
              <option value="fixed">Số tiền cố định (đ)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "discount",      label: `Mức giảm ${form.discountType === "percent" ? "(%)" : "(đ)"} *`, ph: "30" },
            { key: "price",         label: "Giá bán (đ) *",  ph: "49000" },
            { key: "originalPrice", label: "Giá gốc (đ)",    ph: "70000" },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>{label}</label>
              <input
                type="number"
                className={inputCls(errors[key])}
                placeholder={ph}
                style={inputStyle(errors[key])}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => up(key, e.target.value)}
              />
              {errors[key] && <p className="text-xs mt-1 text-red-500">{errors[key]}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Số lượng *</label>
            <input
              type="number"
              className={inputCls(errors.quantity)}
              placeholder="200"
              style={inputStyle(errors.quantity)}
              value={form.quantity}
              onChange={(e) => up("quantity", e.target.value)}
            />
            {errors.quantity && <p className="text-xs mt-1 text-red-500">{errors.quantity}</p>}
          </div>
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Hạn sử dụng *</label>
            <input
              type="date"
              className={inputCls(errors.validTo)}
              style={inputStyle(errors.validTo)}
              value={form.validTo}
              onChange={(e) => up("validTo", e.target.value)}
            />
            {errors.validTo && <p className="text-xs mt-1 text-red-500">{errors.validTo}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Mô tả</label>
          <textarea
            rows={3}
            className={inputCls() + " resize-none"}
            placeholder="Điều kiện sử dụng, chi tiết ưu đãi..."
            style={inputStyle()}
            value={form.description}
            onChange={(e) => up("description", e.target.value)}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSaveDraft}
            className="flex-1 py-3 rounded-2xl font-bold text-sm border-2 transition-all hover:opacity-90"
            style={{ borderColor: C.apricot, color: "#856404", backgroundColor: C.apricot + "20" }}
          >
             <AppIcon name="save" className="w-4 h-4" /> Lưu nháp
          </button>
          <button
            onClick={handlePublish}
            className="flex-1 py-3 rounded-2xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: C.peach }}
          >
             <AppIcon name="send" className="w-4 h-4" /> Gửi duyệt
          </button>
        </div>
        <p className="text-xs text-center" style={{ color: "#8A8DA8" }}>
          Lưu nháp để chỉnh sửa tiếp. Gửi duyệt khi voucher hoàn chỉnh.
        </p>
      </div>
    </div>
  )
}
