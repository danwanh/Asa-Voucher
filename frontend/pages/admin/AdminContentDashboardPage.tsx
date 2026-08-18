import { useEffect, useId, useState, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { FileText, Tag, Image, Bell, CheckCircle2, XCircle, Clock, RefreshCw, Calendar } from "lucide-react"
import { C } from "@/utils/constants"
import { dashboardService, type ContentDashboardStats } from "@/services/dashboardService"

/** FC-ADC-DASHBOARD: Dashboard nội dung cho admin_content
 *  - Thống kê voucher theo trạng thái duyệt
 *  - Thống kê nội dung CMS đang active
 *  - Bộ lọc thời gian (from_date, to_date)
 *  - BR-ADM-06: KHÔNG hiển thị doanh thu, đơn hàng, tài khoản
 */

type LoadingState = "idle" | "loading" | "success" | "error"
type RangeMode = "recent" | "all" | "custom"

export function AdminContentDashboardPage() {
  const uid = useId().replace(/:/g, "")
  const [stats, setStats] = useState<ContentDashboardStats | null>(null)
  const [loadingState, setLoadingState] = useState<LoadingState>("idle")
  const [rangeMode, setRangeMode] = useState<RangeMode>("recent")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const fetchStats = useCallback(async () => {
    setLoadingState("loading")
    try {
      const data = await dashboardService.getContentStats({
        all_time: rangeMode === "all" || undefined,
        from_date: rangeMode === "custom" ? fromDate || undefined : undefined,
        to_date: rangeMode === "custom" ? toDate || undefined : undefined,
      })
      setStats(data)
      setLoadingState("success")
    } catch {
      setLoadingState("error")
    }
  }, [fromDate, rangeMode, toDate])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const pending = stats?.vouchers.pending ?? 0
  const approved = stats?.vouchers.approved ?? 0
  const rejected = stats?.vouchers.rejected ?? 0
  const totalContents = stats
    ? stats.contents.banners + stats.contents.articles + stats.contents.popups + stats.contents.policies + stats.contents.categories
    : 0
  const dateRangeHint = rangeMode === "all"
    ? "Đang xem: tất cả thời gian"
    : rangeMode === "custom" && (fromDate || toDate)
      ? "Đang lọc theo khoảng ngày đã chọn"
      : "30 ngày gần nhất"
  const rangeOptions: { mode: RangeMode; label: string }[] = [
    { mode: "recent", label: "30 ngày" },
    { mode: "all", label: "Tất cả" },
    { mode: "custom", label: "Tùy chỉnh" },
  ]

  const kpis = [
    { label: "Voucher chờ duyệt", value: pending, icon: <Clock className="w-5 h-5" />, color: C.apricot, delta: "Cần xử lý" },
    { label: "Voucher đã duyệt", value: approved, icon: <CheckCircle2 className="w-5 h-5" />, color: C.teal, delta: "Đã qua kiểm duyệt" },
    { label: "Voucher từ chối", value: rejected, icon: <XCircle className="w-5 h-5" />, color: C.peach, delta: "Đã phản hồi" },
    { label: "Nội dung active", value: totalContents, icon: <FileText className="w-5 h-5" />, color: C.indigo, delta: "Banner + bài viết" },
  ]

  const contentTypeData = stats
    ? [
        { name: "Banner", value: stats.contents.banners, color: C.peach },
        { name: "Bài viết", value: stats.contents.articles, color: C.teal },
        { name: "Popup", value: stats.contents.popups, color: C.apricot },
        { name: "Chính sách", value: stats.contents.policies, color: C.indigo },
        { name: "Danh mục", value: stats.contents.categories, color: C.muted },
      ].filter((item) => item.value > 0)
    : []

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Dashboard Nội dung</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Thống kê voucher chờ duyệt và nội dung hiển thị trên hệ thống</p>
        </div>

        {/* Bộ lọc thời gian */}
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl bg-white p-1 shadow-sm border border-gray-100">
              {rangeOptions.map((option) => {
                const active = rangeMode === option.mode
                return (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => setRangeMode(option.mode)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={active ? { backgroundColor: C.teal, color: "white" } : { color: "#8A8DA8" }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            <button
              onClick={fetchStats}
              disabled={loadingState === "loading"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: C.teal }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingState === "loading" ? "animate-spin" : ""}`} />
              Tải lại
            </button>
          </div>
          {rangeMode === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
                <Calendar className="w-4 h-4" style={{ color: C.indigo }} />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-xs outline-none bg-transparent"
                  style={{ color: C.indigo }}
                />
              </div>
              <span className="text-xs" style={{ color: "#8A8DA8" }}>đến</span>
              <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-xs outline-none bg-transparent"
                  style={{ color: C.indigo }}
                />
              </div>
            </div>
          )}
          <p className="text-xs" style={{ color: "#8A8DA8" }}>{dateRangeHint}</p>
        </div>
      </div>

      {/* Loading skeleton */}
      {loadingState === "loading" && !stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
              <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-2 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {loadingState === "error" && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center mb-6">
          <XCircle className="w-10 h-10 mx-auto mb-3" style={{ color: C.peach }} />
          <p className="text-sm font-semibold" style={{ color: C.indigo }}>Không thể tải dữ liệu dashboard</p>
          <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Vui lòng kiểm tra kết nối và thử lại</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ backgroundColor: C.teal }}
          >
            <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
            Thử lại
          </button>
        </div>
      )}

      {/* KPIs */}
      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>{k.label}</p>
                    <p className="text-3xl font-black mt-1" style={{ color: C.indigo }}>{k.value}</p>
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

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-5 mb-5">
            {/* Voucher stats bar */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-black mb-1" style={{ color: C.indigo }}>Thống kê Voucher theo trạng thái</h3>
              <p className="text-xs mb-4" style={{ color: "#8A8DA8" }}>Phân bố voucher pending / approved / rejected</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { name: "Chờ duyệt", count: pending },
                    { name: "Đã duyệt", count: approved },
                    { name: "Từ chối", count: rejected },
                  ]}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                  <Bar dataKey="count" name="Số lượng" fill={C.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Content type distribution */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-black mb-4" style={{ color: C.indigo }}>Phân loại nội dung</h3>
              {contentTypeData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={contentTypeData} cx="50%" cy="50%" innerRadius={38} outerRadius={65} dataKey="value" paddingAngle={3}>
                        {contentTypeData.map((e) => <Cell key={`cell-${e.name}`} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} formatter={(v: number) => [`${v} mục`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {contentTypeData.map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                          <span style={{ color: "#6B7280" }}>{c.name}</span>
                        </div>
                        <span className="font-bold" style={{ color: C.indigo }}>{c.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-xs" style={{ color: "#8A8DA8" }}>Không có nội dung active</div>
              )}
            </div>
          </div>

          {/* Summary table */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-black mb-4" style={{ color: C.indigo }}>Tóm tắt số liệu</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#FAFAF7" }}>
                <p className="text-xs" style={{ color: "#8A8DA8" }}>Banner đang bật</p>
                <p className="text-xl font-black mt-1" style={{ color: C.peach }}>{stats.contents.banners}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#FAFAF7" }}>
                <p className="text-xs" style={{ color: "#8A8DA8" }}>Bài viết hiển thị</p>
                <p className="text-xl font-black mt-1" style={{ color: C.teal }}>{stats.contents.articles}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#FAFAF7" }}>
                <p className="text-xs" style={{ color: "#8A8DA8" }}>Popup đang active</p>
                <p className="text-xl font-black mt-1" style={{ color: C.apricot }}>{stats.contents.popups}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#FAFAF7" }}>
                <p className="text-xs" style={{ color: "#8A8DA8" }}>Chính sách</p>
                <p className="text-xl font-black mt-1" style={{ color: C.indigo }}>{stats.contents.policies}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#FAFAF7" }}>
                <p className="text-xs" style={{ color: "#8A8DA8" }}>Danh mục</p>
                <p className="text-xl font-black mt-1" style={{ color: C.muted }}>{stats.contents.categories}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#FAFAF7" }}>
                <p className="text-xs" style={{ color: "#8A8DA8" }}>Tổng nội dung</p>
                <p className="text-xl font-black mt-1" style={{ color: C.indigo }}>{totalContents}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
