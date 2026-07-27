import { useState } from "react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { Filter, FileText, Download, Loader2, CheckCircle } from "lucide-react"
import { C } from "@/utils/constants"
import { REVENUE_DATA } from "@/data/mock"

const BRANCHES = ["Tất cả chi nhánh", "Chi nhánh Nguyễn Trãi", "Chi nhánh Lê Văn Sỹ", "Chi nhánh Quận 7"]
const VOUCHERS = ["Tất cả voucher", "Pizza Hut - Mua 1 tặng 1", "Combo Family Saver", "Pizza Cá Nhân"]
const REPORT_TYPES = [
  { value: "revenue", label: "Doanh thu" },
  { value: "orders", label: "Đơn hàng" },
  { value: "vouchers", label: "Voucher bán" },
]

// Isolated chart components — each is a separate React component so Recharts
// assigns them distinct clipPath IDs from its module-level counter, preventing
// the duplicate-key SVG warning in React 18 Strict Mode.
interface ChartProps {
  data: typeof REVENUE_DATA
  dataKey: string
  yLabel: string
  reportType: string
}

function RevenueLineChart({ data, dataKey, yLabel, reportType }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F0EDD8" />
        <XAxis key="x" dataKey="month" tick={{ fontSize: 11, fill: "#8A8DA8" }} />
        <YAxis key="y" tick={{ fontSize: 11, fill: "#8A8DA8" }} />
        <Tooltip
          key="tooltip"
          contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          formatter={(v: number) => [reportType === "revenue" ? `${v}M đ` : v, yLabel]}
        />
        <Line key="line" type="monotone" dataKey={dataKey} stroke={C.peach} strokeWidth={3} dot={{ fill: C.peach, r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function RevenueBarChart({ data, dataKey, yLabel }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={18}>
        <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F0EDD8" />
        <XAxis key="x" dataKey="month" tick={{ fontSize: 11, fill: "#8A8DA8" }} />
        <YAxis key="y" tick={{ fontSize: 11, fill: "#8A8DA8" }} />
        <Tooltip key="tooltip" contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
        <Bar key="bar" dataKey={dataKey} name={yLabel} fill={C.teal} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

type ExportState = "idle" | "loading" | "done"

export function PartnerRevenuePage() {
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [branch, setBranch] = useState("Tất cả chi nhánh")
  const [voucher, setVoucher] = useState("Tất cả voucher")
  const [reportType, setReportType] = useState("revenue")
  const [showReport, setShowReport] = useState(false)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [exportState, setExportState] = useState<ExportState>("idle")
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv")

  const filteredData = REVENUE_DATA.filter((d) => {
    if (fromDate) {
      const month = parseInt(fromDate.split("-")[1] || "0", 10)
      if (d.month < month) return false
    }
    if (toDate) {
      const month = parseInt(toDate.split("-")[1] || "12", 10)
      if (d.month > month) return false
    }
    return true
  })

  const selectCls = "px-3 py-2 rounded-xl border text-sm outline-none font-semibold"
  const selectStyle = { borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo, fontFamily: "'Nunito', sans-serif" }

  const dataKey = reportType === "revenue" ? "revenue" : reportType === "orders" ? "orders" : "vouchers"
  const yLabel = reportType === "revenue" ? "Doanh thu (triệu đ)" : reportType === "orders" ? "Đơn hàng" : "Voucher bán"

  const totalRevenue = filteredData.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = filteredData.reduce((s, d) => s + d.orders, 0)
  const totalVouchers = filteredData.reduce((s, d) => s + d.vouchers, 0)
  const avgRevenue = filteredData.length > 0 ? (totalRevenue / filteredData.length).toFixed(1) : "0"

  const generateReport = () => {
    setReportGenerated(true)
    setShowReport(true)
    setExportState("idle")
    // scroll to report after a tick
    setTimeout(() => {
      const el = document.getElementById("report-preview")
      el?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  const handleExport = (fmt: "csv" | "pdf") => {
    setExportFormat(fmt)
    setExportState("loading")
    setTimeout(() => {
      setExportState("done")
      if (fmt === "csv") {
        // Generate and trigger a real CSV download
        const header = "Tháng,Doanh thu (triệu đ),Đơn hàng,Voucher bán\n"
        const rows = filteredData.map((d) => `T${d.month},${d.revenue},${d.orders},${d.vouchers}`).join("\n")
        const csv = header + rows
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `bao-cao-doanh-thu-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    }, 1500)
  }

  const hasActiveFilters = fromDate || toDate || branch !== "Tất cả chi nhánh" || voucher !== "Tất cả voucher"

  const reportTitle = () => {
    const parts = [REPORT_TYPES.find((r) => r.value === reportType)?.label ?? "Báo cáo"]
    if (branch !== "Tất cả chi nhánh") parts.push(branch)
    if (fromDate || toDate) {
      const from = fromDate ? fromDate.replace(/(\d{4})-(\d{2})/, "T$2/$1") : "Đầu kỳ"
      const to = toDate ? toDate.replace(/(\d{4})-(\d{2})/, "T$2/$1") : "Cuối kỳ"
      parts.push(`${from} → ${to}`)
    }
    return parts.join(" • ")
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-black" style={{ color: C.indigo }}>Báo cáo doanh thu</h2>
        <button
          onClick={generateReport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: C.indigo }}
        >
          <FileText className="w-4 h-4" /> Tạo báo cáo
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl p-4 border shadow-sm mb-5" style={{ borderColor: "#E2DFC8" }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4" style={{ color: C.indigo }} />
          <span className="text-sm font-bold" style={{ color: C.indigo }}>Bộ lọc báo cáo</span>
          {hasActiveFilters && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold ml-1" style={{ backgroundColor: C.peach + "15", color: C.peach }}>
              Đang lọc
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.indigo }}>Từ ngày</label>
            <input type="month" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setReportGenerated(false) }} className={selectCls + " w-full"} style={selectStyle} />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.indigo }}>Đến ngày</label>
            <input type="month" value={toDate} onChange={(e) => { setToDate(e.target.value); setReportGenerated(false) }} className={selectCls + " w-full"} style={selectStyle} />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.indigo }}>Chi nhánh</label>
            <select className={selectCls + " w-full"} style={selectStyle} value={branch} onChange={(e) => { setBranch(e.target.value); setReportGenerated(false) }}>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.indigo }}>Voucher</label>
            <select className={selectCls + " w-full"} style={selectStyle} value={voucher} onChange={(e) => { setVoucher(e.target.value); setReportGenerated(false) }}>
              {VOUCHERS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        {/* Report type tabs */}
        <div className="flex gap-2 mt-3">
          <span className="text-xs font-bold self-center mr-1" style={{ color: "#8A8DA8" }}>Loại báo cáo:</span>
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.value}
              onClick={() => { setReportType(rt.value); setReportGenerated(false) }}
              className="text-xs px-3 py-1.5 rounded-lg font-bold border transition-all"
              style={{
                borderColor: reportType === rt.value ? C.peach : "#E2DFC8",
                backgroundColor: reportType === rt.value ? C.peach + "15" : "white",
                color: reportType === rt.value ? C.peach : C.indigo,
              }}
            >
              {rt.label}
            </button>
          ))}
        </div>

        {/* Hint to generate */}
        {!reportGenerated && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: "#E2DFC8" }}>
            <span className="text-xs" style={{ color: "#8A8DA8" }}>Chọn bộ lọc xong, nhấn</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: C.indigo + "12", color: C.indigo }}>Tạo báo cáo</span>
            <span className="text-xs" style={{ color: "#8A8DA8" }}>để xem kết quả và xuất file.</span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>{yLabel} theo tháng</h3>
          <RevenueLineChart data={filteredData} dataKey={dataKey} yLabel={yLabel} reportType={reportType} />
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>So sánh theo tháng</h3>
          <RevenueBarChart data={filteredData} dataKey={dataKey} yLabel={yLabel} reportType={reportType} />
        </div>
      </div>

      {/* ── Report preview (generated) ──────────────────────────────────────── */}
      {reportGenerated && (
        <div id="report-preview" className="mt-6 bg-white rounded-2xl border-2 shadow-sm overflow-hidden" style={{ borderColor: C.indigo + "20" }}>
          {/* Report header */}
          <div className="px-6 py-4 flex items-start justify-between" style={{ backgroundColor: C.indigo }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-white/80" />
                <span className="text-xs text-white/60 font-semibold uppercase tracking-wider">Báo cáo được tạo lúc {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <h3 className="text-white font-black text-base">{reportTitle()}</h3>
              <p className="text-white/60 text-xs mt-0.5">Pizza Hut Vietnam • {filteredData.length} tháng</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {exportState === "done" ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: C.teal, color: "white" }}>
                  <CheckCircle className="w-3.5 h-3.5" /> Đã xuất {exportFormat.toUpperCase()}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => handleExport("csv")}
                    disabled={exportState === "loading"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white" }}
                  >
                    {exportState === "loading" && exportFormat === "csv"
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                    Xuất CSV
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    disabled={exportState === "loading"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                    style={{ backgroundColor: C.peach, color: "white" }}
                  >
                    {exportState === "loading" && exportFormat === "pdf"
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                    Xuất PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {/* KPI summary */}
          <div className="grid grid-cols-4 border-b" style={{ borderColor: "#F0EDD8" }}>
            {[
              { label: "Tổng doanh thu", value: `${totalRevenue}M đ`, color: C.peach },
              { label: "Tổng đơn hàng", value: totalOrders.toLocaleString("vi-VN"), color: C.teal },
              { label: "Voucher đã bán", value: totalVouchers.toLocaleString("vi-VN"), color: C.indigo },
              { label: "TB doanh thu/tháng", value: `${avgRevenue}M đ`, color: C.apricot },
            ].map((kpi) => (
              <div key={kpi.label} className="px-5 py-4 border-r last:border-r-0" style={{ borderColor: "#F0EDD8" }}>
                <div className="text-xs font-semibold mb-1" style={{ color: "#8A8DA8" }}>{kpi.label}</div>
                <div className="text-lg font-black" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Detail table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: C.eggshell }}>
                  {["Tháng", "Doanh thu", "Đơn hàng", "Voucher bán", "Tăng trưởng", "% Tổng DT"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d, i) => {
                  const prev = i > 0 ? filteredData[i - 1].revenue : d.revenue
                  const growth = i > 0 ? (((d.revenue - prev) / prev) * 100).toFixed(1) : null
                  const pct = totalRevenue > 0 ? ((d.revenue / totalRevenue) * 100).toFixed(1) : "0"
                  return (
                    <tr key={d.month} className="border-t" style={{ borderColor: "#F0EDD8" }}>
                      <td className="px-5 py-3 font-bold" style={{ color: C.indigo }}>T{d.month}/2026</td>
                      <td className="px-5 py-3 font-bold" style={{ color: C.peach }}>{d.revenue}M đ</td>
                      <td className="px-5 py-3" style={{ color: "#8A8DA8" }}>{d.orders.toLocaleString("vi-VN")}</td>
                      <td className="px-5 py-3" style={{ color: "#8A8DA8" }}>{d.vouchers.toLocaleString("vi-VN")}</td>
                      <td className="px-5 py-3">
                        {growth != null && (
                          <span className="text-xs font-bold" style={{ color: Number(growth) >= 0 ? "#2D7A52" : "#C0392B" }}>
                            {Number(growth) >= 0 ? "▲" : "▼"} {Math.abs(Number(growth))}%
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: C.peach }} />
                          </div>
                          <span className="text-xs" style={{ color: "#8A8DA8" }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredData.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: "#8A8DA8" }}>Không có dữ liệu</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: C.eggshell }}>
                  <td className="px-5 py-3 font-black text-xs" style={{ color: C.indigo }}>Tổng cộng</td>
                  <td className="px-5 py-3 font-black text-xs" style={{ color: C.peach }}>{totalRevenue}M đ</td>
                  <td className="px-5 py-3 font-bold text-xs" style={{ color: C.indigo }}>{totalOrders.toLocaleString("vi-VN")}</td>
                  <td className="px-5 py-3 font-bold text-xs" style={{ color: C.indigo }}>{totalVouchers.toLocaleString("vi-VN")}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 font-bold text-xs" style={{ color: C.indigo }}>100%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {exportState === "done" && (
            <div className="px-6 py-3 flex items-center gap-2 border-t" style={{ borderColor: "#F0EDD8", backgroundColor: C.teal + "08" }}>
              <CheckCircle className="w-4 h-4" style={{ color: C.teal }} />
              <span className="text-sm font-semibold" style={{ color: C.teal }}>
                {exportFormat === "csv"
                  ? "File CSV đã được tải về máy thành công."
                  : "File PDF đã sẵn sàng. Trong môi trường thực tế, file sẽ tự động tải về."}
              </span>
              <button
                onClick={() => setExportState("idle")}
                className="ml-auto text-xs font-bold px-3 py-1 rounded-lg"
                style={{ backgroundColor: C.teal + "15", color: C.teal }}
              >
                Xuất lại
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fallback table when report not generated */}
      {!reportGenerated && (
        <div className="mt-5 bg-card rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>
            Chi tiết theo tháng
            {hasActiveFilters && (
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: C.peach + "15", color: C.peach }}>
                Đang lọc • {filteredData.length} tháng
              </span>
            )}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: C.eggshell }}>
                  {["Tháng", "Doanh thu", "Đơn hàng", "Voucher bán", "Tăng trưởng"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d, i) => {
                  const prev = i > 0 ? filteredData[i - 1].revenue : d.revenue
                  const growth = i > 0 ? (((d.revenue - prev) / prev) * 100).toFixed(1) : null
                  return (
                    <tr key={d.month} className="border-t" style={{ borderColor: "#F0EDD8" }}>
                      <td className="px-4 py-3 font-bold" style={{ color: C.indigo }}>T{d.month}/2026</td>
                      <td className="px-4 py-3 font-bold" style={{ color: C.peach }}>{d.revenue}M đ</td>
                      <td className="px-4 py-3" style={{ color: "#8A8DA8" }}>{d.orders}</td>
                      <td className="px-4 py-3" style={{ color: "#8A8DA8" }}>{d.vouchers}</td>
                      <td className="px-4 py-3">
                        {growth != null && (
                          <span className="text-xs font-bold" style={{ color: Number(growth) >= 0 ? "#2D7A52" : "#C0392B" }}>
                            {Number(growth) >= 0 ? "+" : ""}{growth}%
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredData.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "#8A8DA8" }}>Không có dữ liệu cho khoảng thời gian đã chọn</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
