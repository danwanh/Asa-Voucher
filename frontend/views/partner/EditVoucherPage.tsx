import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { C } from "@/utils/constants"
import { partnerService, type PartnerBranch } from "@/services/partnerService"
import { voucherService } from "@/services/voucherService"
import { mediaUploadService } from "@/services/mediaUploadService"
import type { Voucher } from "@/types"
import { serializeApplicableAreas } from "@/utils/applicableArea"
import { VoucherImageUpload } from "@/components/VoucherImageUpload"

interface Props {
  voucher: Voucher
  onBack: () => void
  onSave: (v: Voucher) => void
}

type CategoryOption = {
  id: string
  name: string
}

type FormState = {
  name: string
  categoryId: string
  description: string
  image: string
  originalPrice: string
  sellingPrice: string
  totalQuantity: string
  saleStartDate: string
  saleEndDate: string
  validityDays: string
  terms: string
  usageInstructions: string
  branchIds: string[]
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
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [branches, setBranches] = useState<PartnerBranch[]>([])
  const [assignedBranchIds, setAssignedBranchIds] = useState<string[]>([])
  const [form, setForm] = useState<FormState>({
    name: voucher.title,
    categoryId: voucher.categoryId ?? "",
    description: voucher.description,
    image: voucher.image,
    originalPrice: String(voucher.originalPrice),
    sellingPrice: String(voucher.price),
    totalQuantity: String(voucher.quantity),
    saleStartDate: toDateInputValue(voucher.validFrom),
    saleEndDate: toDateInputValue(voucher.validTo),
    validityDays: "",
    terms: "",
    usageInstructions: "",
    branchIds: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadFormData() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const [detail, categoryResult, branchResult, voucherBranches] = await Promise.all([
          voucherService.getManageDetail(voucher.id),
          voucherService.listCategories(),
          partnerService.listBranches(voucher.partnerId),
          voucherService.listVoucherBranches(voucher.id),
        ])
        if (!isMounted) return

        const selectedBranchIds = voucherBranches.map((branch) => branch.branchId)
        const activeBranches = branchResult.filter((branch) => branch.isActive || selectedBranchIds.includes(branch.id))
        setCategories(categoryResult.map((category) => ({ id: category.id, name: category.name })))
        setBranches(activeBranches)
        setAssignedBranchIds(selectedBranchIds)
        setForm((current) => ({
          ...current,
          name: detail.voucher.title,
          categoryId: detail.voucher.categoryId ?? current.categoryId ?? categoryResult[0]?.id ?? "",
          description: detail.voucher.description,
          image: detail.voucher.image,
          originalPrice: String(detail.voucher.originalPrice),
          sellingPrice: String(detail.voucher.price),
          totalQuantity: String(detail.voucher.quantity),
          saleStartDate: toDateInputValue(detail.voucher.validFrom),
          saleEndDate: toDateInputValue(detail.voucher.validTo),
          validityDays: String(detail.validityDays),
          terms: detail.conditions.join("\n"),
          usageInstructions: detail.usageInstructions.join("\n"),
          branchIds: selectedBranchIds,
        }))
      } catch (error) {
        if (!isMounted) return
        setLoadError(getErrorMessage(error, "Không thể tải dữ liệu chỉnh sửa voucher"))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadFormData()
    return () => {
      isMounted = false
    }
  }, [voucher.id, voucher.partnerId])

  const selectedBranches = useMemo(
    () => branches.filter((branch) => form.branchIds.includes(branch.id)),
    [branches, form.branchIds]
  )

  const derivedApplicableArea = useMemo(
    () => serializeApplicableAreas(selectedBranches.map((branch) => branch.city)),
    [selectedBranches]
  )

  const updateField = (key: keyof FormState, value: string | string[]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: "" }))
  }

  const toggleBranch = (branchId: string) => {
    setForm((current) => {
      const exists = current.branchIds.includes(branchId)
      return {
        ...current,
        branchIds: exists
          ? current.branchIds.filter((id) => id !== branchId)
          : [...current.branchIds, branchId]
      }
    })
    setErrors((current) => ({ ...current, branchIds: "" }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    const originalPrice = Number(form.originalPrice)
    const sellingPrice = Number(form.sellingPrice)
    const totalQuantity = Number(form.totalQuantity)
    const validityDays = Number(form.validityDays)

    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên voucher"
    if (!form.categoryId) nextErrors.categoryId = "Vui lòng chọn danh mục"
    if (!form.description.trim()) nextErrors.description = "Vui lòng nhập mô tả"
    if (!Number.isFinite(originalPrice) || originalPrice <= 0) nextErrors.originalPrice = "Giá gốc phải lớn hơn 0"
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) nextErrors.sellingPrice = "Giá bán phải lớn hơn 0"
    if (Number.isFinite(originalPrice) && Number.isFinite(sellingPrice) && sellingPrice >= originalPrice) {
      nextErrors.sellingPrice = "Giá bán phải nhỏ hơn giá gốc"
    }
    if (!Number.isInteger(totalQuantity) || totalQuantity <= 0) nextErrors.totalQuantity = "Số lượng phát hành phải là số nguyên dương"
    if (!form.saleStartDate) nextErrors.saleStartDate = "Vui lòng chọn ngày bắt đầu bán"
    if (!form.saleEndDate) nextErrors.saleEndDate = "Vui lòng chọn ngày kết thúc bán"
    if (form.saleStartDate && form.saleEndDate && new Date(form.saleStartDate) > new Date(form.saleEndDate)) {
      nextErrors.saleEndDate = "Ngày kết thúc bán phải sau ngày bắt đầu"
    }
    if (!Number.isInteger(validityDays) || validityDays <= 0) nextErrors.validityDays = "Số ngày sử dụng phải là số nguyên dương"
    if (toLines(form.terms).length === 0) nextErrors.terms = "Vui lòng nhập điều kiện sử dụng"
    if (form.branchIds.length === 0) nextErrors.branchIds = "Vui lòng chọn ít nhất một chi nhánh"

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const syncBranches = async () => {
    const nextBranchIds = new Set(form.branchIds)
    const previousBranchIds = new Set(assignedBranchIds)

    await Promise.all([
      ...assignedBranchIds
        .filter((branchId) => !nextBranchIds.has(branchId))
        .map((branchId) => voucherService.removeBranch(voucher.id, branchId)),
      ...form.branchIds
        .filter((branchId) => !previousBranchIds.has(branchId))
        .map((branchId) => voucherService.assignBranch(voucher.id, branchId)),
    ])
    setAssignedBranchIds(form.branchIds)
  }

  const handleSave = async () => {
    if (!validate()) return

    setIsSaving(true)
    try {
      const uploadedImageUrl = imageFile
        ? await mediaUploadService.uploadImage(imageFile)
        : form.image.trim()
      if (uploadedImageUrl && uploadedImageUrl !== form.image) {
        setForm((current) => ({ ...current, image: uploadedImageUrl }))
        setImageFile(null)
      }

      const updated = await voucherService.updateVoucher(voucher.id, {
        category_id: form.categoryId,
        name: form.name.trim(),
        description: form.description.trim(),
        thumbnail_url: uploadedImageUrl || undefined,
        applicable_area: derivedApplicableArea || undefined,
        original_price: Number(form.originalPrice),
        selling_price: Number(form.sellingPrice),
        total_quantity: Number(form.totalQuantity),
        sale_start_date: form.saleStartDate,
        sale_end_date: form.saleEndDate,
        validity_days: Number(form.validityDays),
        terms_and_conditions: toLines(form.terms),
        usage_instructions: toLines(form.usageInstructions),
      })
      await syncBranches()
      onSave(updated)
      toast.success("Lưu voucher thành công")
      onBack()
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể lưu voucher"))
    } finally {
      setIsSaving(false)
    }
  }

  const inputCls = (error?: string) =>
    `w-full px-4 py-2.5 rounded-xl border text-sm outline-none bg-white ${error ? "border-red-400" : "border-[#E2DFC8]"}`

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm" style={{ color: "#8A8DA8" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải dữ liệu voucher...
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-6 max-w-2xl">
        <button onClick={onBack} className="flex items-center gap-2 mb-5 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <div className="rounded-xl border bg-white p-5 text-sm" style={{ borderColor: "#F0EDD8", color: "#C0392B" }}>
          {loadError}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-2 mb-5 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      <h2 className="text-xl font-black mb-1" style={{ color: C.indigo }}>Chỉnh sửa voucher</h2>
      <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>Cập nhật thông tin voucher trước khi gửi duyệt hoặc bán.</p>

      <div className="space-y-5">
        <section className="bg-white rounded-2xl p-6 border border-black/5">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Thông tin voucher</h3>
          <div className="space-y-4">
            <Field label="Tên voucher *" error={errors.name}>
              <input className={inputCls(errors.name)} value={form.name} onChange={(event) => updateField("name", event.target.value)} disabled={isSaving} />
            </Field>
            <Field label="Danh mục *" error={errors.categoryId}>
              <select className={inputCls(errors.categoryId)} value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)} disabled={isSaving}>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>
            <Field label="Mô tả *" error={errors.description}>
              <textarea rows={3} className={`${inputCls(errors.description)} resize-none`} value={form.description} onChange={(event) => updateField("description", event.target.value)} disabled={isSaving} />
            </Field>
            <Field label="Khu vực áp dụng">
              <input className={inputCls()} value={derivedApplicableArea} readOnly placeholder="Tự động từ chi nhánh đã chọn" />
              <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>
                Hệ thống tự động lấy khu vực từ tỉnh/thành của chi nhánh áp dụng.
              </p>
            </Field>
            <Field label="Ảnh đại diện">
              <VoucherImageUpload
                imageUrl={form.image}
                selectedFile={imageFile}
                disabled={isSaving}
                onFileChange={setImageFile}
                onError={toast.error}
              />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-black/5">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Giá và số lượng</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Giá gốc (đ) *" error={errors.originalPrice}>
              <input type="number" className={inputCls(errors.originalPrice)} value={form.originalPrice} onChange={(event) => updateField("originalPrice", event.target.value)} disabled={isSaving} />
            </Field>
            <Field label="Giá bán (đ) *" error={errors.sellingPrice}>
              <input type="number" className={inputCls(errors.sellingPrice)} value={form.sellingPrice} onChange={(event) => updateField("sellingPrice", event.target.value)} disabled={isSaving} />
            </Field>
            <Field label="Số lượng phát hành *" error={errors.totalQuantity}>
              <input type="number" className={inputCls(errors.totalQuantity)} value={form.totalQuantity} onChange={(event) => updateField("totalQuantity", event.target.value)} disabled={isSaving} />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-black/5">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Thời gian</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Bắt đầu bán *" error={errors.saleStartDate}>
              <input type="date" className={inputCls(errors.saleStartDate)} value={form.saleStartDate} onChange={(event) => updateField("saleStartDate", event.target.value)} disabled={isSaving} />
            </Field>
            <Field label="Kết thúc bán *" error={errors.saleEndDate}>
              <input type="date" className={inputCls(errors.saleEndDate)} value={form.saleEndDate} onChange={(event) => updateField("saleEndDate", event.target.value)} disabled={isSaving} />
            </Field>
            <Field label="Số ngày sử dụng *" error={errors.validityDays}>
              <input type="number" className={inputCls(errors.validityDays)} value={form.validityDays} onChange={(event) => updateField("validityDays", event.target.value)} disabled={isSaving} />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-black/5">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Điều kiện sử dụng</h3>
          <div className="space-y-4">
            <Field label="Điều kiện áp dụng *" error={errors.terms}>
              <textarea rows={4} className={`${inputCls(errors.terms)} resize-none`} value={form.terms} onChange={(event) => updateField("terms", event.target.value)} disabled={isSaving} />
            </Field>
            <Field label="Hướng dẫn sử dụng">
              <textarea rows={3} className={`${inputCls()} resize-none`} value={form.usageInstructions} onChange={(event) => updateField("usageInstructions", event.target.value)} disabled={isSaving} />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-black/5">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Chi nhánh áp dụng *</h3>
          {branches.length === 0 ? (
            <div className="text-sm" style={{ color: "#8A8DA8" }}>Không có chi nhánh đang hoạt động</div>
          ) : (
            <div className="space-y-2">
              {branches.map((branch) => (
                <label key={branch.id} className="flex items-start gap-3 rounded-xl border px-3 py-3 cursor-pointer" style={{ borderColor: "#F0EDD8" }}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.branchIds.includes(branch.id)}
                    onChange={() => toggleBranch(branch.id)}
                    disabled={isSaving}
                  />
                  <span>
                    <span className="block text-sm font-bold" style={{ color: C.indigo }}>{branch.branchName}</span>
                    <span className="block text-xs" style={{ color: "#8A8DA8" }}>{branch.address}, {branch.district ? `${branch.district}, ` : ""}{branch.city}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          {errors.branchIds && <p className="text-xs mt-2" style={{ color: "#EF4444" }}>{errors.branchIds}</p>}
          {selectedBranches.length > 0 && (
            <p className="text-xs mt-3" style={{ color: "#8A8DA8" }}>{selectedBranches.length} chi nhánh được chọn</p>
          )}
        </section>

        <div className="flex gap-3">
          <button onClick={onBack} disabled={isSaving} className="px-5 py-3 rounded-2xl font-bold text-sm border-2 disabled:opacity-60" style={{ borderColor: "#E5E7EB", color: C.indigo }}>
            Hủy
          </button>
          <button onClick={handleSave} disabled={isSaving || categories.length === 0 || branches.length === 0} className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-60" style={{ backgroundColor: C.peach }}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1.5" style={{ color: C.indigo }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{error}</p>}
    </div>
  )
}
