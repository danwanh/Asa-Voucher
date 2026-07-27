import { useState } from "react"
import { ArrowLeft, Edit2, Calendar, Users, AlertTriangle } from "lucide-react"
import { C, fmt, fmtDate, STATUS_LABEL, statusColor } from "@/utils/constants"
import type { Voucher, VoucherStatus } from "@/types"

interface Props {
  voucher: Voucher
  onBack: () => void
  onEdit: (v: Voucher) => void
}

const STATUS_TRANSITIONS: Record<string, { next: VoucherStatus; label: string; color: string }[]> = {
  draft: [{ next: "pending", label: "Gửi duyệt", color: "#3D405B" }],
  approved: [{ next: "selling", label: "Bắt đầu bán", color: "#2D7A52" }],
  selling: [{ next: "active", label: "Chuyển hoạt động", color: "#1A5FAD" }, { next: "locked", label: "Tạm dừng", color: "#C0392B" }],
  active: [{ next: "locked", label: "Tạm dừng", color: "#C0392B" }],
  locked: [{ next: "active", label: "Mở lại", color: "#2D7A52" }],
  rejected: [{ next: "pending", label: "Gửi lại", color: "#3D405B" }],
}

const MOCK_STATS = { views: 1247, clicks: 389, conversions: 143, revenue: 7007000 }

export function PartnerVoucherDetailPage({ voucher: initialVoucher, onBack, onEdit }: Props) {
  const [voucher, setVoucher] = useState(initialVoucher)
  const [showStatusDialog, setShowStatusDialog] = useState<{ next: VoucherStatus; label: string } | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

  const sc = statusColor(voucher.status)
  const pct = Math.round(((voucher.originalPrice - voucher.price) / voucher.originalPrice) * 100)
  const transitions = STATUS_TRANSITIONS[voucher.status] || []

  const applyStatus = (next: VoucherStatus) => {
    setVoucher({ ...voucher, status: next })
    setShowStatusDialog(null)
    setShowSubmitDialog(false)
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>
            {STATUS_LABEL[voucher.status]}
          </span>
          <button
            onClick={() => onEdit(voucher)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2"
            style={{ borderColor: C.indigo, color: C.indigo }}
          >
            <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa
          </button>
          {transitions.map((t) => (
            <button
              key={t.next}
              onClick={() => setShowStatusDialog({ next: t.next, label: t.label })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Main */}
        <div className="md:col-span-2 space-y-4">
          {/* Image + Title */}
          <div className="bg-white rounded-2xl overflow-hidden border border-black/5">
            <div className="h-52 overflow-hidden">
              <img src={voucher.image} alt={voucher.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-5">
              <div className="text-xs font-semibold mb-1" style={{ color: C.teal }}>
                {voucher.partnerLogo} {voucher.partnerName}
              </div>
              <h2 className="text-xl font-black mb-3" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{voucher.title}</h2>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-black text-2xl" style={{ color: C.peach }}>{fmt(voucher.price)}</span>
                <span className="line-through text-sm" style={{ color: "#9CA3AF" }}>{fmt(voucher.originalPrice)}</span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: C.peach }}>-{pct}%</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}><Calendar className="w-3 h-3" />Hết hạn {fmtDate(voucher.validTo)}</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}><Users className="w-3 h-3" />Còn {voucher.quantity - voucher.sold}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-5 border border-black/5">
            <h3 className="font-bold text-sm mb-2" style={{ color: C.indigo }}>Mô tả</h3>
            <p className="text-sm leading-relaxed" style={{ color: "#4B5563" }}>{voucher.description}</p>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl p-5 border border-black/5">
            <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Hiệu suất</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Lượt xem", value: MOCK_STATS.views.toLocaleString(), icon: "👁️" },
                { label: "Nhấn vào", value: MOCK_STATS.clicks.toLocaleString(), icon: "🖱️" },
                { label: "Đã bán", value: voucher.sold.toLocaleString(), icon: "🛒" },
                { label: "Doanh thu", value: fmt(MOCK_STATS.revenue), icon: "💰" },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 rounded-xl" style={{ backgroundColor: C.eggshell }}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="font-black text-sm" style={{ color: C.indigo }}>{s.value}</div>
                  <div className="text-xs" style={{ color: "#6B7280" }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1" style={{ color: "#6B7280" }}>
                <span>Đã bán: {voucher.sold}/{voucher.quantity}</span>
                <span>{Math.round((voucher.sold / voucher.quantity) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.round((voucher.sold / voucher.quantity) * 100)}%`, backgroundColor: C.teal }} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/5">
            <h3 className="font-bold text-sm mb-3" style={{ color: C.indigo }}>Chi tiết</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "Danh mục", value: voucher.category },
                { label: "Loại giảm", value: voucher.discountType === "percent" ? `${voucher.discount}%` : fmt(voucher.discount) },
                { label: "Đơn tối thiểu", value: fmt(voucher.minOrder) },
                { label: "Bắt đầu", value: fmtDate(voucher.validFrom) },
                { label: "Hết hạn", value: fmtDate(voucher.validTo) },
                { label: "Đánh giá", value: `⭐ ${voucher.rating} (${voucher.reviews})` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span style={{ color: "#6B7280" }}>{item.label}</span>
                  <span className="font-semibold text-right" style={{ color: C.indigo }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-black/5">
            <h3 className="font-bold text-sm mb-3" style={{ color: C.indigo }}>Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {voucher.tags.map((t) => (
                <span key={t} className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: C.muted, color: C.indigo }}>{t}</span>
              ))}
            </div>
          </div>

          {voucher.status === "rejected" && (
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />
                <span className="text-sm font-bold" style={{ color: "#EF4444" }}>Lý do từ chối</span>
              </div>
              <p className="text-xs" style={{ color: "#6B7280" }}>Nội dung không đáp ứng tiêu chuẩn. Vui lòng chỉnh sửa và gửi lại.</p>
            </div>
          )}
        </div>
      </div>

      {/* Status dialog */}
      {showStatusDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-black text-lg mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
              Xác nhận thay đổi trạng thái
            </h3>
            <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
              Bạn có chắc muốn <strong>{showStatusDialog.label}</strong> voucher này?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowStatusDialog(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Hủy</button>
              <button onClick={() => applyStatus(showStatusDialog.next)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: C.peach }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

