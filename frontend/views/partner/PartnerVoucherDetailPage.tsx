import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Calendar, Edit2, Loader2, MapPin, Send, Users } from "lucide-react"
import { toast } from "sonner"
import { C, fmt, fmtDate, formatCategoryLabel, STATUS_LABEL, statusColor } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Voucher } from "@/types"
import { voucherService } from "@/services/voucherService"
import { parseApplicableAreas, serializeApplicableAreas } from "@/utils/applicableArea"
import { VoucherImageGallery } from "@/components/VoucherImageGallery"

interface Props {
  voucher: Voucher
  onBack: () => void
  onEdit: (v: Voucher) => void
  readOnly?: boolean
}

export function PartnerVoucherDetailPage({ voucher: initialVoucher, onBack, onEdit, readOnly = false }: Props) {
  const [voucher, setVoucher] = useState(initialVoucher)
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof voucherService.getDetail>> | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(true)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadDetail() {
      setIsLoadingDetail(true)
      try {
        const result = await voucherService.getDetail(initialVoucher.id).catch(async () => {
          const [manageDetail, branches] = await Promise.all([
            voucherService.getManageDetail(initialVoucher.id),
            voucherService.listVoucherBranches(initialVoucher.id),
          ])
          return {
            voucher: manageDetail.voucher,
            reviews: [],
            branches,
            conditions: manageDetail.conditions,
            usageInstructions: manageDetail.usageInstructions,
            applicableArea: manageDetail.voucher.applicableArea ?? null,
            partnerId: manageDetail.voucher.partnerId,
            partnerName: manageDetail.voucher.partnerName,
            categoryName: "",
            images: manageDetail.images,
          }
        })
        if (!isMounted) return
        setDetail(result)
        setVoucher(result.voucher)
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
  }, [initialVoucher.id])

  const sc = statusColor(voucher.status)
  const pct = voucher.originalPrice > 0
    ? Math.max(0, Math.round((((voucher.originalPrice - voucher.price) / voucher.originalPrice) * 100) * 100) / 100)
    : 0
  const canSubmit = !readOnly && voucher.status === "draft"

  const branches = detail?.branches ?? []
  const conditions = detail?.conditions ?? []
  const usageInstructions = detail?.usageInstructions ?? []
  const galleryImages = detail?.images.length
    ? detail.images.map((image) => image.imageUrl)
    : voucher.image?.trim()
    ? [voucher.image]
    : []
  const displayApplicableArea =
    serializeApplicableAreas(parseApplicableAreas(detail?.applicableArea ?? voucher.applicableArea)) || "Toàn quốc"

  const displayCategory = detail?.categoryName || formatCategoryLabel(voucher.category)
  const canEdit = !readOnly && !["rejected", "expired", "locked", "sold_out"].includes(voucher.status)

  const detailRows = useMemo(
    () => [
      { label: "Đối tác", value: voucher.partnerName },
      { label: "Danh mục", value: displayCategory },
      { label: "Giá gốc", value: fmt(voucher.originalPrice) },
      { label: "Giá bán", value: fmt(voucher.price) },
      { label: "Mức giảm", value: `${pct.toFixed(2)}%` },
      { label: "Số lượng", value: `${Math.max(voucher.quantity - voucher.sold, 0)}/${voucher.quantity}` },
      { label: "Bắt đầu bán", value: fmtDate(voucher.validFrom) },
      { label: "Kết thúc bán", value: fmtDate(voucher.validTo) },
      { label: "Khu vực áp dụng", value: displayApplicableArea },
      { label: "Trạng thái", value: STATUS_LABEL[voucher.status] ?? voucher.status },
    ],
    [displayApplicableArea, displayCategory, pct, voucher.originalPrice, voucher.partnerName, voucher.price, voucher.quantity, voucher.sold, voucher.status, voucher.validFrom, voucher.validTo],
  )

  const submitVoucher = async () => {
    if (voucher.status !== "draft") {
      toast.error("Chỉ voucher Nháp mới được gửi duyệt")
      return
    }
    setIsSubmitting(true)
    try {
      const submitted = await voucherService.submitVoucher(voucher.id)
      setVoucher(submitted)
      setShowSubmitDialog(false)
      toast.success("Gửi duyệt voucher thành công")
    } catch (submitError) {
      const err = submitError as { response?: { data?: { error?: { message?: string } } } }
      toast.error(err?.response?.data?.error?.message ?? "Không thể gửi duyệt voucher")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>
              {STATUS_LABEL[voucher.status]}
            </span>
            {canEdit && (
              <button
                onClick={() => onEdit(voucher)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2"
                style={{ borderColor: C.indigo, color: C.indigo }}
              >
                <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
              </button>
            )}
            {canSubmit && (
              <button
                onClick={() => setShowSubmitDialog(true)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: C.peach }}
              >
                <Send className="w-3.5 h-3.5" /> Gửi duyệt
              </button>
            )}
          </div>
        </div>

        {voucher.status === "rejected" && (
          <div className="mt-4 p-3 rounded-xl border mb-4" style={{borderColor: "#FCA5A5", background: "#FEF2F2"}}>
            <div className="text-sm font-bold" style={{color:"#C0392B"}}>Lý do từ chối</div>
            <p className="text-sm mt-1" style={{color: "#7F1D1D"}}>{(voucher as any).rejection_reason ?? "Không có lý do"}</p>
          </div>
        )}

        {isLoadingDetail && (
          <div className="ml-4 mb-4 inline-flex items-center gap-2 text-sm" style={{ color: "#8A8DA8" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải chi tiết voucher...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl overflow-hidden border border-black/5">
              <VoucherImageGallery
                images={galleryImages}
                alt={`Ảnh voucher ${voucher.title}`}
                className="bg-white"
                mainHeightClass="h-56"
                emptyState={(
                  <div className="h-44 px-5 flex items-center justify-center" style={{ backgroundColor: C.eggshell }}>
                  <div className="text-center">
                    <AppIcon name="image" className="w-8 h-8 mx-auto" />
                    <p className="text-sm mt-2" style={{ color: "#6B7280" }}>Voucher chưa có ảnh đại diện</p>
                  </div>
                  </div>
                )}
              />
              <div className="p-5">
                <div className="text-xs font-semibold mb-1" style={{ color: C.teal }}>
                  <span className="inline-flex items-center gap-1"><AppIcon name={voucher.partnerLogo} className="w-4 h-4" /> {voucher.partnerName}</span>
                </div>
                <h2 className="text-xl font-black mb-3" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{voucher.title}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-black text-2xl" style={{ color: C.peach }}>{fmt(voucher.price)}</span>
                  <span className="line-through text-sm" style={{ color: "#9CA3AF" }}>{fmt(voucher.originalPrice)}</span>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: C.peach }}>-{pct.toFixed(2)}%</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}>
                    <Calendar className="w-3 h-3" />Bán từ {fmtDate(voucher.validFrom)} đến {fmtDate(voucher.validTo)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
                    <Users className="w-3 h-3" />Còn {Math.max(voucher.quantity - voucher.sold, 0)}/{voucher.quantity}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#FFF8E6", color: "#8A6A00" }}>
                    <MapPin className="w-3 h-3" /> {displayApplicableArea}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-bold text-sm mb-2" style={{ color: C.indigo }}>Mô tả</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#4B5563" }}>{voucher.description || "Chưa có mô tả"}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-bold text-sm mb-3" style={{ color: C.indigo }}>Điều kiện sử dụng</h3>
              {conditions.length === 0 ? (
                <p className="text-sm" style={{ color: "#6B7280" }}>Chưa có điều kiện sử dụng.</p>
              ) : (
                <ul className="space-y-2">
                  {conditions.map((condition) => (
                    <li key={condition} className="text-sm" style={{ color: "#4B5563" }}>• {condition}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-bold text-sm mb-3" style={{ color: C.indigo }}>Hướng dẫn sử dụng</h3>
              {usageInstructions.length === 0 ? (
                <p className="text-sm" style={{ color: "#6B7280" }}>Chưa có hướng dẫn sử dụng.</p>
              ) : (
                <ul className="space-y-2">
                  {usageInstructions.map((instruction) => (
                    <li key={instruction} className="text-sm" style={{ color: "#4B5563" }}>• {instruction}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-bold text-sm mb-3" style={{ color: C.indigo }}>Chi tiết voucher</h3>
              <div className="space-y-2 text-sm">
                {detailRows.map((item) => (
                  <div key={item.label} className="grid grid-cols-[120px_1fr] gap-3">
                    <span style={{ color: "#6B7280" }}>{item.label}</span>
                    <span className="font-semibold break-words" style={{ color: C.indigo }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-black/5">
              <h3 className="font-bold text-sm mb-3" style={{ color: C.indigo }}>Chi nhánh áp dụng</h3>
              {branches.length === 0 ? (
                <p className="text-sm" style={{ color: "#6B7280" }}>Chưa có chi nhánh áp dụng.</p>
              ) : (
                <ul className="space-y-2">
                  {branches.map((branch) => (
                    <li key={branch.id} className="text-sm" style={{ color: "#4B5563" }}>
                      <span className="font-semibold" style={{ color: C.indigo }}>{branch.name}</span>
                      <div>{branch.address}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSubmitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-black text-lg mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
              Xác nhận gửi duyệt
            </h3>
            <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
              Voucher sẽ được chuyển sang trạng thái Chờ duyệt và chưa được công bố bán.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitDialog(false)} disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Hủy</button>
              <button onClick={submitVoucher} disabled={isSubmitting} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60" style={{ backgroundColor: C.peach }}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

