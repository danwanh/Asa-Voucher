import { useState, useEffect, useCallback, useRef } from "react"
import { C, fmt, fmtDate, STATUS_DESCRIPTION } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { ImageLightbox } from "@/components/ImageLightbox"
import { StatusBadge } from "@/components/StatusBadge"
import { orderService, type OrderStatusCounts } from "@/services/orderService"
import { feedbackService, type ComplaintListItem } from "@/services/feedbackService"
import type { Order, OrderListItem } from "@/types"

type Action = "cancel" | "cancel_refund_prompt" | "refund"
type ComplaintAction = "accept_refund" | "accept_reissue" | "reject" | "external"

const REASON_LABELS: Record<string, string> = {
  not_as_described: "Không đúng mô tả",
  cannot_redeem: "Không thể sử dụng",
  expired_early: "Hết hạn sớm",
  wrong_value: "Sai giá trị",
  other: "Khác",
}

const ACTION_CONFIG: Record<Action, { label: string; icon: string; color: string; confirmLabel: string; description: string }> = {
  cancel: { label: "Hủy đơn", icon: "trash", color: "#C0392B", confirmLabel: "Hủy đơn", description: "Bạn có chắc chắn muốn hủy đơn hàng này không? Thao tác này không thể hoàn tác." },
  cancel_refund_prompt: { label: "Hủy đơn", icon: "trash", color: "#C0392B", confirmLabel: "", description: "" },
  refund: { label: "Hoàn tiền", icon: "wallet", color: C.peach, confirmLabel: "Xác nhận hoàn tiền", description: "Gọi VNPay/PayPal để hoàn tiền cho đơn hàng này?" },
}

function getActionsForStatus(status: string, paymentStatus: string): Action[] {
  if (status === "pending_payment" || status === "payment_failed") return ["cancel"]
  if (status === "confirmed") return ["cancel_refund_prompt"]
  if (status === "completed") return []
  if (status === "cancelled" && paymentStatus === "paid") return ["refund"]
  return []
}

