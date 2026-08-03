import { useState } from "react"
import { Check, X, Eye } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { StatusBadge } from "@/components/StatusBadge"
import { VOUCHERS } from "@/data/mock"
import type { VoucherStatus } from "@/types"

const FALLBACK = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop"

export function VoucherApprovalPage() {
  const [vouchers, setVouchers] = useState(VOUCHERS)
  const pending = vouchers.filter((v) => v.status === "pending")

  const approve = (id: string) =>
    setVouchers((prev) => prev.map((v) => v.id === id ? { ...v, status: "active" as VoucherStatus } : v))

  const reject = (id: string) =>
    setVouchers((prev) => prev.map((v) => v.id === id ? { ...v, status: "cancelled" as VoucherStatus } : v))

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="font-black text-lg" style={{ color: C.indigo }}>Duyệt voucher</h2>
        {pending.length > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: C.peach + "15", color: C.peach }}>
            {pending.length} chờ duyệt
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-20">
          <AppIcon name="check" className="w-14 h-14 mb-4 mx-auto" />
          <div className="font-bold text-lg" style={{ color: C.indigo }}>Không có voucher nào chờ duyệt</div>
          <div className="text-sm mt-2" style={{ color: "#8A8DA8" }}>Tất cả voucher đã được xử lý</div>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((v) => (
            <div key={v.id} className="bg-card rounded-2xl p-5 shadow-sm flex gap-5">
              <img
                src={v.image}
                alt={v.title}
                className="w-24 h-20 rounded-xl object-cover shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-bold" style={{ color: C.indigo }}>{v.title}</div>
                    <div className="text-sm mt-0.5" style={{ color: "#8A8DA8" }}>{v.partnerName}</div>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                  {[
                    { label: "Giảm giá", value: v.discountType === "percent" ? `${v.discount}%` : fmt(v.discount) },
                    { label: "Giá bán", value: fmt(v.price) },
                    { label: "Số lượng", value: v.quantity.toString() },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ color: "#8A8DA8" }}>{label}</div>
                      <div className="font-bold mt-0.5" style={{ color: C.indigo }}>{value}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2 line-clamp-2" style={{ color: "#8A8DA8", fontFamily: "'Inter', sans-serif" }}>
                  {v.description}
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => approve(v.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: C.teal }}
                  >
                    <Check className="w-4 h-4" /> Duyệt
                  </button>
                  <button
                    onClick={() => reject(v.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}
                  >
                    <X className="w-4 h-4" /> Từ chối
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border hover:bg-muted" style={{ borderColor: "#E2DFC8", color: C.indigo }}>
                    <Eye className="w-4 h-4" /> Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recently processed */}
      <div className="mt-8">
        <h3 className="font-black mb-4" style={{ color: C.indigo }}>Đã xử lý gần đây</h3>
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: C.eggshell }}>
                  {["Voucher", "Đối tác", "Loại giảm", "Giá bán", "Trạng thái"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.filter((v) => v.status !== "pending").slice(0, 6).map((v) => (
                  <tr key={v.id} className="border-t hover:bg-muted/30" style={{ borderColor: "#F0EDD8" }}>
                    <td className="px-4 py-3 font-semibold text-xs" style={{ color: C.indigo }}>{v.title}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{v.partnerName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {v.discountType === "percent" ? `${v.discount}%` : fmt(v.discount)}
                    </td>
                    <td className="px-4 py-3 font-bold text-xs" style={{ color: C.peach }}>{fmt(v.price)}</td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
