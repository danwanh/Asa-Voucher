import { MapPin, Store } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"
import { StatusBadge } from "@/components/StatusBadge"
import { PARTNERS } from "@/data/mock"

export function PartnerManagementPage() {
  return (
    <div className="p-6">
      <h2 className="font-black text-lg mb-5" style={{ color: C.indigo }}>
        Quản lý đối tác ({PARTNERS.length})
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PARTNERS.map((p) => (
          <div key={p.id} className="bg-card rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: C.eggshell }}>
                  {p.logo}
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: C.indigo }}>{p.name}</div>
                  <div className="text-xs" style={{ color: "#8A8DA8" }}>{p.category}</div>
                </div>
              </div>
              <StatusBadge status={p.status === "approved" ? "active" : "pending"} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mt-3">
              <div className="flex items-center gap-1" style={{ color: "#8A8DA8" }}>
                <MapPin className="w-3 h-3" />{p.address}
              </div>
              <div className="flex items-center gap-1" style={{ color: "#8A8DA8" }}>
                <Store className="w-3 h-3" />{p.branches} chi nhánh
              </div>
            </div>

            <div className="text-xs mt-2" style={{ color: "#B0B3C8" }}>
              Tham gia: {fmtDate(p.joinDate)}
            </div>

            {p.status === "pending" && (
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: C.teal }}>
                  Duyệt
                </button>
                <button className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}>
                  Từ chối
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