export function AdminOrdersPage() {
  const [filter, setFilter] = useState("all")
  const [cancelledSubFilter, setCancelledSubFilter] = useState<"all" | "no_refund" | "pending_refund">("all")
  const [search, setSearch] = useState("")
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [counts, setCounts] = useState<OrderStatusCounts>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 20

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  const [dialogType, setDialogType] = useState<"confirm" | "refund_prompt" | null>(null)
  const [dialogAction, setDialogAction] = useState<Action | null>(null)
  const [dialogOrder, setDialogOrder] = useState<Order | null>(null)
  const [refundNote, setRefundNote] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [orderComplaints, setOrderComplaints] = useState<ComplaintListItem[]>([])
  const [complaintDialogAction, setComplaintDialogAction] = useState<ComplaintAction | null>(null)
  const [complaintDialogComplaint, setComplaintDialogComplaint] = useState<ComplaintListItem | null>(null)
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)
  const [complaintResolutionNote, setComplaintResolutionNote] = useState("")
  const [partnerSearch, setPartnerSearch] = useState("")
  const [partnerResults, setPartnerResults] = useState<any[]>([])
  const [partnerSearchLoading, setPartnerSearchLoading] = useState(false)

  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const panelRef = useRef<HTMLDivElement>(null)

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: { status?: string; search?: string; page?: number; limit?: number } = { page, limit: PAGE_SIZE }
      if (filter !== "all") params.status = filter
      if (search.trim()) params.search = search.trim()
      const result = await orderService.listOrders(params)
      setOrders(result.items)
      setCounts(result.countsByStatus)
      setTotalPages(result.totalPages)
      setTotal(result.total)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tải danh sách đơn hàng"
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
      fetchOrders()
      return
    }
    const debounce = setTimeout(fetchOrders, 300)
    return () => clearTimeout(debounce)
  }, [fetchOrders])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dialogType) closeDialog()
        else setShowPanel(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [dialogType, actionLoading])

  const filteredOrders = filter === "cancelled" && cancelledSubFilter !== "all"
    ? orders.filter(o => {
        if (cancelledSubFilter === "no_refund") return o.paymentStatus !== "paid"
        if (cancelledSubFilter === "pending_refund") return o.paymentStatus === "paid"
        return true
      })
    : orders

  const handleSelectOrder = async (order: OrderListItem) => {
    setDetailLoading(true)
    setShowPanel(true)
    setOrderComplaints([])
    try {
      const detail = await orderService.getOrder(order.id)
      setSelectedOrder(detail)
      try {
        const complaints = await feedbackService.listComplaints({ order_id: order.id, limit: 100 })
        setOrderComplaints(complaints.items)
      } catch {}
    } catch {
      showToast("error", "Không thể tải chi tiết đơn hàng")
      setShowPanel(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleAction = (action: Action, order: Order) => {
    if (action === "cancel_refund_prompt") {
      setDialogType("refund_prompt")
    } else {
      setDialogType("confirm")
    }
    setDialogAction(action)
    setDialogOrder(order)
  }

  const closeDialog = () => {
    if (actionLoading) return
    setDialogType(null)
    setDialogAction(null)
    setDialogOrder(null)
    setRefundNote("")
  }

  const executeAction = async (withRefund?: boolean) => {
    if (!dialogAction || !dialogOrder) return
    const action = dialogAction
    const order = dialogOrder
    setActionLoading(true)
    try {
      if (action === "cancel") {
        await orderService.cancelOrder(order.id)
        showToast("success", "Hủy đơn hàng thành công")
      } else if (action === "cancel_refund_prompt") {
        await orderService.cancelOrder(order.id)
        if (withRefund) {
          try {
            const refundResult = await orderService.refundOrder(order.id, "Hoàn tiền khi hủy đơn")
            const refundRef = (refundResult as any)?.refundRef
            showToast("success", refundRef
              ? `Hủy đơn + hoàn tiền thành công (Ref: ${refundRef})`
              : "Hủy đơn + hoàn tiền thành công")
          } catch {
            showToast("error", "Hủy đơn thành công nhưng hoàn tiền thất bại")
          }
        } else {
          showToast("success", "Hủy đơn hàng thành công")
        }
      } else if (action === "refund") {
        const refundResult = await orderService.refundOrder(order.id, refundNote || undefined)
        const refundRef = (refundResult as any)?.refundRef
        showToast("success", refundRef
          ? `Hoàn tiền thành công (Ref: ${refundRef})`
          : "Hoàn tiền thành công")
        setRefundNote("")
      }

      closeDialog()
      setShowPanel(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Thao tác thất bại"
      showToast("error", message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplaintAction = (action: ComplaintAction, complaint: ComplaintListItem) => {
    setComplaintDialogAction(action)
    setComplaintDialogComplaint(complaint)
    setComplaintResolutionNote("")
    setPartnerSearch("")
    setPartnerResults([])
  }

  const closeComplaintDialog = () => {
    if (actionLoading) return
    setComplaintDialogAction(null)
    setComplaintDialogComplaint(null)
    setComplaintResolutionNote("")
    setPartnerSearch("")
    setPartnerResults([])
  }

  const executeComplaintAction = async () => {
    if (!complaintDialogAction || !complaintDialogComplaint) return
    const complaint = complaintDialogComplaint
    setActionLoading(true)
    try {
      if (complaintDialogAction === "accept_refund") {
        await feedbackService.resolveComplaint(complaint.id, {
          resolutionNote: complaintResolutionNote || "Chấp nhận hoàn tiền",
          resolutionTypes: ["refund"],
        })
        showToast("success", "Đã chấp nhận hoàn tiền cho voucher khiếu nại")
      } else if (complaintDialogAction === "accept_reissue") {
        await feedbackService.resolveComplaint(complaint.id, {
          resolutionNote: complaintResolutionNote || "Chấp nhận cấp lại voucher",
          resolutionTypes: ["reissue"],
        })
        showToast("success", "Đã chấp nhận cấp lại voucher khiếu nại")
      } else if (complaintDialogAction === "reject") {
        await feedbackService.resolveComplaint(complaint.id, {
          resolutionNote: complaintResolutionNote || "Từ chối khiếu nại",
          resolutionTypes: ["no_action"],
        })
        showToast("success", "Đã từ chối khiếu nại")
      } else if (complaintDialogAction === "external") {
        await feedbackService.resolveComplaint(complaint.id, {
          resolutionNote: complaintResolutionNote || "Xử lý bên ngoài - đã liên hệ đối tác",
          resolutionTypes: ["no_action"],
        })
        showToast("success", "Đã đánh dấu xử lý bên ngoài")
      }
      closeComplaintDialog()
      if (selectedOrder) {
        const detail = await orderService.getOrder(selectedOrder.id)
        setSelectedOrder(detail)
        const complaints = await feedbackService.listComplaints({ order_id: selectedOrder.id, limit: 100 })
        setOrderComplaints(complaints.items)
      }
      fetchOrders()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Thao tác thất bại"
      showToast("error", message)
    } finally {
      setActionLoading(false)
    }
  }

  const searchPartners = async (q: string) => {
    setPartnerSearch(q)
    if (q.trim().length < 2) { setPartnerResults([]); return }
    setPartnerSearchLoading(true)
    try {
      const result = await feedbackService.searchPartners(q.trim())
      setPartnerResults(result)
    } catch {}
    setPartnerSearchLoading(false)
  }

  const filterTabs = [
    { v: "all", l: "Tất cả", desc: "Tất cả đơn hàng" },
    { v: "pending_payment", l: "Chờ thanh toán", desc: "Đơn tạo xong, chờ khách thanh toán" },
    { v: "payment_failed", l: "Thanh toán thất bại", desc: "Giao dịch thanh toán lỗi" },
    { v: "confirmed", l: "Đã xác nhận", desc: "Đã xác nhận, voucher đã phát hành" },
    { v: "complaining", l: "Đang khiếu nại", desc: "Đơn có khiếu nại cần xử lý" },
    { v: "completed", l: "Hoàn thành", desc: "Đơn đã hoàn thành, voucher đã sử dụng" },
    { v: "cancelled", l: "Đã hủy", desc: "Đơn đã hủy" },
    { v: "refunded", l: "Đã hoàn tiền", desc: "Hoàn tiền từ khiếu nại hoặc tự động" },
  ]

  const availableActions = selectedOrder && orderComplaints.filter(c => c.status === "open").length === 0
    ? getActionsForStatus(selectedOrder.status, selectedOrder.paymentStatus)
    : []

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: C.content }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black" style={{ color: C.indigo }}>
            Quản lý đơn hàng
          </h1>
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: C.eggshell, color: C.indigo }}
          >
            {loading ? "Đang tải..." : `${orders.length}/${total} đơn`}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {filterTabs.map(({ v, l, desc }) => (
              <div key={v} className="relative group">
                <button
                  onClick={() => { setFilter(v); setCancelledSubFilter("all") }}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: filter === v ? C.indigo : "transparent",
                    color: filter === v ? "white" : C.indigo,
                    border: `1.5px solid ${filter === v ? C.indigo : "#E2DFC8"}`,
                  }}
                >
                  {l}
                  <span
                    className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: filter === v ? "rgba(255,255,255,0.25)" : C.eggshell,
                      color: filter === v ? "white" : C.indigo,
                    }}
                  >
                    {counts[v as keyof OrderStatusCounts] ?? 0}
                  </span>
                </button>
                {desc && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10 shadow-lg" style={{ backgroundColor: "#333", color: "white" }}>
                    {desc}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rotate-45" style={{ backgroundColor: "#333" }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="relative">
            <AppIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
            <input
              type="text"
              placeholder="Tìm mã đơn, tên khách hàng, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-96 pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            />
          </div>
        </div>

      {filter === "cancelled" && (
        <div className="flex gap-2 mb-4">
          {[
            { v: "all" as const, l: "Tất cả" },
            { v: "no_refund" as const, l: "Không hoàn tiền" },
            { v: "pending_refund" as const, l: "Chờ hoàn tiền" },
          ].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setCancelledSubFilter(v)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: cancelledSubFilter === v ? "#6366F1" : "transparent",
                color: cancelledSubFilter === v ? "white" : C.indigo,
                border: `1.5px solid ${cancelledSubFilter === v ? "#6366F1" : "#E2DFC8"}`,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchOrders} className="underline font-bold ml-2">Thử lại</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: C.eggshell }}>
                {["Mã đơn", "Người mua", "Trạng thái", "Số tiền", "Phương thức", "Ngày tạo"].map((h, i) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left font-bold text-xs uppercase tracking-wider"
                    style={{
                      color: C.indigo,
                      textAlign: i === 3 ? "right" : "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-20 text-center" style={{ color: "#8A8DA8" }}>
                    <AppIcon name="clock" className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: C.indigo }} />
                    <div className="font-semibold text-sm">Đang tải dữ liệu...</div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="text-center py-20">
                      <AppIcon name="search" className="w-12 h-12 mb-4 mx-auto" style={{ color: "#D1D5DB" }} />
                      <div className="font-bold text-sm" style={{ color: C.indigo }}>Không tìm thấy đơn hàng</div>
                      <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => handleSelectOrder(o)}
                    className="border-t hover:bg-gray-50/80 cursor-pointer transition-colors group"
                    style={{ borderColor: "#F0EDD8" }}
                  >
                    <td className="px-5 py-3.5">
                      <code
                        className="text-xs font-semibold px-2 py-1 rounded-md"
                        style={{
                          color: C.indigo,
                          backgroundColor: C.eggshell,
                          fontFamily: "'Inter', monospace",
                        }}
                      >
                        {o.code}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold" style={{ color: C.indigo }}>
                        {o.userName ?? o.userId}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={o.hasComplaint ? "complaining" : o.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-xs font-bold" style={{ color: C.peach }}>
                        {fmt(o.amount)}
                      </span>
                      {o.refundAmount && o.refundAmount > 0 && (
                        <div className="text-xs font-semibold" style={{ color: "#DC2626" }}>
                          Đã hoàn: -{fmt(o.refundAmount)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs" style={{ color: "#8A8DA8" }}>{o.paymentMethod}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs" style={{ color: "#8A8DA8" }}>{fmtDate(o.createdAt)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs" style={{ color: "#8A8DA8" }}>
            Trang {page}/{totalPages} · {total} đơn
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-40"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            >
              ← Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-40"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            >
              Sau →
            </button>
          </div>
        </div>
      )}

      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowPanel(false)}>
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
            ) : selectedOrder ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5 pb-4 border-b" style={{ borderColor: "#F0EDD8" }}>
                  <div>
                    <h3 className="text-lg font-black" style={{ color: C.indigo }}>Chi tiết đơn hàng</h3>
                    <code
                      className="text-xs font-semibold px-2 py-0.5 rounded-md mt-1 inline-block"
                      style={{ color: C.indigo, backgroundColor: C.eggshell, fontFamily: "'Inter', monospace" }}
                    >
                      {selectedOrder.code}
                    </code>
                  </div>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    style={{ color: "#8A8DA8" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Trạng thái</p>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Thanh toán</p>
                    <p className="text-sm font-semibold" style={{ color: C.indigo }}>{selectedOrder.paymentMethod}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Người mua</p>
                    <p className="text-sm font-semibold truncate" style={{ color: C.indigo }}>{selectedOrder.userName ?? "N/A"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Ngày tạo</p>
                    <p className="text-sm font-semibold" style={{ color: C.indigo }}>{fmtDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>

                {selectedOrder.note && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#856404" }}>Ghi chú</p>
                    <p className="text-sm" style={{ color: "#856404" }}>{selectedOrder.note}</p>
                  </div>
                )}

                <div className="mb-5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#8A8DA8" }}>Voucher trong đơn</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: C.indigo }}>
                            {item.voucherTitle ?? item.voucherId}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>
                            {item.partnerName && <span>{item.partnerName} · </span>}
                            x{item.quantity} &times; {fmt(item.unitPrice)}
                          </p>
                        </div>
                        <p className="text-sm font-bold whitespace-nowrap" style={{ color: C.peach }}>{fmt(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {orderComplaints.length > 0 && (
                  <div className="mb-5">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: "#8A8DA8" }}>
                      <AppIcon name="alert" className="w-3.5 h-3.5" style={{ color: C.peach }} />
                      Khiếu nại ({orderComplaints.length})
                    </h4>
                    <div className="space-y-2.5">
                      {orderComplaints.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-xl p-3.5 border"
                          style={{
                            backgroundColor: c.status === "open" ? "#FEF3C7" : "#F0FDF4",
                            borderColor: c.status === "open" ? "#FDE68A" : "#BBF7D0",
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: c.status === "open" ? "#FDE68A" : "#BBF7D0",
                                color: c.status === "open" ? "#856404" : "#2D7A52",
                              }}
                            >
                              {c.status === "open" ? "Đang mở" : "Đã xử lý"}
                            </span>
                            {c.voucherName && (
                              <span className="text-xs font-semibold truncate max-w-[180px]" style={{ color: C.indigo }}>
                                {c.voucherName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs mb-1" style={{ color: "#8A8DA8" }}>
                            {REASON_LABELS[c.reason as keyof typeof REASON_LABELS] ?? c.reason}
                           </p>
                           <p className="text-xs mb-2 leading-relaxed" style={{ color: C.indigo }}>{c.description}</p>
                           {c.evidenceUrls.length > 0 && (
                             <div className="mb-2">
                               <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8A8DA8" }}>Ảnh bằng chứng</p>
                               <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto rounded-lg pr-1">
                                  {c.evidenceUrls.map((url, index) => (
                                    <button key={`${url}-${index}`} type="button" onClick={() => setLightbox({ images: c.evidenceUrls, index })} className="block w-full">
                                      <img
                                        src={url}
                                        alt={`Ảnh bằng chứng ${index + 1}`}
                                        className="aspect-square w-full rounded-lg border object-cover"
                                        style={{ borderColor: "#E2DFC8" }}
                                      />
                                    </button>
                                  ))}
                               </div>
                             </div>
                           )}
                           {c.resolutionNote && (
                            <p className="text-xs italic mb-2" style={{ color: "#2D7A52" }}>
                              {c.resolutionNote}
                            </p>
                          )}
                          {c.status === "open" && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t" style={{ borderColor: c.status === "open" ? "#FDE68A" : "#BBF7D0" }}>
                              <button
                                onClick={() => handleComplaintAction("accept_refund", c)}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all hover:shadow-sm active:scale-[0.98]"
                                style={{ backgroundColor: C.peach }}
                              >
                                Hoàn tiền
                              </button>
                              <button
                                onClick={() => handleComplaintAction("accept_reissue", c)}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all hover:shadow-sm active:scale-[0.98]"
                                style={{ backgroundColor: "#2D7A52" }}
                              >
                                Cấp lại
                              </button>
                              <button
                                onClick={() => handleComplaintAction("reject", c)}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors hover:bg-white/50"
                                style={{ borderColor: "#D1D5DB", color: C.indigo }}
                              >
                                Từ chối
                              </button>
                              <button
                                onClick={() => handleComplaintAction("external", c)}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors hover:bg-white/50"
                                style={{ borderColor: "#D1D5DB", color: "#856404" }}
                              >
                                Liên hệ ĐT
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold" style={{ color: C.indigo }}>Tổng cộng</span>
                    <span className="text-lg font-black" style={{ color: C.peach }}>{fmt(selectedOrder.amount)}</span>
                  </div>
                  {selectedOrder.refundAmount && selectedOrder.refundAmount > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold" style={{ color: "#DC2626" }}>Đã hoàn tiền</span>
                        <span className="text-sm font-bold" style={{ color: "#DC2626" }}>-{fmt(selectedOrder.refundAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-bold" style={{ color: C.indigo }}>Còn lại</span>
                        <span className="text-lg font-black" style={{ color: C.peach }}>{fmt(selectedOrder.amount - selectedOrder.refundAmount)}</span>
                      </div>
                    </>
                  )}
                </div>

                {((selectedOrder.status === "cancelled" && selectedOrder.paymentStatus === "paid") || selectedOrder.status === "refunded") && (
                  <div
                    className="rounded-xl p-3.5 mb-5"
                    style={{
                      backgroundColor: selectedOrder.paymentStatus === "refunded" ? "#E8F5EE" : "#FEF3C7",
                      border: `1px solid ${selectedOrder.paymentStatus === "refunded" ? "#D1FAE5" : "#FDE68A"}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AppIcon
                        name={selectedOrder.paymentStatus === "refunded" ? "check" : "alert"}
                        className="w-4 h-4 shrink-0"
                        style={{ color: selectedOrder.paymentStatus === "refunded" ? "#2D7A52" : "#856404" }}
                      />
                      <span className="text-sm font-bold" style={{ color: selectedOrder.paymentStatus === "refunded" ? "#2D7A52" : "#856404" }}>
                        {selectedOrder.paymentStatus === "refunded" ? "Đã hoàn tiền" : "Chưa hoàn tiền"}
                      </span>
                    </div>
                    {selectedOrder.paymentStatus === "refunded" && selectedOrder.payments?.filter(p => p.status === "refunded").map((rp) => (
                      <div key={rp.id} className="mt-2 text-xs space-y-1" style={{ color: "#2D7A52" }}>
                        {rp.refundRef && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">Gateway Ref:</span>
                            <code
                              className="px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "#D1FAE5", fontFamily: "'Inter', monospace" }}
                            >
                              {rp.refundRef}
                            </code>
                          </div>
                        )}
                        {rp.refundedAt && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">Thời gian:</span>
                            <span>{fmtDate(rp.refundedAt)}</span>
                          </div>
                        )}
                        {rp.method && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">Phương thức:</span>
                            <span className="uppercase">{rp.method}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {availableActions.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 pt-4 border-t" style={{ borderColor: "#F0EDD8" }}>
                    {availableActions.map((action) => {
                      const config = ACTION_CONFIG[action]
                      return (
                        <button
                          key={action}
                          onClick={() => handleAction(action, selectedOrder)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md active:scale-[0.98]"
                          style={{ backgroundColor: config.color }}
                        >
                          <AppIcon name={config.icon} className="w-4 h-4" />
                          {config.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {dialogType === "confirm" && dialogAction && dialogOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={closeDialog}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: ACTION_CONFIG[dialogAction].color + "15" }}
              >
                <AppIcon name={ACTION_CONFIG[dialogAction].icon} className="w-5 h-5" style={{ color: ACTION_CONFIG[dialogAction].color }} />
              </div>
              <h3 className="text-lg font-black" style={{ color: C.indigo }}>
                {ACTION_CONFIG[dialogAction].label}
              </h3>
            </div>

            <p className="text-sm mb-5 leading-relaxed" style={{ color: "#8A8DA8" }}>
              {ACTION_CONFIG[dialogAction].description}
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8A8DA8" }}>Đơn hàng</p>
                  <code
                    className="text-sm font-bold mt-0.5 inline-block px-2 py-0.5 rounded"
                    style={{ color: C.indigo, backgroundColor: C.eggshell, fontFamily: "'Inter', monospace" }}
                  >
                    {dialogOrder.code}
                  </code>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8A8DA8" }}>Tổng tiền</p>
                  <p className="text-base font-black mt-0.5" style={{ color: C.peach }}>{fmt(dialogOrder.amount)}</p>
                </div>
              </div>
            </div>

            {dialogAction === "refund" && (
              <div className="mb-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <AppIcon name="info" className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#1A5FAD" }} />
                  <div className="text-xs" style={{ color: "#1A5FAD" }}>
                    <p className="font-bold">Phương thức thanh toán</p>
                    <p className="mt-0.5">
                      {dialogOrder.paymentMethod === "vnpay"
                        ? "Hoàn tiền sẽ được gửi đến VNPay Sandbox. Nếu gateway lỗi, giao dịch sẽ thất bại."
                        : "Hoàn tiền sẽ được gửi đến PayPal Sandbox. Nếu gateway lỗi, giao dịch sẽ thất bại."}
                    </p>
                  </div>
                </div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>Ghi chú hoàn tiền (tùy chọn)</label>
                <textarea
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                  style={{ borderColor: "#E2DFC8", color: C.indigo }}
                  rows={2}
                  placeholder="Lý do hoàn tiền..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeDialog}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: "#E2DFC8", color: C.indigo }}
              >
                Đóng
              </button>
              <button
                onClick={() => executeAction()}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: ACTION_CONFIG[dialogAction].color }}
              >
                {actionLoading && <AppIcon name="clock" className="w-4 h-4 animate-spin" />}
                {actionLoading ? "Đang xử lý..." : ACTION_CONFIG[dialogAction].confirmLabel || "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogType === "refund_prompt" && dialogOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={closeDialog}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: C.peach + "15" }}
              >
                <AppIcon name="wallet" className="w-5 h-5" style={{ color: C.peach }} />
              </div>
              <h3 className="text-lg font-black" style={{ color: C.indigo }}>Hủy đơn hàng</h3>
            </div>

            <p className="text-sm mb-5 leading-relaxed" style={{ color: "#8A8DA8" }}>
              Bạn có muốn hoàn tiền cho đơn hàng này không?
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8A8DA8" }}>Đơn hàng</p>
                  <code
                    className="text-sm font-bold mt-0.5 inline-block px-2 py-0.5 rounded"
                    style={{ color: C.indigo, backgroundColor: C.eggshell, fontFamily: "'Inter', monospace" }}
                  >
                    {dialogOrder.code}
                  </code>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8A8DA8" }}>Tổng tiền</p>
                  <p className="text-base font-black mt-0.5" style={{ color: C.peach }}>{fmt(dialogOrder.amount)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeDialog}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: "#E2DFC8", color: C.indigo }}
              >
                Đóng
              </button>
              <button
                onClick={() => executeAction(false)}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: "#E2DFC8", color: C.indigo }}
              >
                {actionLoading ? "Đang xử lý..." : "Không"}
              </button>
              <button
                onClick={() => executeAction(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: C.peach }}
              >
                {actionLoading && <AppIcon name="clock" className="w-4 h-4 animate-spin" />}
                {actionLoading ? "Đang xử lý..." : "Có, hoàn tiền"}
              </button>
            </div>
          </div>
        </div>
      )}

        {complaintDialogAction && complaintDialogComplaint && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={closeComplaintDialog}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: C.peach + "15" }}
              >
                <AppIcon name="alert" className="w-5 h-5" style={{ color: C.peach }} />
              </div>
              <h3 className="text-base font-black" style={{ color: C.indigo }}>
                {complaintDialogAction === "accept_refund" && "Hoàn tiền voucher"}
                {complaintDialogAction === "accept_reissue" && "Cấp lại voucher"}
                {complaintDialogAction === "reject" && "Từ chối khiếu nại"}
                {complaintDialogAction === "external" && "Liên hệ đối tác"}
              </h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-3.5 mb-4">
              <p className="text-xs font-semibold mb-1" style={{ color: C.indigo }}>
                {complaintDialogComplaint.voucherName ?? "Khiếu nại đơn hàng"}
              </p>
              <p className="text-xs" style={{ color: "#8A8DA8" }}>
                {REASON_LABELS[complaintDialogComplaint.reason as keyof typeof REASON_LABELS] ?? complaintDialogComplaint.reason}
              </p>
            </div>

            {complaintDialogAction === "external" && (
              <div className="mb-4">
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: C.indigo }}>Tìm đối tác</label>
                <input
                  value={partnerSearch}
                  onChange={(e) => searchPartners(e.target.value)}
                  placeholder="Nhập tên đối tác..."
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#E2DFC8" }}
                />
                {partnerSearchLoading && (
                  <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Đang tìm...</p>
                )}
                {partnerResults.length > 0 && (
                  <div className="mt-2 bg-white border rounded-xl max-h-40 overflow-y-auto" style={{ borderColor: "#E2DFC8" }}>
                    {partnerResults.map((p) => (
                      <div
                        key={p.id}
                        className="px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                        style={{ borderColor: "#F0EDD8" }}
                        onClick={() => {
                          setComplaintResolutionNote(
                            `Liên hệ đối tác: ${p.businessName} - ${p.representativeName} (${p.representativeEmail}, ${p.representativePhone})`
                          )
                          setPartnerResults([])
                        }}
                      >
                        <p className="text-sm font-semibold" style={{ color: C.indigo }}>{p.businessName}</p>
                        <p className="text-xs" style={{ color: "#8A8DA8" }}>
                          {p.representativeName} &middot; {p.representativeEmail} &middot; {p.representativePhone}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mb-5">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: C.indigo }}>Ghi chú xử lý</label>
              <textarea
                value={complaintResolutionNote}
                onChange={(e) => setComplaintResolutionNote(e.target.value)}
                placeholder="Nhập ghi chú xử lý..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none resize-none"
                style={{ borderColor: "#E2DFC8" }}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeComplaintDialog}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: "#E2DFC8", color: C.indigo }}
              >
                Đóng
              </button>
              <button
                onClick={executeComplaintAction}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor:
                    complaintDialogAction === "accept_refund" ? C.peach :
                    complaintDialogAction === "accept_reissue" ? "#2D7A52" :
                    complaintDialogAction === "reject" ? "#C0392B" :
                    "#856404",
                }}
              >
                {actionLoading && <AppIcon name="clock" className="w-4 h-4 animate-spin" />}
                {actionLoading ? "Đang xử lý..." :
                  complaintDialogAction === "accept_refund" ? "Xác nhận hoàn tiền" :
                  complaintDialogAction === "accept_reissue" ? "Xác nhận cấp lại" :
                  complaintDialogAction === "reject" ? "Xác nhận từ chối" :
                  "Xác nhận"
                }
              </button>
            </div>
          </div>
        </div>
        )}

        <ImageLightbox images={lightbox?.images ?? []} initialIndex={lightbox?.index ?? 0} open={Boolean(lightbox)} onClose={() => setLightbox(null)} />

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
