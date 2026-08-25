import { useId } from "react"
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { C, fmt } from "@/utils/constants"
import { REVENUE_DATA, CATEGORY_PIE } from "@/data/mock"

const CARD_DATA = [
  { label: "Tổng doanh thu", value: "₫1.25 tỷ", pct: "+18%", color: C.peach },
  { label: "Tổng đơn hàng", value: "3.847", pct: "+12%", color: C.teal },
  { label: "Voucher đã bán", value: "4.210", pct: "+9%", color: C.indigo },
  { label: "Khách hàng mới", value: "892", pct: "+24%", color: "#7C3AED" },
]

export function AdminReportsPage() {
  const uid = useId().replace(/:/g, "")
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Báo cáo hệ thống</h1>
        <div className="flex gap-2">
          {["PDF", "Excel", "CSV"].map((f) => (
            <button key={f} className="px-3 py-1.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#E2DFC8", color: C.indigo }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {CARD_DATA.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-xs font-semibold mb-1" style={{ color: "#8A8DA8" }}>{c.label}</div>
            <div className="text-2xl font-black" style={{ color: C.indigo }}>{c.value}</div>
            <div className="text-xs font-bold mt-1" style={{ color: "#2D7A52" }}>{c.pct} so với tháng trước</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-black mb-4" style={{ color: C.indigo }}>Doanh thu theo tháng</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id={`gr-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.peach} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.peach} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} tickFormatter={(v) => (v / 1e6).toFixed(0) + "M"} />
              <Tooltip formatter={(v: number) => [fmt(v), "Doanh thu"]} />
              <Area type="monotone" dataKey="revenue" stroke={C.peach} strokeWidth={2} fill={`url(#gr-${uid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-black mb-4" style={{ color: C.indigo }}>Doanh thu theo danh mục</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={CATEGORY_PIE} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="name">
                {CATEGORY_PIE.map((entry, i) => (
                  <Cell key={`cell-${entry.name}`} fill={[C.peach, C.teal, C.apricot, C.indigoLight][i % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {CATEGORY_PIE.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: [C.peach, C.teal, C.apricot, C.indigoLight][i % 4] }} />
                  <span style={{ color: "#8A8DA8" }}>{d.name}</span>
                </div>
                <span className="font-bold" style={{ color: C.indigo }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Orders bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-black mb-4" style={{ color: C.indigo }}>Đơn hàng theo tháng</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={REVENUE_DATA}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="vouchers" fill={C.teal} radius={[4, 4, 0, 0]} name="Voucher" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats table */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-black mb-4" style={{ color: C.indigo }}>Top tháng gần nhất</h2>
          <div className="space-y-3">
            {REVENUE_DATA.slice(-4).reverse().map((d) => (
              <div key={d.month} className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: C.indigo }}>{d.month}</span>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: C.peach }}>{fmt(d.revenue)}</div>
                  <div className="text-xs" style={{ color: "#8A8DA8" }}>{d.vouchers} voucher</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
