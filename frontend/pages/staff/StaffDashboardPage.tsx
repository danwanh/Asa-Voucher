import { CheckCircle, XCircle, QrCode, Users } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"

const RECENT: { code: string; name: string; customer: string; time: string; status: "valid" | "invalid" | "used" }[] = [
  { code: "ASA-ABC123", name: "Pizza Hut Set 2 người", customer: "Nguyễn Thị Mai", time: "2024-08-01T09:15:00", status: "valid" },
  { code: "ASA-DEF456", name: "CGV 2 vé phim", customer: "Trần Văn Nam", time: "2024-08-01T09:05:00", status: "used" },
  { code: "ASA-XYZ789", name: "Calla Spa Basic", customer: "Lê Thị Hoa", time: "2024-08-01T08:45:00", status: "invalid" },
  { code: "ASA-QQQ111", name: "Pizza Hut Set 4 người", customer: "Phạm Tuấn Anh", time: "2024-08-01T08:30:00", status: "valid" },
]

const KPI = [
  { label: "Voucher kiểm tra hôm nay", value: "24", icon: <QrCode className="w-5 h-5" />, color: C.indigo },
  { label: "Voucher đã xác nhận", value: "18", icon: <CheckCircle className="w-5 h-5" />, color: C.teal },
  { label: "Voucher không hợp lệ", value: "3", icon: <XCircle className="w-5 h-5" />, color: C.peach },
  { label: "Lượt khách hôm nay", value: "21", icon: <Users className="w-5 h-5" />, color: "#7C3AED" },
]

export function StaffDashboardPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Tổng quan hôm nay</h1>
        <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Chi nhánh Nguyễn Trãi — {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {KPI.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: k.color + "15", color: k.color }}>
              {k.icon}
            </div>
            <div className="text-3xl font-black" style={{ color: C.indigo }}>{k.value}</div>
            <div className="text-xs mt-1 leading-tight" style={{ color: "#8A8DA8" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: "#F0EDD8" }}>
          <h2 className="font-black" style={{ color: C.indigo }}>Xác nhận gần đây</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: C.eggshell }}>
              {["Mã Voucher", "Tên Voucher", "Khách hàng", "Thời gian", "Kết quả"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT.map((r) => (
              <tr key={r.code} className="border-t hover:bg-muted/20" style={{ borderColor: "#F0EDD8" }}>
                <td className="px-4 py-3"><code className="text-xs font-bold" style={{ color: C.indigo, fontFamily: "'Inter', monospace" }}>{r.code}</code></td>
                <td className="px-4 py-3 text-xs" style={{ color: C.indigo }}>{r.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{r.customer}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                  {new Date(r.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                    backgroundColor: r.status === "valid" ? "#E8F5EE" : r.status === "used" ? "#E0EEFF" : "#FCEAEA",
                    color: r.status === "valid" ? "#2D7A52" : r.status === "used" ? "#1A5FAD" : "#C0392B",
                  }}>
                    {r.status === "valid" ? "Hợp lệ" : r.status === "used" ? "Đã dùng" : "Không hợp lệ"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
