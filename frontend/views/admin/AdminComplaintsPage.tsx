import { useState, useEffect, useCallback, useRef } from "react"
import { C, fmt, fmtDate, STATUS_LABEL } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { ImageLightbox } from "@/components/ImageLightbox"
import { StatusBadge } from "@/components/StatusBadge"
import { feedbackService, type ComplaintListItem, type ComplaintDetail } from "@/services/feedbackService"

type ComplaintAction = "accept_refund" | "accept_reissue" | "reject" | "external"

const REASON_LABELS: Record<string, string> = {
  not_as_described: "Không đúng mô tả",
  cannot_redeem: "Không thể sử dụng",
  expired_early: "Hết hạn sớm",
  wrong_value: "Sai giá trị",
  other: "Khác",
}

export function AdminComplaintsPage() {
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [complaints, setComplaints] = useState<ComplaintListItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 20

  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  const [dialogAction, setDialogAction] = useState<ComplaintAction | null>(null)
  const [dialogComplaint, setDialogComplaint] = useState<ComplaintListItem | null>(null)
  const [resolutionNote, setResolutionNote] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)

  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const panelRef = useRef<HTMLDivElement>(null)

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchComplaints = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: { status?: string; search?: string; page?: number; limit?: number } = { page, limit: PAGE_SIZE }
      if (filter !== "all") params.status = filter
      if (search.trim()) params.search = search.trim()
      const result = await feedbackService.listComplaints(params)
      setComplaints(result.items)
      setCounts(result.countsByStatus)
      setTotalPages(Math.ceil(result.total / PAGE_SIZE))
      setTotal(result.total)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tải danh sách khiếu nại"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [filter, search, page])

  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) return
    setPage(1)
  }, [filter, search])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      fetchComplaints()
      return
    }
    const debounce = setTimeout(fetchComplaints, 300)
    return () => clearTimeout(debounce)
  }, [fetchComplaints])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dialogAction) closeDialog()
        else setShowPanel(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [dialogAction, actionLoading])

  const handleSelectComplaint = async (complaint: ComplaintListItem) => {
    setDetailLoading(true)
    setShowPanel(true)
    try {
      const detail = await feedbackService.getComplaintDetail(complaint.id)
      setSelectedComplaint(detail)
    } catch {
      showToast("error", "Không thể tải chi tiết khiếu nại")
      setShowPanel(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleAction = (action: ComplaintAction, complaint: ComplaintListItem) => {
    setDialogAction(action)
    setDialogComplaint(complaint)
    setResolutionNote("")
  }

  const closeDialog = () => {
    if (actionLoading) return
    setDialogAction(null)
    setDialogComplaint(null)
    setResolutionNote("")
  }

  const executeAction = async () => {
    if (!dialogAction || !dialogComplaint) return
    const complaint = dialogComplaint
    setActionLoading(true)
    try {
      if (dialogAction === "accept_refund") {
        await feedbackService.resolveComplaint(complaint.id, {
          resolutionNote: resolutionNote || "Chấp nhận hoàn tiền",
          resolutionTypes: ["refund"],
        })
        showToast("success", "Đã chấp nhận hoàn tiền cho voucher khiếu nại")
      } else if (dialogAction === "accept_reissue") {
        await feedbackService.resolveComplaint(complaint.id, {
          resolutionNote: resolutionNote || "Chấp nhận cấp lại voucher",
          resolutionTypes: ["reissue"],
        })
        showToast("success", "Đã chấp nhận cấp lại voucher khiếu nại")
      } else if (dialogAction === "reject") {
        await feedbackService.resolveComplaint(complaint.id, {
          resolutionNote: resolutionNote || "Từ chối khiếu nại",
          resolutionTypes: ["no_action"],
        })
        showToast("success", "Đã từ chối khiếu nại")
      } else if (dialogAction === "external") {
        await feedbackService.resolveComplaint(complaint.id, {
          resolutionNote: resolutionNote || "Xử lý bên ngoài - đã liên hệ đối tác",
          resolutionTypes: ["no_action"],
        })
        showToast("success", "Đã đánh dấu xử lý bên ngoài")
      }
      closeDialog()
      if (selectedComplaint) {
        const detail = await feedbackService.getComplaintDetail(selectedComplaint.id)
        setSelectedComplaint(detail)
      }
      fetchComplaints()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Thao tác thất bại"
      showToast("error", message)
    } finally {
      setActionLoading(false)
    }
  }

  const filterTabs = [
    { v: "all", l: "Tất cả", color: C.indigo },
    { v: "open", l: "Đang khiếu nại", color: "#856404" },
    { v: "contacting_partner", l: "Liên hệ đối tác", color: "#1A5FAD" },
    { v: "reissued", l: "Đã cấp lại", color: "#7C3AED" },
    { v: "refunded", l: "Đã hoàn tiền", color: "#2D7A52" },
  ]

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: C.content }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black" style={{ color: C.indigo }}>
            Quản lý khiếu nại
          </h1>
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: C.eggshell, color: C.indigo }}
          >
            {loading ? "Đang tải..." : `${complaints.length}/${total} khiếu nại`}
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {filterTabs.map(({ v, l, color }) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={{
                  backgroundColor: filter === v ? color : "transparent",
                  color: filter === v ? "white" : color,
                  border: `1.5px solid ${filter === v ? color : "#E2DFC8"}`,
                }}
              >
                {l} ({counts[v] ?? 0})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <AppIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
            <input
              type="text"
              placeholder="Tìm mã khiếu nại, tên khách hàng, mã đơn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: C.eggshell }}>
                  <th className="text-left px-5 py-3.5 font-bold text-xs uppercase tracking-wider" style={{ color: C.indigo }}>MÃ KN</th>
                  <th className="text-left px-5 py-3.5 font-bold text-xs uppercase tracking-wider" style={{ color: C.indigo }}>KHÁCH HÀNG</th>
                  <th className="text-left px-5 py-3.5 font-bold text-xs uppercase tracking-wider" style={{ color: C.indigo }}>ĐƠN HÀNG</th>
                  <th className="text-left px-5 py-3.5 font-bold text-xs uppercase tracking-wider" style={{ color: C.indigo }}>VOUCHER</th>
                  <th className="text-left px-5 py-3.5 font-bold text-xs uppercase tracking-wider" style={{ color: C.indigo }}>LÝ DO</th>
                  <th className="text-left px-5 py-3.5 font-bold text-xs uppercase tracking-wider" style={{ color: C.indigo }}>TRẠNG THÁI</th>
                  <th className="text-left px-5 py-3.5 font-bold text-xs uppercase tracking-wider" style={{ color: C.indigo }}>NGÀY TẠO</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-20 text-center" style={{ color: "#8A8DA8" }}>
                      <AppIcon name="clock" className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: C.indigo }} />
                      <div className="font-semibold text-sm">Đang tải dữ liệu...</div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="px-5 py-6">
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
                          <span>{error}</span>
                          <button onClick={fetchComplaints} className="underline font-bold ml-2">Thử lại</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : complaints.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="text-center py-20">
                        <AppIcon name="search" className="w-12 h-12 mb-4 mx-auto" style={{ color: "#D1D5DB" }} />
                        <div className="font-bold text-sm" style={{ color: C.indigo }}>Không tìm thấy khiếu nại</div>
                        <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  complaints.map((complaint) => (
                    <tr
                      key={complaint.id}
                      className="border-t cursor-pointer transition-colors hover:bg-gray-50/80 group"
                      style={{ borderColor: "#F0EDD8" }}
                      onClick={() => handleSelectComplaint(complaint)}
                    >
                      <td className="px-5 py-3.5">
                        <code className="text-xs font-semibold px-2 py-1 rounded-md" style={{ backgroundColor: C.eggshell, fontFamily: "'Inter', monospace", color: C.indigo }}>
                          {complaint.id.slice(0, 8)}...
                        </code>
                      </td>
                      <td className="px-5 py-3.5">{complaint.userName || complaint.userId}</td>
                      <td className="px-5 py-3.5">
                        <code className="text-xs font-semibold px-2 py-1 rounded-md" style={{ backgroundColor: C.eggshell, fontFamily: "'Inter', monospace", color: C.indigo }}>
                          {complaint.orderCode || "-"}
                        </code>
                      </td>
                      <td className="px-5 py-3.5">{complaint.voucherName || "-"}</td>
                      <td className="px-5 py-3.5">{REASON_LABELS[complaint.reason] || complaint.reason}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={complaint.status} />
                      </td>
                      <td className="px-5 py-3.5" style={{ color: "#8A8DA8" }}>
                        {fmtDate(complaint.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-xs" style={{ color: "#8A8DA8" }}>Trang {page}/{totalPages} · {total} khiếu nại</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-40"
                style={{ borderColor: "#E2DFC8", color: C.indigo }}
              >
                ← Trước
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-40"
                style={{ borderColor: "#E2DFC8", color: C.indigo }}
              >
                Sau →
              </button>
            </div>
          </div>
        )}

        {/* Detail Panel */}
        {showPanel && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => !actionLoading && setShowPanel(false)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
              ref={panelRef}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-in"
            >
              {detailLoading ? (
                <div className="flex items-center justify-center h-full">
                  <AppIcon name="clock" className="w-8 h-8 animate-spin" style={{ color: C.indigo }} />
                </div>
              ) : selectedComplaint ? (
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "#F0EDD8" }}>
                    <h2 className="text-lg font-black" style={{ color: C.indigo }}>
                      Chi tiết khiếu nại
                    </h2>
                    <button
                      onClick={() => setShowPanel(false)}
                      disabled={actionLoading}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      style={{ color: "#8A8DA8" }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-2 gap-3 mt-5 mb-6">
                    <InfoCard label="Mã khiếu nại" value={selectedComplaint.id.slice(0, 8) + "..."} />
                    <InfoCard label="Khách hàng" value={selectedComplaint.userName || selectedComplaint.userId} />
                    <InfoCard label="Đơn hàng" value={selectedComplaint.orderCode || "-"} />
                    <InfoCard label="Voucher" value={selectedComplaint.voucherName || "-"} />
                    <InfoCard label="Lý do" value={REASON_LABELS[selectedComplaint.reason] || selectedComplaint.reason} />
                    <InfoCard label="Ngày tạo" value={fmtDate(selectedComplaint.createdAt)} />
                    {selectedComplaint.resolvedAt && (
                      <InfoCard label="Ngày xử lý" value={fmtDate(selectedComplaint.resolvedAt)} />
                    )}
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8A8DA8" }}>Trạng thái</span>
                      <div className="mt-1">
                        <StatusBadge status={selectedComplaint.status} />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedComplaint.description && (
                    <div className="mb-6">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8A8DA8" }}>Mô tả</span>
                      <p className="text-sm font-semibold mt-1" style={{ color: C.indigo }}>{selectedComplaint.description}</p>
                    </div>
                  )}

                  {/* Evidence */}
                  {selectedComplaint.evidenceUrls && selectedComplaint.evidenceUrls.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold mb-2" style={{ color: C.indigo }}>
                        Hình ảnh minh chứng
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedComplaint.evidenceUrls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Evidence ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                            onClick={() => setLightbox({ images: selectedComplaint.evidenceUrls, index: idx })}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Responses */}
                  {selectedComplaint.responses && selectedComplaint.responses.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold mb-2" style={{ color: C.indigo }}>
                        Phản hồi ({selectedComplaint.responses.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedComplaint.responses.map((r) => (
                          <div key={r.id} className="p-3 rounded-lg bg-gray-50">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">{r.responderName || r.responderRole}</span>
                              <span className="text-xs" style={{ color: "#9CA3AF" }}>{fmtDate(r.createdAt)}</span>
                            </div>
                            <p className="text-sm">{r.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {selectedComplaint.status === "open" && (
                    <div className="border-t pt-4 space-y-2" style={{ borderColor: "#E2DFC8" }}>
                      <h3 className="text-sm font-semibold mb-2" style={{ color: C.indigo }}>
                        Xử lý khiếu nại
                      </h3>
                      <button
                        onClick={() => handleAction("accept_refund", selectedComplaint)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ backgroundColor: "#059669" }}
                      >
                        Hoàn tiền voucher
                      </button>
                      <button
                        onClick={() => handleAction("accept_reissue", selectedComplaint)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ backgroundColor: "#0369A1" }}
                      >
                        Cấp lại voucher
                      </button>
                      <button
                        onClick={() => handleAction("external", selectedComplaint)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold border"
                        style={{ borderColor: C.indigo, color: C.indigo }}
                      >
                        Liên hệ đối tác
                      </button>
                      <button
                        onClick={() => handleAction("reject", selectedComplaint)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold border"
                        style={{ borderColor: "#D1D5DB", color: "#6B7280" }}
                      >
                        Từ chối
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Action Dialog */}
        {dialogAction && dialogComplaint && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={closeDialog}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div onClick={(e) => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: (dialogAction === "reject" || dialogAction === "external" ? "#6B7280" : C.indigo) + "15" }}>
                  <AppIcon name={dialogAction === "accept_refund" ? "dollarSign" : dialogAction === "accept_reissue" ? "gift" : dialogAction === "reject" ? "alert" : "mail"} className="w-5 h-5" style={{ color: dialogAction === "reject" || dialogAction === "external" ? "#6B7280" : C.indigo }} />
                </div>
                <h3 className="text-lg font-black" style={{ color: C.indigo }}>
                  {dialogAction === "accept_refund" && "Hoàn tiền voucher"}
                  {dialogAction === "accept_reissue" && "Cấp lại voucher"}
                  {dialogAction === "reject" && "Từ chối khiếu nại"}
                  {dialogAction === "external" && "Liên hệ đối tác"}
                </h3>
              </div>

              <div className="bg-gray-50 rounded-xl p-3.5 mb-4">
                <p className="text-xs font-semibold mb-1" style={{ color: C.indigo }}>
                  {dialogComplaint.voucherName ?? "Khiếu nại đơn hàng"}
                </p>
                <p className="text-xs" style={{ color: "#8A8DA8" }}>
                  {REASON_LABELS[dialogComplaint.reason as keyof typeof REASON_LABELS] ?? dialogComplaint.reason}
                </p>
              </div>

              <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
                {dialogAction === "accept_refund" && "Voucher sẽ bị thu hồi và tiền sẽ được hoàn về tài khoản khách hàng."}
                {dialogAction === "accept_reissue" && "Voucher mới sẽ được tạo trên đơn hàng mới, voucher cũ bị hủy."}
                {dialogAction === "reject" && "Khiếu nại sẽ bị từ chối, không có hành động nào được thực hiện."}
                {dialogAction === "external" && "Khiếu nại sẽ được đánh dấu đã liên hệ đối tác."}
              </p>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Ghi chú xử lý (tùy chọn)"
                className="w-full px-3 py-2 rounded-xl border text-sm mb-4 resize-none"
                rows={3}
                style={{ borderColor: "#E2DFC8" }}
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={closeDialog}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors hover:bg-gray-50 disabled:opacity-50"
                  style={{ borderColor: "#E2DFC8", color: C.indigo }}
                >
                  Đóng
                </button>
                <button
                  onClick={executeAction}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: dialogAction === "reject" || dialogAction === "external" ? "#6B7280" : C.indigo,
                  }}
                >
                  {actionLoading && <AppIcon name="clock" className="w-4 h-4 animate-spin" />}
                  {actionLoading ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-[70] px-5 py-3.5 rounded-xl shadow-lg text-sm font-bold text-white flex items-center gap-2.5 ${
              toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            <AppIcon name={toast.type === "success" ? "check" : "alert"} className="w-4 h-4" />
            {toast.message}
          </div>
        )}

        {/* Lightbox */}
        {lightbox && (
          <ImageLightbox
            images={lightbox.images}
            initialIndex={lightbox.index}
            open={true}
            onClose={() => setLightbox(null)}
          />
        )}

        <style>{`
          @keyframes slide-in {
            from { transform: translateX(100%); opacity: 0.8; }
            to { transform: translateX(0); opacity: 1; }
          }
          .animate-slide-in {
            animation: slide-in 0.2s ease-out;
          }
        `}</style>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8A8DA8" }}>{label}</span>
      <p className="text-sm font-semibold mt-0.5" style={{ color: C.indigo }}>{value}</p>
    </div>
  )
}
