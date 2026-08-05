import { useState } from "react"
import { ArrowLeft, Star } from "lucide-react"
import { C, fmt } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Order } from "@/types"

interface Props {
  order: Order
  existingReview?: { rating: number; content: string }
  onBack: () => void
  onSubmit: () => void
}

export function ReviewPage({ order, existingReview, onBack, onSubmit }: Props) {
  const isEdit = !!existingReview
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [content, setContent] = useState(existingReview?.content ?? "")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const LABELS = ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Tuyệt vời"]
  const SUGGESTIONS = ["Voucher chất lượng", "Dịch vụ tốt", "Nhân viên thân thiện", "Giá tốt", "Sẽ sử dụng lại"]

  const handleSubmit = () => {
    if (rating === 0) { setError("Vui lòng chọn số sao đánh giá"); return }
    if (content.trim().length < 10) { setError("Nội dung đánh giá tối thiểu 10 ký tự"); return }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl" style={{ backgroundColor: "#E8F5EE" }}>
          ⭐
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
          {isEdit ? "Đánh giá đã được cập nhật!" : "Cảm ơn bạn!"}
        </h2>
        <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
          {isEdit ? "Đánh giá của bạn đã được cập nhật thành công." : "Đánh giá của bạn đã được ghi nhận và sẽ giúp ích cho những người dùng khác."}
        </p>
        <div className="flex gap-3 justify-center">
          {[...Array(rating)].map((_, i) => <Star key={i} className="w-6 h-6 fill-current" style={{ color: C.apricot }} />)}
        </div>
        <button onClick={onSubmit} className="mt-8 px-6 py-3 rounded-2xl font-bold text-white text-sm" style={{ backgroundColor: C.peach }}>
          Quay lại đơn hàng
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
        {isEdit ? "Chỉnh sửa đánh giá" : "Đánh giá dịch vụ"}
      </h1>
      {isEdit && (
        <div className="mb-5 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ backgroundColor: C.teal + "15", color: C.teal }}>
          <AppIcon name="edit" className="w-4 h-4 inline-block mr-1" /> Bạn đang chỉnh sửa đánh giá đã gửi trước đó.
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 border border-black/5 mb-5 flex items-center gap-4">
        <div className="w-16 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: C.eggshell }}>
          <AppIcon name="gift" className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm" style={{ color: C.indigo }}>{order.voucherTitle}</div>
          <div className="text-xs" style={{ color: "#6B7280" }}>{order.partnerName} • {fmt(order.amount)}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-black/5">
        {/* Star rating */}
        <div className="text-center mb-6">
          <div className="text-sm font-bold mb-3" style={{ color: C.indigo }}>Trải nghiệm của bạn thế nào?</div>
          <div className="flex justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => { setRating(s); setError("") }}
              >
                <Star
                  className="w-10 h-10 transition-all"
                  fill={(hover || rating) >= s ? C.apricot : "none"}
                  style={{ color: (hover || rating) >= s ? C.apricot : "#D1D5DB", transform: (hover || rating) >= s ? "scale(1.1)" : "scale(1)" }}
                />
              </button>
            ))}
          </div>
          {(hover || rating) > 0 && (
            <div className="text-sm font-bold" style={{ color: C.apricot }}>{LABELS[hover || rating]}</div>
          )}
        </div>

        {/* Quick tags */}
        <div className="mb-4">
          <div className="text-sm font-bold mb-2" style={{ color: C.indigo }}>Gợi ý nhanh</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setContent((c) => c ? `${c}, ${s}` : s)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:border-opacity-60"
                style={{ borderColor: "#E5E7EB", color: C.indigo }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1.5" style={{ color: C.indigo }}>
            Nội dung đánh giá <span style={{ color: "#9CA3AF" }}>(tối thiểu 10 ký tự)</span>
          </label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => { setContent(e.target.value); setError("") }}
            placeholder="Chia sẻ trải nghiệm của bạn về voucher này..."
            className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none resize-none"
            style={{ borderColor: error ? "#EF4444" : "#E5E7EB" }}
          />
          <div className="flex justify-between text-xs mt-1">
            {error ? <span style={{ color: "#EF4444" }}>{error}</span> : <span />}
            <span style={{ color: "#9CA3AF" }}>{content.length}/500</span>
          </div>
        </div>

        {/* Photo upload placeholder */}
        <div className="mb-5">
          <div className="text-sm font-bold mb-2" style={{ color: C.indigo }}>Thêm ảnh (tùy chọn)</div>
          <div
            className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-opacity-60 transition-colors"
            style={{ borderColor: "#D1D5DB" }}
          >
            <AppIcon name="camera" className="w-6 h-6 mb-1 mx-auto" />
            <div className="text-xs" style={{ color: "#9CA3AF" }}>Nhấn để thêm ảnh (tối đa 3 ảnh)</div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-2xl font-black text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: C.peach }}
        >
          {isEdit ? "Lưu đánh giá đã sửa" : "Gửi đánh giá"}
        </button>
      </div>
    </div>
  )
}
