import { useEffect, useState } from "react"
import { DollarSign, Tag, Package, CheckCircle } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { C, fmt, fmtDate } from "@/utils/constants"
import { StatusBadge } from "@/components/StatusBadge"
import { ORDERS } from "@/data/mock"
import type { Voucher } from "@/types"
import { voucherService } from "@/services/voucherService"

const MY_ORDERS = ORDERS.filter((o) => o.partnerName === "Pizza Hut Vietnam")

export function PartnerDashboardPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadVouchers() {
      try {
        const items = await voucherService.listPublicVouchers({ limit: 100 })
        if (!isMounted) return
        setVouchers(items)
      } catch {
        if (!isMounted) return
        setVouchers([])
      }
    }

    loadVouchers()
    return () => {
      isMounted = false
    }
  }, [])

  const revenue = MY_ORDERS
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + o.amount, 0)

  const kpis = [
    { label: "Doanh thu tháng này", value: fmt(revenue), delta: "+8.3%", icon: <DollarSign className="w-5 h-5" />, color: C.teal },
    { label: "Voucher đang bán", value: vouchers.filter((v) => v.status === "active").length.toString(), delta: "+2 mới", icon: <Tag className="w-5 h-5" />, color: C.peach },
    { label: "Đơn hàng", value: MY_ORDERS.length.toString(), delta: "Tháng 7", icon: <Package className="w-5 h-5" />, color: C.indigo },
    { label: "Đã sử dụng", value: MY_ORDERS.filter((o) => o.status === "used").length.toString(), delta: "Voucher", icon: <CheckCircle className="w-5 h-5" />, color: "#F2CC8F" },
  ]

  const activeVouchers = vouchers.filter((v) => v.status === "active")
  const chartData = activeVouchers.map((v) => ({
    id: v.id,          // unique key for XAxis — prevents duplicate-key React warning
    label: v.title.slice(0, 12) + "…",
    sold: v.sold,
    remaining: v.quantity - v.sold,
  }))

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>{k.label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: k.color + "20" }}>
                <span style={{ color: k.color }}>{k.icon}</span>
              </div>
            </div>
            <div className="text-xl font-black" style={{ color: C.indigo }}>{k.value}</div>
            <div className="text-xs mt-1 font-semibold" style={{ color: C.teal }}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>Hiệu quả voucher</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={20}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F0EDD8" />
              <XAxis key="x" dataKey="id" tickFormatter={(id) => chartData.find((d) => d.id === id)?.label ?? id} tick={{ fontSize: 10, fill: "#8A8DA8" }} />
              <YAxis key="y" tick={{ fontSize: 10, fill: "#8A8DA8" }} />
              <Tooltip key="tooltip" contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
              <Bar key="sold" dataKey="sold" name="Đã bán" fill={C.peach} radius={[4, 4, 0, 0]} />
              <Bar key="remaining" dataKey="remaining" name="Còn lại" fill={C.apricot} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>Đơn hàng gần đây</h3>
          <div className="space-y-3">
            {MY_ORDERS.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: C.eggshell }}>
                <div>
                  <div className="text-xs font-bold" style={{ color: C.indigo }}>{o.voucherTitle.slice(0, 25)}…</div>
                  <div className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>{fmtDate(o.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold" style={{ color: C.peach }}>{fmt(o.amount)}</div>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
