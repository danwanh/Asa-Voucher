import { useId } from "react"
import { Package, Tag, Store } from "lucide-react"
import { Banknote } from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { C, fmt } from "@/utils/constants"
import { StatusBadge } from "@/components/StatusBadge"
import { ORDERS } from "@/data/mock"
import { REVENUE_DATA, CATEGORY_PIE } from "@/data/mock"

export function AdminDashboardPage() {
  const uid = useId().replace(/:/g, "")
  const kpis = [
    { label: "Tổng doanh thu", value: "1.245.000.000đ", delta: "+12.5% tháng trước", icon: <Banknote className="w-5 h-5" />, color: C.teal },
    { label: "Đơn hàng", value: "3.421", delta: "245 đơn hôm nay", icon: <Package className="w-5 h-5" />, color: C.peach },
    { label: "Voucher đã bán", value: "8.932", delta: "Tăng 18% tuần này", icon: <Tag className="w-5 h-5" />, color: C.indigo },
    { label: "Đối tác hoạt động", value: "124", delta: "8 đối tác mới", icon: <Store className="w-5 h-5" />, color: C.apricot },
  ]

  return (
    <div className="p-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>{k.label}</p>
                <p className="text-xl font-black mt-1" style={{ color: C.indigo }}>{k.value}</p>
                <p className="text-xs mt-1 font-semibold" style={{ color: C.teal }}>{k.delta}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: k.color + "18" }}>
                <span style={{ color: k.color }}>{k.icon}</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-5" style={{ backgroundColor: k.color }} />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 bg-card rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>Doanh thu theo tháng (triệu đ)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.peach} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.peach} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8DA8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                formatter={(v: number) => [`${v}M đ`, "Doanh thu"]}
              />
              <Area type="monotone" dataKey="revenue" stroke={C.peach} strokeWidth={2.5} fill={`url(#grad-${uid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>Danh mục voucher</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={CATEGORY_PIE} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                {CATEGORY_PIE.map((e) => <Cell key={`cell-${e.name}`} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} formatter={(v: number) => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {CATEGORY_PIE.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span style={{ color: "#8A8DA8" }}>{c.name}</span>
                </div>
                <span className="font-bold" style={{ color: C.indigo }}>{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-card rounded-2xl p-5 shadow-sm">
        <h3 className="font-black mb-4" style={{ color: C.indigo }}>Đơn hàng gần đây</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.eggshell }}>
                {["Mã đơn", "Voucher", "Đối tác", "Số tiền", "Phương thức", "Trạng thái"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ORDERS.slice(0, 5).map((o) => (
                <tr key={o.id} className="border-t hover:bg-muted/30" style={{ borderColor: "#F0EDD8" }}>
                  <td className="px-4 py-3">
                    <code className="text-xs" style={{ color: C.indigoLight, fontFamily: "'Inter', monospace" }}>{o.id}</code>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold max-w-36">
                    <span className="line-clamp-1" style={{ color: C.indigo }}>{o.voucherTitle}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{o.partnerName}</td>
                  <td className="px-4 py-3 font-bold text-xs" style={{ color: C.peach }}>{fmt(o.amount)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{o.paymentMethod}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
