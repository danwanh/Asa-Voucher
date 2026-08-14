import { useEffect, useMemo, useState } from "react";
import { Filter, Loader2, RefreshCcw } from "lucide-react";
import { reportService } from "@/services/reportService";
import type { StaffVoucherReportItem } from "@/types";
import { C, fmt } from "@/utils/constants";
import { LoadingState } from "@/components/LoadingState";

interface Filters {
  date_from: string;
  date_to: string;
  category_id: string;
}

export function StaffVoucherReportPage() {
  const [filters, setFilters] = useState<Filters>({
    date_from: "",
    date_to: "",
    category_id: "",
  });

  const [data, setData] = useState<StaffVoucherReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await reportService.getStaffVoucherReport(filters);
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
  }, [filters]);

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const summary = useMemo(() => {
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const totalSold = data.reduce((sum, item) => sum + item.sold_quantity, 0);
    const totalUsed = data.reduce((sum, item) => sum + item.used_quantity, 0);
    const avgUsageRate =
      totalSold > 0
        ? Number(((totalUsed / totalSold) * 100).toFixed(1))
        : 0;
    return { totalRevenue, totalSold, totalUsed, avgUsageRate };
  }, [data]);

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
              Mã danh mục
            </label>
            <input
              type="text"
              placeholder="Nhập ID danh mục..."
              value={filters.category_id}
              onChange={(e) =>
                handleFilterChange("category_id", e.target.value)
              }
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: "#E2DFC8" }}
            />
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
      {!isLoading && !error && data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm font-semibold" style={{ color: "#8A8DA8" }}>
            Không có dữ liệu phù hợp
          </p>
          <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>
            Thử chỉnh lại bộ lọc hoặc tạo voucher mới
          </p>
        </div>
      )}

      {/* ═══ SUMMARY CARDS & TABLE ═══ */}
      {!isLoading && !error && data.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className="bg-white rounded-2xl p-4 shadow-sm border"
              style={{ borderColor: "#E2DFC8" }}
            >
              <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                Tổng doanh thu
              </p>
              <p
                className="text-lg font-black mt-1"
                style={{ color: C.indigo }}
              >
                {fmt(summary.totalRevenue)}
              </p>
            </div>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm border"
              style={{ borderColor: "#E2DFC8" }}
            >
              <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                Tổng lượt bán
              </p>
              <p
                className="text-lg font-black mt-1"
                style={{ color: C.indigo }}
              >
                {summary.totalSold}
              </p>
            </div>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm border"
              style={{ borderColor: "#E2DFC8" }}
            >
              <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                Đã sử dụng
              </p>
              <p
                className="text-lg font-black mt-1"
                style={{ color: C.indigo }}
              >
                {summary.totalUsed}
              </p>
            </div>
            <div
              className="bg-white rounded-2xl p-4 shadow-sm border"
              style={{ borderColor: "#E2DFC8" }}
            >
              <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>
                Tỷ lệ sử dụng TB
              </p>
              <p
                className="text-lg font-black mt-1"
                style={{ color: C.indigo }}
              >
                {summary.avgUsageRate}%
              </p>
            </div>
          </div>

          {/* BẢNG DỮ LIỆU */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border" style={{ borderColor: "#E2DFC8" }}>
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
                  <th className="px-4 py-3 text-left font-semibold text-xs">Hiệu quả</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.voucher_product_id} className="border-t" style={{ borderColor: "#F0EDD8" }}>
                    <td className="px-4 py-3 font-semibold">{item.program_name}</td>
                    <td className="px-4 py-3">{item.category_name}</td>
                    <td className="px-4 py-3">{item.total_quantity}</td>
                    <td className="px-4 py-3">{item.sold_quantity}</td>
                    <td className="px-4 py-3">{item.used_quantity}</td>
                    <td className="px-4 py-3">{item.usage_rate}%</td>
                    <td className="px-4 py-3 font-medium">{fmt(item.revenue)}</td>
                    <td className="px-4 py-3 font-bold">{item.effectiveness_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
