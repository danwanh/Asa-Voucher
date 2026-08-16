import { useEffect, useMemo, useState } from "react";
import { Filter, Info, RefreshCcw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { reportService } from "@/services/reportService";
import { voucherService, type BackendCategory } from "@/services/voucherService";
import type { StaffVoucherReportItem } from "@/types";
import { C, fmt } from "@/utils/constants";
import { LoadingState } from "@/components/LoadingState";

interface Filters {
  date_from: string;
  date_to: string;
  category_id: string;
}

const CHART_COLORS = [
  C.peach,
  C.teal,
  C.indigo,
  C.apricot,
  C.indigoLight,
  "#C9A227",
  "#8A5A44",
  "#6B7280",
];

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function StaffVoucherReportPage() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [filters, setFilters] = useState<Filters>({
    date_from: toYMD(monthStart),
    date_to: toYMD(today),
    category_id: "",
  });

  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [data, setData] = useState<StaffVoucherReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    voucherService
      .listCategories()
      .then((items) => {
        if (isMounted) setCategories(items);
      })
      .catch(() => {
        if (isMounted) setCategories([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const dateError = useMemo(() => {
    if (!filters.date_from || !filters.date_to) return "";
    return filters.date_from > filters.date_to
      ? "Khoảng thời gian không hợp lệ. Vui lòng chọn lại."
      : "";
  }, [filters.date_from, filters.date_to]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      if (dateError) {
        if (isMounted) {
          setData([]);
          setIsLoading(false);
          setError(dateError);
        }
        return;
      }

      try {
        const params = {
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          category_id: filters.category_id || undefined,
        }
        const result = await reportService.getStaffVoucherReport(params);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted)
          setError("Không thể tải báo cáo. Vui lòng thử lại sau ít phút.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [filters, dateError]);

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const sortedData = useMemo(
    () => [...data].sort((a, b) => b.revenue - a.revenue),
    [data],
  );

  const summary = useMemo(() => {
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const totalIssued = data.reduce(
      (sum, item) => sum + item.total_quantity,
      0,
    );
    const totalSold = data.reduce((sum, item) => sum + item.sold_quantity, 0);
    const totalUsed = data.reduce((sum, item) => sum + item.used_quantity, 0);
    const avgUsageRate =
      totalSold > 0 ? Number(((totalUsed / totalSold) * 100).toFixed(1)) : 0;
    const avgEffectiveness =
      data.length > 0
        ? Math.round(
            data.reduce((sum, item) => sum + item.effectiveness_score, 0) /
              data.length,
          )
        : 0;
    return { totalRevenue, totalIssued, totalSold, totalUsed, avgUsageRate, avgEffectiveness };
  }, [data]);

  const revenueChart = useMemo(
    () =>
      sortedData.slice(0, 10).map((item) => ({
        name: item.program_name,
        revenue: item.revenue,
      })),
    [sortedData],
  );

  const performanceChart = useMemo(
    () =>
      sortedData.slice(0, 10).map((item) => ({
        name: item.program_name,
        sold: item.sold_quantity,
        used: item.used_quantity,
      })),
    [sortedData],
  );

  const effectivenessChart = useMemo(
    () =>
      sortedData.slice(0, 10).map((item) => ({
        name: item.program_name,
        effectiveness: item.effectiveness_score,
      })),
    [sortedData],
  );

  const revenueShare = useMemo(() => {
    const top = sortedData
      .slice(0, 7)
      .map((item) => ({ name: item.program_name, value: item.revenue }));
    const rest = sortedData.slice(7);
    if (rest.length > 0) {
      top.push({
        name: "Khác",
        value: rest.reduce((sum, item) => sum + item.revenue, 0),
      });
    }
    return top.filter((item) => item.value > 0);
  }, [sortedData]);

  const hasReportData = data.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black" style={{ color: C.indigo }}>
          Báo cáo hiệu suất Voucher
        </h2>
      </div>

      {/* ═══ FILTER BAR ═══ */}
      <div
        className="bg-white rounded-2xl p-4 border shadow-sm"
        style={{ borderColor: "#E2DFC8" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4" style={{ color: C.indigo }} />
          <span className="text-sm font-bold" style={{ color: C.indigo }}>
            Bộ lọc báo cáo
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {/* Từ ngày */}
          <div>
            <label
              className="block text-xs font-semibold mb-1"
              style={{ color: "#8A8DA8" }}
            >
              Từ ngày
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange("date_from", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#E2DFC8" }}
            />
          </div>
          {/* Đến ngày */}
          <div>
            <label
              className="block text-xs font-semibold mb-1"
              style={{ color: "#8A8DA8" }}
            >
              Đến ngày
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange("date_to", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#E2DFC8" }}
            />
          </div>
          {/* Danh mục */}
          <div>
            <label
              className="block text-xs font-semibold mb-1"
              style={{ color: "#8A8DA8" }}
            >
              Danh mục
            </label>
            <select
              value={filters.category_id}
              onChange={(e) =>
                handleFilterChange("category_id", e.target.value)
              }
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none bg-white"
              style={{ borderColor: "#E2DFC8" }}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ═══ ERROR STATE ═══ */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 rounded-2xl"
          style={{ backgroundColor: "#FEE2E2" }}
        >
          <RefreshCcw className="w-5 h-5" style={{ color: "#B91C1C" }} />
          <span className="text-sm font-semibold" style={{ color: "#B91C1C" }}>
            {error}
          </span>
        </div>
      )}

      {/* ═══ LOADING STATE ═══ */}
      {isLoading && (
        <LoadingState label="Đang tải báo cáo..." variant="section" size="sm" />
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!isLoading && !error && !hasReportData && (
        <div className="text-center py-12">
          <p className="text-sm font-semibold" style={{ color: "#8A8DA8" }}>
            Không có dữ liệu phù hợp
          </p>
          <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>
            Thử chỉnh lại bộ lọc hoặc tạo voucher mới
          </p>
        </div>
      )}

      {/* ═══ SUMMARY CARDS & CHARTS & TABLE ═══ */}
      {!isLoading && !error && hasReportData && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: "#E2DFC8" }}>
              <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                Tổng doanh thu
              </p>
              <p className="text-lg font-black mt-1" style={{ color: C.peach }}>
                {fmt(summary.totalRevenue)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: "#E2DFC8" }}>
              <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                Tổng phát hành
              </p>
              <p className="text-lg font-black mt-1" style={{ color: C.indigo }}>
                {summary.totalIssued}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: "#E2DFC8" }}>
              <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                Tổng lượt bán
              </p>
              <p className="text-lg font-black mt-1" style={{ color: C.indigo }}>
                {summary.totalSold}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: "#E2DFC8" }}>
              <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                Đã sử dụng
              </p>
              <p className="text-lg font-black mt-1" style={{ color: C.teal }}>
                {summary.totalUsed}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: "#E2DFC8" }}>
              <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                Tỷ lệ sử dụng TB
              </p>
              <p className="text-lg font-black mt-1" style={{ color: C.indigo }}>
                {summary.avgUsageRate}%
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: "#E2DFC8" }}>
              <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                Hiệu quả TB
              </p>
              <p className="text-lg font-black mt-1" style={{ color: C.teal }}>
                {fmt(summary.avgEffectiveness)}
              </p>
            </div>
          </div>

          {/* ═══ BIỂU ĐỒ ═══ */}
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Donut: cơ cấu doanh thu */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: "#E2DFC8" }}>
              <h3 className="font-black mb-4" style={{ color: C.indigo }}>
                Cơ cấu doanh thu theo chương trình
              </h3>
              {revenueShare.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={revenueShare}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={2}
                      >
                        {revenueShare.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [fmt(value), "Doanh thu"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {revenueShare.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        <span style={{ color: "#8A8DA8" }}>
                          {entry.name} · {fmt(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm" style={{ color: "#8A8DA8" }}>
                  Chưa có doanh thu trong kỳ
                </p>
              )}
            </div>

            {/* Bar: số lượng bán vs sử dụng */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: "#E2DFC8" }}>
              <h3 className="font-black mb-4" style={{ color: C.indigo }}>
                Số lượng bán - sử dụng theo chương trình
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={performanceChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8A8DA8" }} interval={0} angle={-20} height={60} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sold" name="Đã bán" fill={C.peach} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="used" name="Đã dùng" fill={C.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar: doanh thu theo chương trình */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: "#E2DFC8" }}>
              <h3 className="font-black mb-4" style={{ color: C.indigo }}>
                Doanh thu theo chương trình
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8A8DA8" }} interval={0} angle={-20} height={60} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} />
                  <Tooltip formatter={(value: number) => [fmt(value), "Doanh thu"]} />
                  <Bar dataKey="revenue" name="Doanh thu" fill={C.peach} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar: điểm hiệu quả */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border" style={{ borderColor: "#E2DFC8" }}>
              <h3 className="font-black mb-4 flex items-center gap-1.5" style={{ color: C.indigo }}>
                Điểm hiệu quả theo chương trình
                <span
                  title="Hiệu quả = Doanh thu × Tỷ lệ sử dụng (%) ÷ 100"
                  className="inline-flex"
                >
                  <Info
                    className="w-4 h-4"
                    style={{ color: "#8A8DA8" }}
                  />
                </span>
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={effectivenessChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8A8DA8" }} interval={0} angle={-20} height={60} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} />
                  <Tooltip formatter={(value: number) => [fmt(value), "Hiệu quả"]} />
                  <Bar dataKey="effectiveness" name="Hiệu quả" fill={C.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ═══ BẢNG DỮ LIỆU ═══ */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border" style={{ borderColor: "#E2DFC8" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#F0EDD8" }}>
              <h3 className="font-black" style={{ color: C.indigo }}>
                Chi tiết theo chương trình voucher
              </h3>
              <span className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                {sortedData.length} chương trình
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: C.eggshell }}>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Chương trình</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Danh mục</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Phát hành</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Đã bán</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Đã dùng</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Tỷ lệ SD</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Doanh thu</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">
                      <span
                          title="Hiệu quả = Doanh thu × Tỷ lệ sử dụng (%) ÷ 100"
                          className="inline-flex items-center gap-1"
                        >
                          Hiệu quả
                          <Info
                            className="w-3.5 h-3.5"
                            style={{ color: "#8A8DA8" }}
                          />
                        </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((item) => (
                    <tr key={item.voucher_product_id} className="border-t" style={{ borderColor: "#F0EDD8" }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: C.indigo }}>{item.program_name}</td>
                      <td className="px-4 py-3">{item.category_name}</td>
                      <td className="px-4 py-3">{item.total_quantity}</td>
                      <td className="px-4 py-3">{item.sold_quantity}</td>
                      <td className="px-4 py-3">{item.used_quantity}</td>
                      <td className="px-4 py-3">{item.usage_rate}%</td>
                      <td className="px-4 py-3 font-medium">{fmt(item.revenue)}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: C.teal }}>{fmt(item.effectiveness_score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}