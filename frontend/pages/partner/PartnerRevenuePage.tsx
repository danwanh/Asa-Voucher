import { useEffect, useMemo, useState } from "react"
import { Filter, Loader2, RefreshCcw } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { C, fmt } from "@/utils/constants"
import { LoadingState } from "@/components/LoadingState"
import { partnerService, type PartnerBranch } from "@/services/partnerService"
import { reportService, type RevenuePoint, type VoucherReportItem } from "@/services/reportService"

type Props = {
  partnerId?: string
  partnerName?: string
}

function toMonthInput(value: string) {
  if (!value) return ""
  return value.slice(0, 7)
}

function fromMonthInput(value: string) {
  return value ? `${value}-01` : undefined
}

function fmtDate(date: string) {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return date
  return value.toLocaleDateString("vi-VN")
}

function voucherUsageRate(item: VoucherReportItem) {
  if (item.sold_quantity === 0) return 0
  return Number(((item.used_quantity / item.sold_quantity) * 100).toFixed(2))
}

function buildUsageSummary(revenueRows: RevenuePoint[], voucherRows: VoucherReportItem[]) {
  const revenue = revenueRows.reduce((sum, item) => sum + item.revenue, 0)
  const issued = voucherRows.reduce((sum, item) => sum + item.total_quantity, 0)
  const remaining = voucherRows.reduce((sum, item) => sum + item.remaining_quantity, 0)
  const sold = voucherRows.reduce((sum, item) => sum + item.sold_quantity, 0)
  const used = voucherRows.reduce((sum, item) => sum + item.used_quantity, 0)
  const usageRate = sold === 0 ? 0 : Number(((used / sold) * 100).toFixed(2))
  const activeVouchers = voucherRows.filter((item) => item.remaining_quantity > 0).length
  const totalVouchers = voucherRows.length

  return { revenue, issued, remaining, sold, used, usageRate, activeVouchers, totalVouchers }
}

