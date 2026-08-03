import { useState } from "react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { StatusBadge } from "@/components/StatusBadge"
import { ORDERS, USERS } from "@/data/mock"

export function AdminOrdersPage() {
  const [filter, setFilter] = useState("all")

  const filtered = filter === "all" ? ORDERS : ORDERS.filter((o) => o.status === filter)

  return (
    <div className="p-6">
      <h2 className="font-black text-lg mb-5" style={{ color: C.indigo }}>
        Quản lý đơn hàng ({ORDERS.length})
      </h2>

      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { v: "all", l: "Tất cả" },
          { v: "pending", l: "Chờ xử lý" },
          { v: "completed", l: "Hoàn thành" },
          { v: "used", l: "Đã dùng" },
          { v: "cancelled", l: "Đã hủy" },
        ].map(({ v, l }) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className="px-4 py-2 rounded-2xl text-sm font-bold transition-all border"
            style={{
              backgroundColor: filter === v ? C.indigo : "white",
              color: filter === v ? "white" : C.indigo,
              borderColor: filter === v ? C.indigo : "#E2DFC8",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.eggshell }}>
                {["Mã đơn", "Voucher", "Đối tác", "Khách hàng", "Số tiền", "Phương thức", "Ngày", "Trạng thái"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const u = USERS.find((u) => u.id === o.userId)
                return (
                  <tr key={o.id} className="border-t hover:bg-muted/30 transition-colors" style={{ borderColor: "#F0EDD8" }}>
                    <td className="px-4 py-3">
                      <code className="text-xs" style={{ color: C.indigoLight, fontFamily: "'Inter', monospace" }}>{o.id}</code>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold max-w-36">
                      <span className="line-clamp-2" style={{ color: C.indigo }}>{o.voucherTitle}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{o.partnerName}</td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: C.indigo }}>{u?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-xs" style={{ color: C.peach }}>{fmt(o.amount)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{o.paymentMethod}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{fmtDate(o.createdAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <AppIcon name="package" className="w-10 h-10 mb-3 mx-auto" />
            <div className="font-bold" style={{ color: C.indigo }}>Không có đơn hàng</div>
          </div>
        )}
      </div>
    </div>
  )
}
