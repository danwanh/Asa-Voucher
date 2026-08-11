import { useState } from "react"
import { ArrowLeft, Copy, CheckCircle2, Download, Star, MessageSquare, CreditCard } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Order } from "@/types"
import { MockQR } from "@/components/MockQR"

interface Props {
  order: Order
  onBack: () => void
  onReview: (order: Order) => void
  onComplaint?: (order: Order) => void
  onPayAgain?: (order: Order) => void
}

function orderStatusLabel(status: Order["status"]) {
  if (status === "pending_payment") return "Chờ thanh toán"
  if (status === "payment_failed") return "Thanh toán thất bại"
  if (status === "confirmed") return "Đã xác nhận"
  if (status === "completed") return "Hoàn thành"
  if (status === "refunded") return "Đã hoàn tiền"
  return "Đã hủy"
}

function issuedVoucherStatusLabel(status: string) {
  if (status === "refunded") return "Đã vô hiệu do hoàn tiền"
  if (status === "used") return "Đã sử dụng"
  if (status === "expired") return "Hết hạn"
  return "Đang hoạt động"
}

export function OrderDetailPage({ order, onBack, onReview, onComplaint, onPayAgain }: Props) {
  const [copied, setCopied] = useState(false)
  const issuedVouchers = (order.items ?? []).flatMap((item) => item.issuedVouchers ?? [])
  const isRefunded = order.status === "refunded"
  const hasPaid = order.status === "confirmed" || order.status === "completed" || order.status === "refunded"
  const paymentStepDone = hasPaid
  const voucherReceiveDone = issuedVouchers.length > 0 && !isRefunded

  const copy = () => {
    navigator.clipboard.writeText(order.orderCode ?? order.id).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const TIMELINE = [
    { label: "Đặt hàng", done: true, time: fmtDate(order.createdAt) },
    { label: "Thanh toán", done: paymentStepDone, time: paymentStepDone ? fmtDate(order.updatedAt ?? order.createdAt) : "" },
    { label: "Nhận voucher", done: voucherReceiveDone, time: voucherReceiveDone ? fmtDate(order.updatedAt ?? order.createdAt) : "" },
    { label: "Đã sử dụng", done: voucherReceiveDone && issuedVouchers.some((voucher) => voucher.status === "used"), time: voucherReceiveDone && issuedVouchers.some((voucher) => voucher.status === "used") ? fmtDate(order.updatedAt ?? order.createdAt) : "" },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline" style={{ color: C.indigo }}>
        <ArrowLeft className="w-4 h-4" /> Quay lại đơn hàng
      </button>

      <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: "#6B7280" }}>Mã đơn hàng</div>
            <div className="font-black text-xl" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{order.orderCode ?? order.id}</div>
            <div className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Ngày đặt: {fmtDate(order.createdAt)}</div>
          </div>
          <span className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ backgroundColor: order.status === "confirmed" || order.status === "completed" ? C.teal + "20" : order.status === "payment_failed" || order.status === "cancelled" ? "#FEE2E2" : order.status === "refunded" ? "#E0EEFF" : C.apricot + "25", color: order.status === "confirmed" || order.status === "completed" ? C.teal : order.status === "payment_failed" || order.status === "cancelled" ? "#DC2626" : order.status === "refunded" ? "#1A5FAD" : "#D97706" }}>
            {orderStatusLabel(order.status)}
          </span>
        </div>
      </div>

      {isRefunded && (
        <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "#93C5FD", backgroundColor: "#EFF6FF" }}>
          <div className="text-sm font-bold" style={{ color: "#1A5FAD" }}>Đơn hàng đã hoàn tiền</div>
          <div className="text-xs mt-1" style={{ color: "#1E40AF" }}>
            Voucher code vẫn hiển thị để tra cứu lịch sử, nhưng đã bị vô hiệu và không thể sử dụng.
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4">
        <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Trạng thái đơn hàng</h3>
        <div className="flex items-center gap-0">
          {TIMELINE.map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors"
                  style={{
                    backgroundColor: step.done ? C.teal : "white",
                    borderColor: step.done ? C.teal : "#E5E7EB",
                  }}
                >
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
        <div className="space-y-4">
          {(order.items ?? []).map((item) => (
            <div key={item.id} className="rounded-2xl border p-4" style={{ borderColor: "#F0EDD8" }}>
              <div className="flex items-start gap-4">
                <div className="w-20 h-16 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: C.eggshell }}>
                  <AppIcon name="gift" className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm mb-1" style={{ color: C.indigo }}>{item.voucherTitle}</div>
                  <div className="text-xs mb-2" style={{ color: "#6B7280" }}>{item.partnerName}</div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="font-semibold" style={{ color: C.indigo }}>SL: {item.quantity}</span>
                    <span className="font-semibold" style={{ color: C.indigo }}>Đơn giá: {fmt(item.unitPrice)}</span>
                    <span className="font-black" style={{ color: C.peach }}>Thành tiền: {fmt(item.subtotal)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {item.issuedVouchers && item.issuedVouchers.length > 0 ? (
                  item.issuedVouchers.map((voucher) => (
                    <div key={voucher.id} className="rounded-2xl border p-4" style={{ borderColor: voucher.status === "used" ? C.teal + "60" : "#E2DFC8" }}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold" style={{ color: "#6B7280" }}>Voucher code</div>
                          <div className="font-black tracking-widest text-base break-all" style={{ color: C.indigo, fontFamily: "'Inter', monospace" }}>{voucher.code}</div>
                          <div className="mt-1 text-xs" style={{ color: "#6B7280" }}>
                            Trạng thái: {issuedVoucherStatusLabel(voucher.status)}
                            {voucher.expiredDate ? ` • Hết hạn: ${fmtDate(voucher.expiredDate)}` : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <MockQR code={voucher.qrPayload || voucher.code} size={120} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm font-semibold" style={{ color: "#8A8DA8" }}>
                    {hasPaid ? "Mã voucher đang được phát hành." : "Chưa phát hành mã voucher vì đơn chưa thanh toán."}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {issuedVouchers.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4 text-center">
          <h3 className="font-bold text-sm mb-4" style={{ color: C.indigo }}>Mã voucher</h3>
          <div className="flex items-center justify-center gap-2 mb-4">
            <code className="text-lg font-black tracking-widest px-4 py-2 rounded-xl" style={{ backgroundColor: C.muted, color: C.indigo }}>
              {issuedVouchers[0].code}
            </code>
            <button onClick={copy} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Copy">
              {copied ? <CheckCircle2 className="w-5 h-5" style={{ color: C.teal }} /> : <Copy className="w-5 h-5" style={{ color: "#6B7280" }} />}
            </button>
          </div>
          <div className="flex justify-center mb-4">
            <MockQR code={issuedVouchers[0].qrPayload || issuedVouchers[0].code} size={160} />
          </div>
          {issuedVouchers.some((voucher) => voucher.status === "used") && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold" style={{ backgroundColor: "#E0EEFF", color: "#1A5FAD" }}>
              <CheckCircle2 className="w-4 h-4" /> Đã sử dụng
            </div>
          )}
          {hasPaid && (
            <button className="flex items-center gap-2 mx-auto text-sm font-semibold hover:underline" style={{ color: C.teal }}>
              <Download className="w-4 h-4" /> Tải xuống QR Code
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-black/5 mb-4">
        <h3 className="font-bold text-sm mb-3" style={{ color: C.indigo }}>Thông tin thanh toán</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Phương thức</span><span className="font-semibold" style={{ color: C.indigo }}>{order.paymentMethod}</span></div>
          <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Trạng thái</span><span className="font-semibold" style={{ color: C.indigo }}>{orderStatusLabel(order.status)}</span></div>
          <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Số tiền</span><span className="font-black" style={{ color: C.peach }}>{fmt(order.amount)}</span></div>
        </div>
      </div>

      <div className="flex gap-3">
        {(order.status === "pending_payment" || order.status === "payment_failed") && (!order.paymentExpiresAt || new Date(order.paymentExpiresAt).getTime() > Date.now()) && onPayAgain && (
          <button
            onClick={() => onPayAgain(order)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white"
            style={{ backgroundColor: C.peach }}
          >
            <CreditCard className="w-4 h-4" /> Thanh toán lại
          </button>
        )}
        {(order.status === "confirmed" || order.status === "completed") && (
          <button
            onClick={() => onReview(order)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border-2"
            style={{ borderColor: C.apricot, color: C.indigo }}
          >
            <Star className="w-4 h-4" style={{ color: C.apricot }} /> Đánh giá
          </button>
        )}
        {onComplaint && (order.complaints?.[0] || order.status === "confirmed" || order.status === "completed") && (
          <button onClick={() => onComplaint(order)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border-2" style={{ borderColor: "#93C5FD", color: "#2563EB" }}>
            <MessageSquare className="w-4 h-4" /> {order.complaints?.[0] ? "Xem khiếu nại đơn hàng" : "Khiếu nại đơn hàng"}
          </button>
        )}
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>
          <MessageSquare className="w-4 h-4" style={{ color: "#6B7280" }} /> Liên hệ hỗ trợ
        </button>
      </div>
    </div>
  )
}
