import { useState, useEffect, useCallback } from "react"
import { Plus, Edit, FileEdit, Loader2, RefreshCw } from "lucide-react"
import { C, fmt, fmtDate, statusColor, STATUS_LABEL } from "@/utils/constants"
import { StatusBadge } from "@/components/StatusBadge"
import { voucherService, type PaginatedResponse } from "@/services/voucherService"
import type { VoucherProduct, Voucher } from "@/types"

interface Props {
  onCreateNew: () => void
  onEdit: (v: Voucher) => void
  onDetail: (v: Voucher) => void
  sessionDrafts?: Voucher[]
  onEditDraft?: (v: Voucher) => void
  /** Partner ID for filtering vouchers server-side */
  partnerId?: string
}

type FilterTab = "all" | "active" | "draft" | "pending" | "other"

const TAB_LABELS: Record<FilterTab, string> = {
  all: "Tất cả", active: "Đang hoạt động", draft: "Bản nháp", pending: "Chờ duyệt", other: "Khác",
}

function toVoucherFromProduct(vp: VoucherProduct): Voucher {
  return {
    id: vp.id,
    partnerId: vp.partner_id,
    partnerName: "",
    partnerLogo: "",
    title: vp.name,
    category: vp.category_id,
    discount: vp.discount_rate,
    discountType: vp.selling_price < vp.original_price ? "percent" : "fixed",
    minOrder: 0,
    price: vp.selling_price,
    originalPrice: vp.original_price,
    validFrom: vp.sale_start_date,
    validTo: vp.sale_end_date,
    quantity: vp.total_quantity,
    sold: vp.total_quantity - vp.remaining_quantity,
    status: vp.status as Voucher["status"],
    rating: 0,
    reviews: 0,
    description: vp.description ?? "",
    image: vp.thumbnail_url ?? "",
    tags: [],
  }
}

export function PartnerVouchersPage({ onCreateNew, onEdit, onDetail, sessionDrafts = [], onEditDraft, partnerId }: Props) {
  const [tab, setTab] = useState<FilterTab>("all")
  const [remoteVouchers, setRemoteVouchers] = useState<VoucherProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVouchers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res: PaginatedResponse<VoucherProduct> = await voucherService.list({
        partner_id: partnerId,
        limit: 100,
      })
      setRemoteVouchers(res.items)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải danh sách voucher"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [partnerId])

  useEffect(() => { fetchVouchers() }, [fetchVouchers])

  // Merge: session drafts + remote vouchers (converted to legacy Voucher)
  const allDrafts: Voucher[] = sessionDrafts
  const remoteAsVoucher: Voucher[] = remoteVouchers.map(toVoucherFromProduct)
  const allVouchers: Voucher[] = [...allDrafts, ...remoteAsVoucher]

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
          <p className="text-sm mt-0.5" style={{ color: "#8A8DA8" }}>
            {loading ? "Đang tải..." : `${allVouchers.length} voucher`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchVouchers}
            disabled={loading}
            className="p-2.5 rounded-xl border-2 transition-all hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: "#E2DFC8", color: C.indigo }}
            title="Tải lại"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-white text-sm"
            style={{ backgroundColor: C.peach }}
          >
            <Plus className="w-4 h-4" /> Tạo mới
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.peach }} />
          <span className="ml-2 text-sm" style={{ color: "#8A8DA8" }}>Đang tải voucher...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}>
          <span>⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={fetchVouchers} className="text-xs underline font-bold">Thử lại</button>
        </div>
      )}

      {/* Content (only show when not loading) */}
      {!loading && !error && (
        <>
          {/* Draft / Pending alerts */}
          {draftCount > 0 && (
            <div
              className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold"
              style={{ backgroundColor: C.apricot + "25", color: "#6B4F00" }}
              onClick={() => setTab("draft")}
            >
              <span className="text-base">📋</span>
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
                  <div className="text-3xl mb-2">📄</div>
                  <div className="font-bold text-sm" style={{ color: C.indigo }}>Không có voucher nào</div>
                  <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Thử chọn tab khác hoặc tạo voucher mới</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
