import { useId } from "react"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Users, Store, ShoppingBag, Banknote } from "lucide-react"
import { C, fmt } from "@/utils/constants"
import { ORDERS, REVENUE_DATA } from "@/data/mock"
import { StatusBadge } from "@/components/StatusBadge"

const PARTNER_MONTHLY = [
  { month: "T1", new: 4 }, { month: "T2", new: 6 }, { month: "T3", new: 3 },
  { month: "T4", new: 8 }, { month: "T5", new: 5 }, { month: "T6", new: 11 },
  { month: "T7", new: 7 },
]

export function AdminAccountDashboardPage() {
  const uid = useId().replace(/:/g, "")

  const kpis = [
    { label: "Tổng khách hàng",    value: "25.412",         delta: "+342 tháng này",    icon: <Users className="w-5 h-5" />,      color: C.teal },
    { label: "Đối tác hoạt động",  value: "124",            delta: "8 đang chờ duyệt",  icon: <Store className="w-5 h-5" />,      color: C.indigo },
    { label: "Đơn hàng tháng",     value: "3.421",          delta: "245 hôm nay",        icon: <ShoppingBag className="w-5 h-5" />, color: C.peach },
    { label: "Doanh thu",          value: "1.245.000.000đ", delta: "+12.5% tháng trước", icon: <Banknote className="w-5 h-5" />,   color: "#7C3AED" },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Dashboard Tài khoản</h1>
        <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Tổng quan người dùng, đối tác, đơn hàng và doanh thu toàn hệ thống</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>{k.label}</p>
                <p className="text-xl font-black mt-1 leading-tight" style={{ color: C.indigo }}>{k.value}</p>
                <p className="text-xs mt-1 font-semibold" style={{ color: k.color }}>{k.delta}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: k.color + "18" }}>
                <span style={{ color: k.color }}>{k.icon}</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-5" style={{ backgroundColor: k.color }} />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>Doanh thu theo tháng (triệu đ)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id={`rev-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.teal} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} formatter={(v: number) => [`${v}M đ`, "Doanh thu"]} />
              <Area type="monotone" dataKey="revenue" stroke={C.teal} strokeWidth={2.5} fill={`url(#rev-${uid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* New partners by month */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>Đối tác mới theo tháng</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={PARTNER_MONTHLY}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} formatter={(v: number) => [`${v} đối tác`]} />
              <Bar dataKey="new" name="Đối tác mới" fill={C.indigo} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-black mb-4" style={{ color: C.indigo }}>Đơn hàng gần đây</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#FAFAF7" }}>
                {["Mã đơn", "Voucher", "Đối tác", "Số tiền", "Phương thức", "Trạng thái"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ORDERS.slice(0, 6).map((o) => (
                <tr key={o.id} className="border-t hover:bg-muted/20" style={{ borderColor: "#F0EDD8" }}>
                  <td className="px-4 py-3"><code className="text-xs" style={{ color: "#6B7280" }}>{o.id}</code></td>
                  <td className="px-4 py-3 text-xs font-semibold max-w-36"><span className="line-clamp-1" style={{ color: C.indigo }}>{o.voucherTitle}</span></td>
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