export function PartnerRevenuePage({ partnerId, partnerName }: Props) {
  const [fromMonth, setFromMonth] = useState("")
  const [toMonth, setToMonth] = useState("")
  const [branches, setBranches] = useState<PartnerBranch[]>([])
  const [branchId, setBranchId] = useState("")
  const [voucherId, setVoucherId] = useState("")
  const [voucherOptions, setVoucherOptions] = useState<VoucherReportItem[]>([])

  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [voucherStats, setVoucherStats] = useState<VoucherReportItem[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    let isMounted = true

    async function loadBranches() {
      if (!partnerId) {
        if (!isMounted) return
        setBranches([])
        return
      }

      try {
        const items = await partnerService.listBranches(partnerId)
        if (!isMounted) return
        setBranches(items)
      } catch {
        if (!isMounted) return
        setBranches([])
      }
    }

    loadBranches()
    return () => {
      isMounted = false
    }
  }, [partnerId])

  const dateError = useMemo(() => {
    if (!fromMonth || !toMonth) return ""
    if (fromMonth > toMonth) return "Khoảng thời gian không hợp lệ. Vui lòng chọn lại."
    return ""
  }, [fromMonth, toMonth])

  const loadReport = async () => {
    if (!partnerId) {
      setRevenue([])
      setVoucherStats([])
      return
    }

    if (dateError) {
      setErrorMessage(dateError)
      setRevenue([])
      setVoucherStats([])
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    try {
      const filters = {
        date_from: fromMonthInput(fromMonth),
        date_to: fromMonthInput(toMonth),
        branch_id: branchId || undefined,
        voucher_product_id: voucherId || undefined,
      }

      const optionFilters = {
        date_from: fromMonthInput(fromMonth),
        date_to: fromMonthInput(toMonth),
        branch_id: branchId || undefined,
      }

      const revenuePromise = reportService.getRevenueReport(filters)
      const voucherPromise = reportService.getVoucherReport(filters)
      const optionPromise = voucherId
        ? reportService.getVoucherReport(optionFilters)
        : voucherPromise

      const [revenueRows, voucherRows, voucherOptionRows] = await Promise.all([
        revenuePromise,
        voucherPromise,
        optionPromise,
      ])

      setRevenue(revenueRows)
      setVoucherStats(voucherRows)
      setVoucherOptions(voucherOptionRows)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } }
      setErrorMessage(err?.response?.data?.error?.message ?? "Không thể tổng hợp báo cáo. Vui lòng thử lại.")
      setRevenue([])
      setVoucherStats([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, fromMonth, toMonth, branchId, voucherId])

  const usageSummary = useMemo(() => buildUsageSummary(revenue, voucherStats), [revenue, voucherStats])

  const hasReportData = revenue.length > 0 || voucherStats.length > 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black" style={{ color: C.indigo }}>Báo cáo đối tác</h2>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ backgroundColor: C.indigo + "12", color: C.indigo }}>
          {partnerName || "Đối tác hiện tại"}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: "#E2DFC8" }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4" style={{ color: C.indigo }} />
          <span className="text-sm font-bold" style={{ color: C.indigo }}>Bộ lọc báo cáo</span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.indigo }}>Từ tháng</label>
            <input
              type="month"
              value={fromMonth}
              onChange={(event) => setFromMonth(toMonthInput(event.target.value))}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.indigo }}>Đến tháng</label>
            <input
              type="month"
              value={toMonth}
              onChange={(event) => setToMonth(toMonthInput(event.target.value))}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.indigo }}>Chi nhánh</label>
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            >
              <option value="">Tất cả chi nhánh</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.branchName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.indigo }}>Chương trình voucher</label>
            <select
              value={voucherId}
              onChange={(event) => setVoucherId(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            >
              <option value="">Tất cả voucher</option>
              {voucherOptions.map((voucher) => (
                <option key={voucher.voucher_product_id} value={voucher.voucher_product_id}>{voucher.name}</option>
              ))}
            </select>
          </div>
        </div>

        {dateError && (
          <div className="mt-3 rounded-xl p-3 text-sm" style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}>
            {dateError}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-2xl p-4 flex items-center gap-2" style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}>
          <RefreshCcw className="w-4 h-4" />
          <span className="text-sm font-semibold">{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <LoadingState label="Đang tổng hợp báo cáo..." variant="section" size="sm" className="rounded-2xl bg-white" />
      ) : !hasReportData ? (
        <div className="rounded-2xl p-8 bg-white text-center text-sm" style={{ color: "#8A8DA8" }}>
          Không có dữ liệu phù hợp.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Doanh thu</div>
              <div className="text-lg font-black mt-1" style={{ color: C.peach }}>{fmt(usageSummary.revenue)}</div>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Voucher đang bán</div>
              <div className="text-lg font-black mt-1" style={{ color: C.teal }}>{usageSummary.activeVouchers}</div>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Tổng voucher</div>
              <div className="text-lg font-black mt-1" style={{ color: C.indigo }}>{usageSummary.totalVouchers}</div>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Phát hành</div>
              <div className="text-lg font-black mt-1" style={{ color: C.indigo }}>{usageSummary.issued}</div>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Đã bán</div>
              <div className="text-lg font-black mt-1" style={{ color: C.peach }}>{usageSummary.sold}</div>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Đã sử dụng</div>
              <div className="text-lg font-black mt-1" style={{ color: C.teal }}>{usageSummary.used}</div>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Còn lại</div>
              <div className="text-lg font-black mt-1" style={{ color: "#B45309" }}>{usageSummary.remaining}</div>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Tỷ lệ sử dụng</div>
              <div className="text-lg font-black mt-1" style={{ color: C.indigo }}>{usageSummary.usageRate}%</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-card rounded-2xl p-5 shadow-sm">
              <h3 className="font-black mb-4" style={{ color: C.indigo }}>Doanh thu theo ngày</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8A8DA8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} />
                  <Tooltip formatter={(value: number) => [fmt(value), "Doanh thu"]} />
                  <Line type="monotone" dataKey="revenue" stroke={C.peach} strokeWidth={3} dot={{ fill: C.peach, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-2xl p-5 shadow-sm">
              <h3 className="font-black mb-4" style={{ color: C.indigo }}>Hiệu suất theo voucher</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={voucherStats.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8A8DA8" }} interval={0} angle={-20} height={60} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} />
                  <Tooltip />
                  <Bar dataKey="sold_quantity" name="Đã bán" fill={C.peach} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="used_quantity" name="Đã dùng" fill={C.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: "#F0EDD8" }}>
              <h3 className="font-black" style={{ color: C.indigo }}>Chi tiết chương trình voucher</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: C.eggshell }}>
                    {[
                      "Voucher",
                      "Phát hành",
                        "Còn lại",
                      "Đã bán",
                      "Đã dùng",
                      "Tỷ lệ sử dụng",
                    ].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-bold" style={{ color: C.indigo }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {voucherStats.map((item) => (
                    <tr key={item.voucher_product_id} className="border-t" style={{ borderColor: "#F0EDD8" }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: C.indigo }}>{item.name}</td>
                      <td className="px-4 py-3">{item.total_quantity}</td>
                      <td className="px-4 py-3">{item.remaining_quantity}</td>
                      <td className="px-4 py-3">{item.sold_quantity}</td>
                      <td className="px-4 py-3">{item.used_quantity}</td>
                      <td className="px-4 py-3">{voucherUsageRate(item)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
