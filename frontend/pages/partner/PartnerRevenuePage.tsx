import { useEffect, useMemo, useState } from "react"
import { Filter, Loader2, TrendingUp } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { C, fmt } from "@/utils/constants"
import { voucherService } from "@/services/voucherService"
import type { Voucher } from "@/types"

type Props = {
  partnerId?: string
  partnerName?: string
}

type MonthlyRow = {
  monthKey: string
  monthLabel: string
  sold: number
  revenue: number
  vouchers: number
}

function monthKey(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string) {
  const [year, month] = key.split("-")
  return `T${month}/${year}`
}

function aggregateMonthly(vouchers: Voucher[]): MonthlyRow[] {
  const map = new Map<string, MonthlyRow>()

  vouchers.forEach((voucher) => {
    const key = monthKey(voucher.validFrom || voucher.validTo)
    const current = map.get(key) ?? {
      monthKey: key,
      monthLabel: monthLabel(key),
      sold: 0,
      revenue: 0,
      vouchers: 0,
    }

    current.sold += voucher.sold
    current.revenue += voucher.sold * voucher.price
    current.vouchers += 1
    map.set(key, current)
  })

  return Array.from(map.values()).sort((a, b) => (a.monthKey > b.monthKey ? 1 : -1))
}

export function PartnerRevenuePage({ partnerId, partnerName }: Props) {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fromMonth, setFromMonth] = useState("")
  const [toMonth, setToMonth] = useState("")

  useEffect(() => {
    let isMounted = true

    async function loadVouchers() {
      if (!partnerId) {
        if (!isMounted) return
        setVouchers([])
        return
      }

      setIsLoading(true)
      try {
        const items = await voucherService.listPublicVouchers({ partnerId, limit: 200 })
        if (!isMounted) return
        setVouchers(items)
      } catch {
        if (!isMounted) return
        setVouchers([])
      } finally {
        if (!isMounted) return
        setIsLoading(false)
      }
    }

    loadVouchers()
    return () => {
      isMounted = false
    }
  }, [partnerId])

  const monthly = useMemo(() => aggregateMonthly(vouchers), [vouchers])

  const filtered = useMemo(
    () =>
      monthly.filter((row) => {
        if (fromMonth && row.monthKey < fromMonth) return false
        if (toMonth && row.monthKey > toMonth) return false
        return true
      }),
    [fromMonth, monthly, toMonth],
  )

  const totalRevenue = filtered.reduce((sum, row) => sum + row.revenue, 0)
  const totalSold = filtered.reduce((sum, row) => sum + row.sold, 0)
  const totalVouchers = filtered.reduce((sum, row) => sum + row.vouchers, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-black" style={{ color: C.indigo }}>Báo cáo doanh thu</h2>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ backgroundColor: C.indigo + "12", color: C.indigo }}>
          {partnerName || "Đối tác hiện tại"}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border shadow-sm mb-5" style={{ borderColor: "#E2DFC8" }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4" style={{ color: C.indigo }} />
          <span className="text-sm font-bold" style={{ color: C.indigo }}>Bộ lọc thời gian</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.indigo }}>Từ tháng</label>
            <input
              type="month"
              value={fromMonth}
              onChange={(event) => setFromMonth(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.indigo }}>Đến tháng</label>
            <input
              type="month"
              value={toMonth}
              onChange={(event) => setToMonth(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl p-6 bg-white flex items-center gap-2 text-sm" style={{ color: "#8A8DA8" }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải dữ liệu doanh thu...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-8 bg-white text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-2" style={{ color: "#8A8DA8" }} />
          <p className="text-sm" style={{ color: "#8A8DA8" }}>Chưa có dữ liệu để hiển thị báo cáo.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Doanh thu ước tính</div>
              <div className="text-lg font-black mt-1" style={{ color: C.peach }}>{fmt(totalRevenue)}</div>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Voucher đã bán</div>
              <div className="text-lg font-black mt-1" style={{ color: C.teal }}>{totalSold}</div>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Số voucher</div>
              <div className="text-lg font-black mt-1" style={{ color: C.indigo }}>{totalVouchers}</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-card rounded-2xl p-5 shadow-sm">
              <h3 className="font-black mb-4" style={{ color: C.indigo }}>Doanh thu theo tháng</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={filtered}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "#8A8DA8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} />
                  <Tooltip formatter={(value: number) => [fmt(value), "Doanh thu"]} />
                  <Line type="monotone" dataKey="revenue" stroke={C.peach} strokeWidth={3} dot={{ fill: C.peach, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-sm">
              <h3 className="font-black mb-4" style={{ color: C.indigo }}>Số voucher đã bán</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={filtered} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "#8A8DA8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} />
                  <Tooltip />
                  <Bar dataKey="sold" fill={C.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
