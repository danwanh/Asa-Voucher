import { useState } from "react"
import { Search, Filter } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"

const MOCK_HISTORY = [
  { id: "vh1", voucherCode: "ASA-ABC123", voucherTitle: "Pizza Hut Set 2 người", customerName: "Nguyễn Thị Mai", branchName: "CN Nguyễn Trãi", staffName: "Trần Văn Nam", verifiedAt: "2024-08-01T09:15:00", status: "valid" },
  { id: "vh2", voucherCode: "ASA-DEF456", voucherTitle: "CGV 2 vé phim", customerName: "Trần Văn Bình", branchName: "CN Nguyễn Trãi", staffName: "Trần Văn Nam", verifiedAt: "2024-08-01T08:30:00", status: "used" },
  { id: "vh3", voucherCode: "ASA-GHI789", voucherTitle: "Calla Spa Basic", customerName: "Lê Thị Hoa", branchName: "CN Nguyễn Trãi", staffName: "Trần Văn Nam", verifiedAt: "2024-07-31T14:20:00", status: "invalid" },
  { id: "vh4", voucherCode: "ASA-JKL012", voucherTitle: "Pizza Hut Set 4 người", customerName: "Phạm Tuấn Anh", branchName: "CN Nguyễn Trãi", staffName: "Trần Văn Nam", verifiedAt: "2024-07-31T13:45:00", status: "valid" },
  { id: "vh5", voucherCode: "ASA-MNO345", voucherTitle: "CGV 1 vé phim", customerName: "Hoàng Minh Đức", branchName: "CN Nguyễn Trãi", staffName: "Lê Thị Hoa", verifiedAt: "2024-07-30T10:00:00", status: "valid" },
]

const STATUS_MAP = {
  valid: { label: "Hợp lệ", bg: "#E8F5EE", text: "#2D7A52" },
  used: { label: "Đã dùng", bg: "#E0EEFF", text: "#1A5FAD" },
  invalid: { label: "Không hợp lệ", bg: "#FCEAEA", text: "#C0392B" },
}

export function VerificationHistoryPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const filtered = MOCK_HISTORY.filter((h) => {
    const matchSearch = !search || h.voucherCode.toLowerCase().includes(search.toLowerCase()) || h.customerName.toLowerCase().includes(search.toLowerCase()) || h.voucherTitle.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || h.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo }}>Lịch sử xác nhận</h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
            <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }} placeholder="Tìm mã, tên, khách hàng..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="valid">Hợp lệ</option>
            <option value="used">Đã dùng</option>
            <option value="invalid">Không hợp lệ</option>
          </select>
          <input type="date" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Từ ngày" />
          <input type="date" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Đến ngày" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.eggshell }}>
                {["Mã Voucher", "Tên Voucher", "Khách hàng", "Chi nhánh", "Nhân viên", "Thời gian", "Kết quả"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const sc = STATUS_MAP[h.status as keyof typeof STATUS_MAP]
                return (
                  <tr key={h.id} className="border-t hover:bg-muted/20" style={{ borderColor: "#F0EDD8" }}>
                    <td className="px-4 py-3"><code className="text-xs font-bold" style={{ fontFamily: "'Inter', monospace", color: C.indigo }}>{h.voucherCode}</code></td>
                    <td className="px-4 py-3 text-xs max-w-36 truncate" style={{ color: C.indigo }}>{h.voucherTitle}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{h.customerName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{h.branchName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{h.staffName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {new Date(h.verifiedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>{sc.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <AppIcon name="document" className="w-8 h-8 mb-2 mx-auto" />
            <div className="font-bold text-sm" style={{ color: C.indigo }}>Không có lịch sử xác nhận</div>
          </div>
        )}
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: "#F0EDD8", color: "#8A8DA8" }}>
          Hiển thị {filtered.length}/{MOCK_HISTORY.length} kết quả
        </div>
      </div>
    </div>
  )
}
