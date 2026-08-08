import { useState } from "react"
import { ArrowLeft, Copy, CheckCircle2, QrCode, Download, Star, MessageSquare } from "lucide-react"
import { C, fmt, fmtDate, STATUS_LABEL, statusColor } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Order } from "@/types"

interface Props {
  order: Order
  onBack: () => void
  onReview: (order: Order) => void
}

export function OrderDetailPage({ order, onBack, onReview }: Props) {
  const [copied, setCopied] = useState(false)
  const sc = statusColor(order.status)

  const copy = () => {
    navigator.clipboard.writeText(order.code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const TIMELINE = [
    { label: "Đặt hàng", done: true, time: fmtDate(order.createdAt) },
    { label: "Thanh toán", done: order.status !== "pending", time: order.status !== "pending" ? fmtDate(order.createdAt) : "" },
    { label: "Nhận voucher", done: order.status === "confirmed" || order.status === "completed" || order.status === "used", time: order.status === "confirmed" || order.status === "completed" || order.status === "used" ? fmtDate(order.createdAt) : "" },
    { label: "Đã sử dụng", done: order.status === "used", time: order.status === "used" ? fmtDate(order.createdAt) : "" },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
        <ArrowLeft className="w-4 h-4" /> Quay lại đơn hàng
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: "#6B7280" }}>Mã đơn hàng</div>
            <div className="font-black text-xl" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{order.id}</div>
            <div className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Ngày đặt: {fmtDate(order.createdAt)}</div>
          </div>
          <span className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4">
        <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Trạng thái đơn hàng</h3>
        <div className="flex items-center gap-0">
          {TIMELINE.map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors`}
                  style={{
                    backgroundColor: step.done ? C.teal : "white",
                    borderColor: step.done ? C.teal : "#E5E7EB",
                  }}>
                  {step.done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                </div>
                <div className="text-xs font-semibold mt-1 text-center whitespace-nowrap" style={{ color: step.done ? C.indigo : "#9CA3AF" }}>{step.label}</div>
                {step.time && <div className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>{step.time}</div>}
              </div>
              {i < TIMELINE.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mb-6" style={{ backgroundColor: TIMELINE[i + 1].done ? C.teal : "#E5E7EB" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4">
        <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Thông tin voucher</h3>
        <div className="flex items-start gap-4">
          <div className="w-20 h-16 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: C.eggshell }}>
            <AppIcon name="gift" className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm mb-1" style={{ color: C.indigo }}>{order.voucherTitle}</div>
            <div className="text-xs mb-2" style={{ color: "#6B7280" }}>{order.partnerName}</div>
            <div className="font-black" style={{ color: C.peach }}>{fmt(order.amount)}</div>
          </div>
        </div>
      </div>

      {/* QR Code */}
      {(order.status === "confirmed" || order.status === "completed" || order.status === "used") && (
        <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4 text-center">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Mã voucher</h3>
          <div className="flex items-center justify-center gap-2 mb-4">
            <code className="text-lg font-black tracking-widest px-4 py-2 rounded-xl" style={{ backgroundColor: C.muted, color: C.indigo }}>
              {order.code}
            </code>
            <button onClick={copy} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Copy">
              {copied ? <CheckCircle2 className="w-5 h-5" style={{ color: C.teal }} /> : <Copy className="w-5 h-5" style={{ color: "#6B7280" }} />}
            </button>
          </div>
          {/* Mock QR */}
          <div className="w-40 h-40 mx-auto rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed" style={{ borderColor: "#E5E7EB" }}>
            <div className="text-center">
              <QrCode className="w-16 h-16 mx-auto mb-1" style={{ color: C.indigo }} />
              <div className="text-xs" style={{ color: "#9CA3AF" }}>QR Code</div>
            </div>
          </div>
          {order.status === "used" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold" style={{ backgroundColor: "#E0EEFF", color: "#1A5FAD" }}>
              <CheckCircle2 className="w-4 h-4" /> Đã sử dụng
            </div>
          )}
          {(order.status === "confirmed" || order.status === "completed") && (
            <button className="flex items-center gap-2 mx-auto text-sm font-semibold hover:underline" style={{ color: C.teal }}>
              <Download className="w-4 h-4" /> Tải xuống QR Code
            </button>
          )}
        </div>
      )}

      {/* Payment */}
      <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4">
        <h3 className="font-bold text-sm mb-3" style={{ color: C.indigo }}>Thông tin thanh toán</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Phương thức</span><span className="font-semibold" style={{ color: C.indigo }}>{order.paymentMethod}</span></div>
          <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Số tiền</span><span className="font-black" style={{ color: C.peach }}>{fmt(order.amount)}</span></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {(order.status === "confirmed" || order.status === "completed") && (
          <button
            onClick={() => onReview(order)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border-2"
            style={{ borderColor: C.apricot, color: C.indigo }}
          >
            <Star className="w-4 h-4" style={{ color: C.apricot }} /> Đánh giá
          </button>
        )}
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>
          <MessageSquare className="w-4 h-4" style={{ color: "#6B7280" }} /> Liên hệ hỗ trợ
        </button>
      </div>
    </div>
  )
}
