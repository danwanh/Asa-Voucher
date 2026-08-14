import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, MapPin, Star, PenLine } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { StatusBadge } from "@/components/StatusBadge"
import type { Voucher } from "@/types"
import { type VoucherApplicableBranch, type VoucherDetailData, type VoucherPublicReview } from "@/services/voucherService"
import { LoadingState } from "@/components/LoadingState"
import { isVoucherAvailable } from "@/hooks/useCart"

const FALLBACK = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=400&fit=crop"

interface Props {
  voucher: Voucher
  detail: VoucherDetailData
  onBuy: () => void
  onBuyNow?: () => void
  onBack: () => void
  // Present when customer has a completed order for this voucher
  onWriteReview?: () => void
  hasReviewed?: boolean
  onEditReview?: () => void
}

export function VoucherDetailPage({ voucher: v, detail, onBuy, onBuyNow, onBack, onWriteReview, hasReviewed, onEditReview }: Props) {
  const [detailVoucher, setDetailVoucher] = useState<Voucher>(v)
  const [reviews, setReviews] = useState<VoucherPublicReview[]>([])
  const [branches, setBranches] = useState<VoucherApplicableBranch[]>([])
  const [detailMeta, setDetailMeta] = useState<Pick<VoucherDetailData, "conditions" | "usageInstructions" | "applicableArea" | "partnerId" | "categoryName">>({
    conditions: [],
    usageInstructions: [],
    applicableArea: null,
    partnerId: "",
    categoryName: ""
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDetailVoucher(detail.voucher)
    setReviews(detail.reviews)
    setBranches(detail.branches)
    setDetailMeta({ conditions: detail.conditions, usageInstructions: detail.usageInstructions, applicableArea: detail.applicableArea, partnerId: detail.partnerId, categoryName: detail.categoryName })
    setIsLoading(false)
  }, [detail])

  const pct = useMemo(() => {
    if (detailVoucher.quantity <= 0) return 0
    return Math.round((detailVoucher.sold / detailVoucher.quantity) * 100)
  }, [detailVoucher.quantity, detailVoucher.sold])

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 mb-6 font-semibold text-sm hover:underline" style={{ color: C.indigo }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <LoadingState label="Đang tải dữ liệu voucher..." variant="section" size="sm" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 mb-6 font-semibold text-sm hover:underline" style={{ color: C.indigo }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <div className="bg-white rounded-2xl p-6 border border-black/5 text-center">
          <p className="font-bold" style={{ color: C.indigo }}>{error}</p>
          <p className="text-sm mt-2" style={{ color: "#8A8DA8" }}>Bạn vẫn có thể quay lại danh sách voucher để chọn mã khác.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 font-semibold text-sm hover:underline" style={{ color: C.indigo }}>
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left */}
        <div>
          <div className="rounded-3xl overflow-hidden shadow-md mb-4 h-64">
            <img
              src={detailVoucher.image}
              alt={detailVoucher.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }}
            />
          </div>

          <div className="bg-card rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: C.eggshell }}>
              {detailVoucher.partnerLogo}
            </div>
            <div>
              <div className="font-bold" style={{ color: C.indigo }}>{detailMeta.partnerId || detailVoucher.partnerName}</div>
              <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "#8A8DA8" }}>
                <MapPin className="w-3 h-3" /> {detailMeta.applicableArea || (branches.length > 0 ? `${branches.length} chi nhánh áp dụng` : "Đang cập nhật")}
              </div>
            </div>
            {detailVoucher.rating > 0 && (
              <div className="ml-auto text-right">
                <div className="flex justify-end" style={{ color: "#F4C430" }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(detailVoucher.rating) ? "fill-current" : ""}`} />
                  ))}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>{detailVoucher.reviews} đánh giá</div>
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div>
          <StatusBadge status={detailVoucher.status} />
          <h1 className="text-2xl font-black mt-3 mb-1 leading-tight" style={{ color: C.indigo }}>{detailVoucher.title}</h1>

          <div className="flex items-baseline gap-2 mt-4 mb-5">
            <span className="text-3xl font-black" style={{ color: C.peach }}>{fmt(detailVoucher.price)}</span>
            <span className="text-base line-through" style={{ color: "#B0B3C8" }}>{fmt(detailVoucher.originalPrice)}</span>
            <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ backgroundColor: C.peach + "15", color: C.peach }}>
              -{detailVoucher.discount}%
            </span>
          </div>

          {/* Progress */}
          <div className="mb-5">
            <div className="flex justify-between text-xs font-semibold mb-1.5" style={{ color: "#8A8DA8" }}>
              <span>Đã bán: {detailVoucher.sold}/{detailVoucher.quantity}</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: pct > 80 ? C.peach : C.teal }}
              />
            </div>
            {pct > 80 && (
              <div className="text-xs font-semibold mt-1" style={{ color: C.peach }}>
                <AppIcon name="flame" className="w-4 h-4 inline-block mr-1" /> Sắp hết! Chỉ còn {detailVoucher.quantity - detailVoucher.sold} voucher
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: "Đơn tối thiểu", value: detailVoucher.minOrder > 0 ? fmt(detailVoucher.minOrder) : "Không giới hạn" },
              { label: "Hạn sử dụng", value: fmtDate(detailVoucher.validTo) },
              { label: "Loại giảm", value: "Phần trăm" },
              { label: "Danh mục", value: detailMeta.categoryName || detailVoucher.category },
            ].map((r) => (
              <div key={r.label} className="bg-muted rounded-2xl p-3">
                <div className="text-xs" style={{ color: "#8A8DA8" }}>{r.label}</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: C.indigo }}>{r.value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-bold mb-2" style={{ color: C.indigo }}>Mô tả</h3>
            <p className="text-sm leading-relaxed" style={{ color: "#6B6E8A", fontFamily: "'Inter', sans-serif" }}>
              {detailVoucher.description}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="font-bold mb-2" style={{ color: C.indigo }}>Điều kiện sử dụng</h3>
            {detailMeta.conditions.length === 0 && detailMeta.usageInstructions.length === 0 ? (
              <p className="text-sm" style={{ color: "#8A8DA8" }}>Chưa cập nhật điều kiện sử dụng</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: "#6B6E8A" }}>
                {detailMeta.conditions.map((item) => (
                  <li key={`condition-${item}`}>{item}</li>
                ))}
                {detailMeta.usageInstructions.map((item) => (
                  <li key={`usage-${item}`}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          {isVoucherAvailable(detailVoucher) ? (
            <div className="flex flex-col gap-3">
              {onBuyNow && (
                <button
                  onClick={onBuyNow}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: C.peach }}
                >
                  Mua ngay — {fmt(detailVoucher.price)}
                </button>
              )}
              <button
                onClick={onBuy}
                className="w-full py-3.5 rounded-2xl font-bold text-base transition-all hover:opacity-90 active:scale-95 border-2"
                style={{ borderColor: C.peach, color: C.peach, backgroundColor: "white" }}
              >
                Thêm vào giỏ hàng
              </button>
            </div>
          ) : (
            <div className="w-full py-4 rounded-2xl font-bold text-center" style={{ backgroundColor: C.muted, color: "#8A8DA8" }}>
              Voucher không khả dụng
            </div>
          )}
        </div>
      </div>

      {/* Public review section — always visible, same content as guest view */}
      <div className="mt-8 bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
            Đánh giá ({detailVoucher.reviews})
          </h3>
          {/* Write/edit review — only shown to eligible logged-in customers */}
          {hasReviewed && onEditReview ? (
            <button
              onClick={onEditReview}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition-all"
              style={{ borderColor: C.teal, color: C.teal }}
            >
              <PenLine className="w-3.5 h-3.5" /> Sửa đánh giá
            </button>
          ) : onWriteReview ? (
            <button
              onClick={onWriteReview}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl text-white transition-all hover:opacity-90"
              style={{ backgroundColor: C.teal }}
            >
              <PenLine className="w-3.5 h-3.5" /> Viết đánh giá
            </button>
          ) : null}
        </div>

        {reviews.length === 0 ? (
          <div className="text-sm" style={{ color: "#8A8DA8" }}>Chưa có đánh giá</div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl border border-black/5" style={{ backgroundColor: C.eggshell }}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                  style={{ backgroundColor: C.peach + "20", color: C.peach }}
                >
                  {r.name[0]}
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: C.indigo }}>{r.name}</div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.rating }, (_, j) => (
                      <Star key={j} className="w-2.5 h-2.5 fill-current" style={{ color: C.apricot }} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#4B5563", fontFamily: "'Inter', sans-serif" }}>{r.text}</p>
                <div className="text-xs mt-2" style={{ color: "#9CA3AF" }}>{fmtDate(r.date)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
        <h3 className="font-black text-lg mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Chi nhánh áp dụng</h3>
        {branches.length === 0 ? (
          <p className="text-sm" style={{ color: "#8A8DA8" }}>Chưa cập nhật chi nhánh áp dụng</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {branches.map((branch) => (
              <div key={branch.id} className="rounded-2xl p-3" style={{ backgroundColor: C.eggshell }}>
                <div className="text-sm font-bold" style={{ color: C.indigo }}>{branch.name}</div>
                <div className="text-xs mt-1" style={{ color: "#6B7280" }}>{branch.address}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
