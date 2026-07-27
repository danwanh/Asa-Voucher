import { useState } from "react"
import { Search, MoreVertical } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"
import { StatusBadge } from "@/components/StatusBadge"
import { USERS } from "@/data/mock"

export function UserManagementPage() {
  const [search, setSearch] = useState("")

  const filtered = USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-black text-lg" style={{ color: C.indigo }}>
          Quản lý người dùng ({USERS.length})
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border text-sm outline-none"
            style={{ borderColor: "#E2DFC8", backgroundColor: "white" }}
            placeholder="Tìm người dùng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.eggshell }}>
                {["Họ tên", "Email", "SĐT", "Vai trò", "Đơn hàng", "Tham gia", "Trạng thái", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t hover:bg-muted/30 transition-colors" style={{ borderColor: "#F0EDD8" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: u.role === "admin" ? C.peach : C.teal, color: "white" }}
                      >
                        {u.name[0]}
                      </div>
                      <span className="font-semibold text-xs" style={{ color: C.indigo }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8", fontFamily: "'Inter', sans-serif" }}>{u.email}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{u.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: u.role === "admin" ? C.peach + "15" : C.teal + "15",
                        color: u.role === "admin" ? C.peach : C.teal,
                      }}
                    >
                      {u.role === "admin" ? "Quản trị" : "Khách hàng"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-center" style={{ color: C.indigo }}>{u.orders}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{fmtDate(u.joinDate)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status === "active" ? "active" : "cancelled"} />
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 rounded-lg hover:bg-muted">
                      <MoreVertical className="w-3.5 h-3.5" style={{ color: "#8A8DA8" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
