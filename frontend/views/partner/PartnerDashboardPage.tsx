import { useEffect, useState } from "react"
import { DollarSign, Tag, Package, CheckCircle } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { C, fmt, fmtDate } from "@/utils/constants"
import { StatusBadge } from "@/components/StatusBadge"
import type { Voucher } from "@/types"
import { voucherService } from "@/services/voucherService"
import { LoadingState, LoadingSpinner } from "@/components/LoadingState"

interface Props {
  partnerId?: string
}

export function PartnerDashboardPage({ partnerId }: Props) {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadVouchers() {
      if (!partnerId) {
        if (!isMounted) return
        setVouchers([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError(null)
      try {
        const items = await voucherService.listPublicVouchers({ limit: 100, partnerId })
        if (!isMounted) return
        setVouchers(items)
      } catch {
        if (!isMounted) return
        setLoadError("Không thể tải dữ liệu voucher.")
        setVouchers([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadVouchers()
    return () => {
      isMounted = false
    }
  }, [partnerId])

  const soldCount = vouchers.reduce((sum, voucher) => sum + voucher.sold, 0)
  const revenue = vouchers.reduce((sum, voucher) => sum + voucher.sold * voucher.price, 0)

  const kpis = [
    { label: "Doanh thu ước tính", value: isLoading ? "..." : fmt(revenue), delta: "Theo dữ liệu voucher", icon: <DollarSign className="w-5 h-5" />, color: C.teal },
    { label: "Voucher đang bán", value: isLoading ? "..." : vouchers.filter((v) => v.status === "active").length.toString(), delta: "Đang hoạt động", icon: <Tag className="w-5 h-5" />, color: C.peach },
    { label: "Tổng voucher", value: isLoading ? "..." : vouchers.length.toString(), delta: "Theo partner hiện tại", icon: <Package className="w-5 h-5" />, color: C.indigo },
    { label: "Đã bán", value: isLoading ? "..." : soldCount.toString(), delta: "Voucher", icon: <CheckCircle className="w-5 h-5" />, color: "#F2CC8F" },
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
      {isLoading && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-white p-4 text-sm font-semibold shadow-sm" style={{ color: C.indigo }} role="status" aria-live="polite">
          <LoadingSpinner size="sm" />
          Đang tải dữ liệu dashboard...
        </div>
      )}
      {loadError && !isLoading && (
        <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{loadError}</div>
      )}
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
          {isLoading ? (
            <div className="flex h-[220px] items-center justify-center text-sm" style={{ color: "#8A8DA8" }} role="status" aria-live="polite">
              <LoadingState label="Đang tải biểu đồ..." variant="section" size="sm" />
            </div>
          ) : (
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
          )}
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>Voucher gần đây</h3>
          <div className="space-y-3">
            {vouchers.slice(0, 5).map((voucher) => (
              <div key={voucher.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: C.eggshell }}>
                <div>
                  <div className="text-xs font-bold" style={{ color: C.indigo }}>{voucher.title.slice(0, 25)}…</div>
                  <div className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>{fmtDate(voucher.validTo)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold" style={{ color: C.peach }}>{fmt(voucher.price)}</div>
                  <StatusBadge status={voucher.status} />
                </div>
              </div>
            ))}
            {!isLoading && !loadError && vouchers.length === 0 && (
              <div className="text-xs" style={{ color: "#8A8DA8" }}>Chưa có voucher để hiển thị.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
