import { useEffect, useState } from "react"
import { Plus, Edit, FileEdit } from "lucide-react"
import { C, fmt, fmtDate, statusColor, STATUS_LABEL } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { StatusBadge } from "@/components/StatusBadge"
import type { Voucher } from "@/types"
import { voucherService } from "@/services/voucherService"

interface Props {
  partnerId?: string
  onCreateNew: () => void
  onEdit: (v: Voucher) => void
  onDetail: (v: Voucher) => void
  sessionDrafts?: Voucher[]
  onEditDraft?: (v: Voucher) => void
}

type FilterTab = "all" | "active" | "draft" | "pending" | "other"

const TAB_LABELS: Record<FilterTab, string> = {
  all: "Tất cả", active: "Đang hoạt động", draft: "Bản nháp", pending: "Chờ duyệt", other: "Khác",
}

export function PartnerVouchersPage({ partnerId, onCreateNew, onEdit, onDetail, sessionDrafts = [], onEditDraft }: Props) {
  const [tab, setTab] = useState<FilterTab>("all")
  const [baseVouchers, setBaseVouchers] = useState<Voucher[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadVouchers() {
      if (!partnerId) {
        if (!isMounted) return
        setBaseVouchers([])
        return
      }

      try {
        const items = await voucherService.listPublicVouchers({ limit: 100, partnerId })
        if (!isMounted) return
        setBaseVouchers(items)
      } catch {
        if (!isMounted) return
        setBaseVouchers([])
      }
    }

    loadVouchers()
    return () => {
      isMounted = false
    }
  }, [partnerId])

  const allVouchers: Voucher[] = [...sessionDrafts, ...baseVouchers]

  const visibleVouchers = tab === "all"
    ? allVouchers
    : tab === "draft"
    ? allVouchers.filter((v) => v.status === "draft")
    : tab === "active"
    ? allVouchers.filter((v) => v.status === "active")
    : tab === "pending"
    ? allVouchers.filter((v) => v.status === "pending")
    : allVouchers.filter((v) => !["draft", "active", "pending"].includes(v.status))

  const draftCount = allVouchers.filter((v) => v.status === "draft").length
  const pendingCount = allVouchers.filter((v) => v.status === "pending").length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-black text-lg" style={{ color: C.indigo }}>Danh sách voucher</h2>
          <p className="text-sm mt-0.5" style={{ color: "#8A8DA8" }}>{allVouchers.length} voucher</p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-white text-sm"
          style={{ backgroundColor: C.peach }}
        >
          <Plus className="w-4 h-4" /> Tạo mới
        </button>
      </div>

      {/* Draft / Pending alerts */}
      {draftCount > 0 && (
        <div
          className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold"
          style={{ backgroundColor: C.apricot + "25", color: "#6B4F00" }}
          onClick={() => setTab("draft")}
        >
          <AppIcon name="document" className="w-4 h-4" />
          <span>
            {draftCount} voucher đang ở trạng thái <strong>Bản nháp</strong> — chưa được gửi duyệt.
          </span>
          <span className="ml-auto text-xs underline">Xem nháp →</span>
        </div>
      )}
      {pendingCount > 0 && (
        <div
          className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "#FFF3CD", color: "#856404" }}
        >
          <span className="text-base">⏳</span>
          <span>{pendingCount} voucher đang chờ quản trị viên phê duyệt.</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(Object.keys(TAB_LABELS) as FilterTab[]).map((t) => {
          const count = t === "all" ? allVouchers.length
            : t === "draft" ? draftCount
            : t === "active" ? allVouchers.filter((v) => v.status === "active").length
            : t === "pending" ? pendingCount
            : allVouchers.filter((v) => !["draft", "active", "pending"].includes(v.status)).length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
              style={{
                backgroundColor: tab === t ? C.indigo : "white",
                color: tab === t ? "white" : C.indigo,
                borderColor: tab === t ? C.indigo : "#E2DFC8",
              }}
            >
              {TAB_LABELS[t]}
              {count > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: tab === t ? "rgba(255,255,255,0.25)" : C.indigo + "12",
                    color: tab === t ? "white" : C.indigo,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.eggshell }}>
                {["Tên voucher", "Loại giảm", "Giá bán", "Đã bán/Tổng", "Hạn dùng", "Trạng thái", ""].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleVouchers.map((v) => {
                const isDraft = v.status === "draft"
                return (
                  <tr
                    key={v.id}
                    onClick={() => !isDraft && onDetail(v)}
                    className="border-t transition-colors"
                    style={{
                      borderColor: "#F0EDD8",
                      cursor: isDraft ? "default" : "pointer",
                      backgroundColor: isDraft ? C.apricot + "08" : undefined,
                    }}
                    onMouseEnter={(e) => { if (!isDraft) e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.02)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isDraft ? C.apricot + "08" : "" }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-xs" style={{ color: isDraft ? "#8A8DA8" : C.indigo }}>
                        {v.title}
                        {isDraft && <span className="ml-1 text-xs" style={{ color: "#8A8DA8" }}>(nháp)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {v.discountType === "percent" ? `Giảm ${v.discount}%` : `Giảm ${fmt(v.discount)}`}
                    </td>
                    <td className="px-4 py-3 font-bold text-xs" style={{ color: isDraft ? "#8A8DA8" : C.peach }}>
                      {v.price > 0 ? fmt(v.price) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {isDraft ? (
                        <span className="text-xs" style={{ color: "#8A8DA8" }}>—</span>
                      ) : (
                        <>
                          <div className="text-xs font-semibold" style={{ color: C.indigo }}>{v.sold}/{v.quantity}</div>
                          <div className="w-20 h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(v.sold / v.quantity) * 100}%`, backgroundColor: C.teal }} />
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {v.validTo ? fmtDate(v.validTo) : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {isDraft ? (
                        <button
                          onClick={() => (onEditDraft ?? onEdit)(v)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors"
                          style={{ backgroundColor: C.apricot + "25", color: "#6B4F00" }}
                          title="Tiếp tục chỉnh sửa bản nháp"
                        >
                          <FileEdit className="w-3 h-3" /> Tiếp tục
                        </button>
                      ) : (
                        <button onClick={() => onEdit(v)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Chỉnh sửa">
                          <Edit className="w-3.5 h-3.5" style={{ color: "#8A8DA8" }} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visibleVouchers.length === 0 && (
            <div className="text-center py-12">
              <AppIcon name="document" className="w-8 h-8 mb-2 mx-auto" />
              <div className="font-bold text-sm" style={{ color: C.indigo }}>Không có voucher nào</div>
              <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Thử chọn tab khác hoặc tạo voucher mới</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
