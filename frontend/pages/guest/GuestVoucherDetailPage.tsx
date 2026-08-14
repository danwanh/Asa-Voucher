import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Star, MapPin, Calendar, Users, Heart } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Voucher } from "@/types"
import { voucherService, type VoucherApplicableBranch, type VoucherDetailData, type VoucherPublicReview } from "@/services/voucherService"
import { LoadingState } from "@/components/LoadingState"

interface Props {
  voucher: Voucher
  detail: VoucherDetailData
  onBack: () => void
  onLogin: () => void
  onDetail: (v: Voucher) => void
  onAddToCart: (v: Voucher) => void
  onBuyNow: (v: Voucher) => void
}

export function GuestVoucherDetailPage({ voucher: v, detail, onBack, onLogin, onDetail, onAddToCart, onBuyNow }: Props) {
  const [liked, setLiked] = useState(false)
  const [detailVoucher, setDetailVoucher] = useState<Voucher>(v)
  const [reviews, setReviews] = useState<VoucherPublicReview[]>([])
  const [branches, setBranches] = useState<VoucherApplicableBranch[]>([])
  const [related, setRelated] = useState<Voucher[]>([])
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

  useEffect(() => {
    let cancelled = false
    setRelated([])
    void voucherService.listRelatedVouchers({ partnerId: detail.partnerId, excludeId: detail.voucher.id, limit: 4 })
      .then((items) => { if (!cancelled) setRelated(items) })
      .catch(() => { if (!cancelled) setRelated([]) })
    return () => { cancelled = true }
  }, [detail])

  const pct = useMemo(() => {
    if (detailVoucher.originalPrice <= 0) return 0
    return Math.round(((detailVoucher.originalPrice - detailVoucher.price) / detailVoucher.originalPrice) * 100)
  }, [detailVoucher.originalPrice, detailVoucher.price])

  const remaining = detailVoucher.quantity - detailVoucher.sold

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <LoadingState label="Đang tải dữ liệu voucher..." variant="section" size="sm" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <div className="bg-white rounded-2xl p-6 border border-black/5 text-center">
          <p className="font-bold" style={{ color: C.indigo }}>{error}</p>
          <p className="text-sm mt-2" style={{ color: "#8A8DA8" }}>Bạn có thể quay lại danh sách để chọn voucher khác.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Left: Image gallery */}
        <div>
          <div className="rounded-3xl overflow-hidden shadow-md h-72 mb-3">
            <img src={detailVoucher.image} alt={detailVoucher.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            {[detailVoucher.image, detailVoucher.image, detailVoucher.image].map((img, i) => (
              <div key={i} className="w-20 h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-all" style={{ borderColor: i === 0 ? C.peach : "transparent" }}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AppIcon name={detailVoucher.partnerLogo} className="w-6 h-6" />
            <span className="text-sm font-semibold" style={{ color: C.teal }}>{detailMeta.partnerId || detailVoucher.partnerName}</span>
          </div>
          <h1 className="text-2xl font-black mb-3 leading-tight" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{detailVoucher.title}</h1>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1 text-sm">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" style={{ color: i < Math.round(detailVoucher.rating) ? C.apricot : "#E5E7EB" }} />
              ))}
              <span className="font-bold ml-1" style={{ color: C.indigo }}>{detailVoucher.rating}</span>
            </div>
            <span className="text-sm" style={{ color: "#6B7280" }}>({detailVoucher.reviews} đánh giá)</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-black" style={{ color: C.peach }}>{fmt(detailVoucher.price)}</span>
            <span className="text-base line-through" style={{ color: "#9CA3AF" }}>{fmt(detailVoucher.originalPrice)}</span>
            <span className="px-2 py-0.5 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: C.peach }}>-{pct}%</span>
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}>
              <Calendar className="w-3.5 h-3.5" /> Từ {fmtDate(detailVoucher.validFrom)} đến {fmtDate(detailVoucher.validTo)}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}>
              <Users className="w-3.5 h-3.5" /> Còn {remaining} voucher
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ backgroundColor: "#FFF7ED", color: "#9A3412" }}>
              Danh mục: {detailMeta.categoryName || detailVoucher.category}
            </div>
          </div>

          {/* Stock bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs mb-1" style={{ color: "#6B7280" }}>
              <span>Đã bán: {detailVoucher.sold}/{detailVoucher.quantity}</span>
              <span>{Math.round((detailVoucher.sold / detailVoucher.quantity) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((detailVoucher.sold / detailVoucher.quantity) * 100)}%`, backgroundColor: C.peach }} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 mb-2">
            <button
              onClick={() => onBuyNow(detailVoucher)}
              className="w-full py-3.5 rounded-2xl font-black text-white text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: C.peach }}
            >
              Mua ngay — {fmt(detailVoucher.price)}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => onAddToCart(detailVoucher)}
                className="flex-1 py-3 rounded-2xl font-bold text-sm border-2 hover:opacity-90 transition-opacity"
                style={{ borderColor: C.peach, color: C.peach, backgroundColor: "white" }}
              >
                Thêm vào giỏ hàng
              </button>
              <button
                onClick={() => setLiked(!liked)}
                className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all"
                style={{ borderColor: liked ? "#EF4444" : "#E5E7EB", backgroundColor: liked ? "#FEF2F2" : "white" }}
              >
                <Heart className="w-5 h-5" fill={liked ? "#EF4444" : "none"} style={{ color: liked ? "#EF4444" : "#9CA3AF" }} />
              </button>
            </div>
          </div>
          <p className="text-xs text-center" style={{ color: "#6B7280" }}>Đăng nhập để xem đơn hàng &amp; quản lý voucher</p>
        </div>
      </div>

      {/* Description */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl p-6 mb-4 border border-black/5">
            <h3 className="font-black text-lg mb-3" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Mô tả</h3>
            <p className="text-sm leading-relaxed" style={{ color: "#4B5563" }}>{detailVoucher.description}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-black/5">
            <h3 className="font-black text-lg mb-3" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Điều kiện sử dụng</h3>
            {detailMeta.conditions.length === 0 && detailMeta.usageInstructions.length === 0 ? (
              <p className="text-sm" style={{ color: "#8A8DA8" }}>Chưa cập nhật điều kiện sử dụng</p>
            ) : (
              <ul className="list-disc pl-5 space-y-2">
                {detailMeta.conditions.map((item) => (
                  <li key={`condition-${item}`} className="text-sm" style={{ color: "#4B5563" }}>{item}</li>
                ))}
                {detailMeta.usageInstructions.map((item) => (
                  <li key={`usage-${item}`} className="text-sm" style={{ color: "#4B5563" }}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-white rounded-2xl p-5 border border-black/5 mb-4">
            <h3 className="font-black text-sm mb-3" style={{ color: C.indigo }}>Chi nhánh áp dụng</h3>
            <div className="space-y-3">
              {branches.length === 0 && <div className="text-xs" style={{ color: "#8A8DA8" }}>Chưa cập nhật chi nhánh áp dụng</div>}
              {branches.map((b) => (
                <div key={b.id} className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: C.peach }} />
                  <div>
                    <div className="text-xs font-bold" style={{ color: C.indigo }}>{b.name}</div>
                    <div className="text-xs" style={{ color: "#6B7280" }}>{b.address}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-black/5">
            <h3 className="font-black text-sm mb-3" style={{ color: C.indigo }}>Thông tin voucher</h3>
            <div className="text-xs" style={{ color: "#6B7280" }}>Đối tác: {detailMeta.partnerId || detailVoucher.partnerId}</div>
            <div className="text-xs mt-2" style={{ color: "#6B7280" }}>Khu vực áp dụng: {detailMeta.applicableArea || "Chưa cập nhật"}</div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="bg-white rounded-2xl p-6 mb-8 border border-black/5">
        <h3 className="font-black text-lg mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
          Đánh giá ({detailVoucher.reviews})
        </h3>

        {reviews.length === 0 ? (
          <div className="text-sm" style={{ color: "#8A8DA8" }}>Chưa có đánh giá</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border border-black/5" style={{ backgroundColor: C.eggshell }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold" style={{ color: C.indigo }}>
                  {r.name[0]}
                </div>
                <div>
                  <div className="text-xs font-bold" style={{ color: C.indigo }}>{r.name}</div>
                  <div className="flex gap-0.5">
                    {[...Array(r.rating)].map((_, j) => <Star key={j} className="w-2.5 h-2.5 fill-current" style={{ color: C.apricot }} />)}
                  </div>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#4B5563" }}>{r.text}</p>
                <div className="text-xs mt-2" style={{ color: "#9CA3AF" }}>{fmtDate(r.date)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div>
          <h3 className="font-black text-lg mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Voucher liên quan</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map((rv) => {
              const rpct = Math.round(((rv.originalPrice - rv.price) / rv.originalPrice) * 100)
              return (
                <div key={rv.id} onClick={() => onDetail(rv)} className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow border border-black/5">
                  <div className="relative h-36 overflow-hidden">
                    <img src={rv.image} alt={rv.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-white text-xs font-bold" style={{ backgroundColor: C.peach }}>-{rpct}%</div>
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-sm line-clamp-1 mb-1" style={{ color: C.indigo }}>{rv.title}</div>
                    <div className="font-black text-sm" style={{ color: C.peach }}>{fmt(rv.price)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
