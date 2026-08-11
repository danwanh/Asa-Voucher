import { useEffect, useId, useState } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Users, Store, ShoppingBag, Banknote } from "lucide-react"
import { C, fmt, fmtDate, statusColor, STATUS_LABEL } from "@/utils/constants"
import { StatusBadge } from "@/components/StatusBadge"
import {
  getDashboardStats,
  type DashboardStats,
  type DashboardRecentOrder,
} from "@/services/dashboardService"
import { orderService } from "@/services/orderService"
import type { OrderDetail } from "@/services/orderService"

export function AdminOperationsDashboardPage() {
  const uid = useId().replace(/:/g, "")

  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    partners: 0,
    orders: 0,
    revenue: 0,
    revenueByMonth: [],
    partnersByMonth: [],
    recentOrders: [],
  })

  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadDashboard = async () => {
    if (from && to && from > to) {
      setError("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.")
      return
    }
    try {
      setLoading(true)
      setError("")

      const data = await getDashboardStats({
        from: from || undefined,
        to: to || undefined,
      })

      setStats(data)
    } catch (err) {
      console.error("Load dashboard error:", err)
      setError("Không thể tải dữ liệu Dashboard.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [from, to])

  const handleClickRow = async (order: DashboardRecentOrder) => {
    setDetailLoading(true)
    setDetailOrder(null)
    try {
      const detail = await orderService.getOrder(order.id)
      setDetailOrder(detail)
    } catch {
      setDetailOrder(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const kpis = [
    {
      label: "Tổng khách hàng",
      value: loading ? "0" : stats.users.toLocaleString("vi-VN"),
      delta: "Tổng số người dùng",
      icon: <Users className="w-5 h-5" />,
      color: C.teal,
    },
    {
      label: "Đối tác hoạt động",
      value: loading ? "0" : stats.partners.toLocaleString("vi-VN"),
      delta: "Tổng số đối tác",
      icon: <Store className="w-5 h-5" />,
      color: C.indigo,
    },
    {
      label: "Đơn hàng",
      value: loading ? "0" : stats.orders.toLocaleString("vi-VN"),
      delta: "Tổng số đơn hàng",
      icon: <ShoppingBag className="w-5 h-5" />,
      color: C.peach,
    },
    {
      label: "Doanh thu",
      value: loading ? "0" : fmt(Number(stats.revenue)),
      delta: "Tổng doanh thu",
      icon: <Banknote className="w-5 h-5" />,
      color: "#7C3AED",
    },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-black"
          style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}
        >
          Dashboard Vận hành
        </h1>
        <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>
          Tổng quan người dùng, đối tác, đơn hàng và doanh thu toàn hệ thống
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#8A8DA8" }}>
              Từ ngày
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#8A8DA8" }}>
              Đến ngày
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm outline-none"
            />
          </div>
          {(from || to) && (
            <button
              type="button"
              onClick={() => { setFrom(""); setTo(""); }}
              className="px-5 py-2 rounded-xl text-sm font-bold border"
              style={{ borderColor: "#E0E0E0", color: "#8A8DA8" }}
            >
              Xóa lọc
            </button>
          )}
          {loading && (
            <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: "#8A8DA8" }}>
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.indigo, borderTopColor: "transparent" }} />
              Đang tải...
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                  {k.label}
                </p>
                <p className="text-xl font-black mt-1 leading-tight" style={{ color: C.indigo }}>
                  {k.value}
                </p>
                <p className="text-xs mt-1 font-semibold" style={{ color: k.color }}>
                  {k.delta}
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: k.color + "18" }}
              >
                <span style={{ color: k.color }}>{k.icon}</span>
              </div>
            </div>
            <div
              className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-5"
              style={{ backgroundColor: k.color }}
            />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Revenue */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>
            Doanh thu theo tháng (triệu VNĐ)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.revenueByMonth}>
              <defs>
                <linearGradient id={`rev-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.teal} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                formatter={(value) => [`${Number(value)} triệu VNĐ`, "Doanh thu"]}
              />
              <Area type="monotone" dataKey="revenue" stroke={C.teal} strokeWidth={2.5} fill={`url(#rev-${uid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Partners */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>
            Đối tác mới theo tháng
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.partnersByMonth}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none" }}
                formatter={(value) => [`${Number(value)} đối tác`, "Đối tác mới"]}
              />
              <Bar dataKey="new" name="Đối tác mới" fill={C.indigo} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-black mb-4" style={{ color: C.indigo }}>
          Đơn hàng gần đây
        </h3>

        {stats.recentOrders.length === 0 && !loading ? (
          <div className="py-8 text-center text-sm text-gray-400">
            Chưa có dữ liệu đơn hàng gần đây.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: C.eggshell }}>
                  {["Mã đơn", "Voucher", "Đối tác", "Số tiền", "Phương thức", "Trạng thái"].map((h, i) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider"
                      style={{ color: C.indigo, textAlign: i === 3 ? "right" : "left" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => handleClickRow(o)}
                    className="border-t hover:bg-gray-50/80 cursor-pointer transition-colors"
                    style={{ borderColor: "#F0EDD8" }}
                  >
                    <td className="px-4 py-3">
                      <code
                        className="text-xs font-semibold px-2 py-1 rounded-md"
                        style={{ color: C.indigo, backgroundColor: C.eggshell, fontFamily: "'Inter', monospace" }}
                      >
                        {o.orderCode}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: C.indigo }}>
                      {o.voucherTitle}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {o.partnerName}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold" style={{ color: C.peach }}>
                        {fmt(o.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {o.paymentMethod}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {(detailLoading || detailOrder) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDetailOrder(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black" style={{ color: C.indigo }}>
                Chi tiết đơn hàng
              </h3>
              <button
                onClick={() => setDetailOrder(null)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                style={{ color: "#8A8DA8" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {detailLoading && (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: C.indigo, borderTopColor: "transparent" }} />
                <p className="text-sm" style={{ color: "#8A8DA8" }}>Đang tải chi tiết...</p>
              </div>
            )}

            {detailOrder && (
              <div>
                {/* Info */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 rounded-xl p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Mã đơn</p>
                    <code
                      className="text-sm font-bold px-2 py-0.5 rounded-md inline-block"
                      style={{ color: C.indigo, backgroundColor: C.eggshell, fontFamily: "'Inter', monospace" }}
                    >
                      {detailOrder.code}
                    </code>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Trạng thái</p>
                    <StatusBadge status={detailOrder.status} />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Đối tác</p>
                    <p className="text-sm font-semibold" style={{ color: C.indigo }}>
                      {detailOrder.partnerName ?? "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Phương thức</p>
                    <p className="text-sm font-semibold" style={{ color: C.indigo }}>{detailOrder.paymentMethod}</p>
                  </div>
                </div>

                {/* Voucher list */}
                <div className="mb-5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8A8DA8" }}>
                    Voucher trong đơn
                  </h4>
                  <div className="space-y-2">
                    {detailOrder.items.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-xl p-3.5 flex items-center justify-between">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-sm font-semibold truncate" style={{ color: C.indigo }}>
                            {item.voucherProduct?.name ?? item.voucherProductId}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>
                            {item.voucherProduct?.partnerName && (
                              <span>Đối tác: {item.voucherProduct.partnerName} &middot; </span>
                            )}
                            x{item.quantity} &times; {fmt(item.unitPrice)}
                          </p>
                        </div>
                        <p className="text-sm font-bold whitespace-nowrap" style={{ color: C.peach }}>{fmt(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                  <span className="text-sm font-bold" style={{ color: C.indigo }}>Tổng tiền</span>
                  <span className="text-lg font-black" style={{ color: C.peach }}>{fmt(detailOrder.amount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
