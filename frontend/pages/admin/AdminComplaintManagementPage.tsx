import { useState, useEffect, useCallback, useRef } from "react"
import { C, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { StatusBadge } from "@/components/StatusBadge"
import { feedbackService, type ComplaintListItem, type ComplaintDetail, type ComplaintResponse } from "@/services/feedbackService"

const REASON_LABEL: Record<string, string> = {
  not_as_described: "Không đúng mô tả",
  cannot_redeem: "Không thể sử dụng",
  expired_early: "Hết hạn sớm",
  wrong_value: "Giá trị sai",
  other: "Khác",
}

const STATUS_LABEL: Record<string, string> = {
  open: "Chờ xử lý",
  under_review: "Đang xử lý",
  resolved: "Đã xử lý",
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  open: { bg: "#FFF3CD", text: "#856404" },
  under_review: { bg: "#E0EEFF", text: "#1A5FAD" },
  resolved: { bg: "#E8F5EE", text: "#2D7A52" },
}

const RESOLVED_SUB_LABEL: Record<string, string> = {
  all: "Tất cả",
  refund: "Hoàn tiền",
  reissue: "Cấp lại voucher",
  no_action: "Từ chối",
  partner_penalized: "Phạt đối tác",
}

const RESOLUTION_TYPE_LABEL: Record<string, string> = {
  refund: "Hoàn tiền",
  reissue: "Cấp lại voucher",
  no_action: "Từ chối",
  partner_penalized: "Phạt đối tác",
}

type Action = "accept" | "reject" | "request_info" | "transfer"

const ACTION_CONFIG: Record<Action, { label: string; icon: string; color: string }> = {
  accept: { label: "Chấp nhận", icon: "check", color: "#2D7A52" },
  reject: { label: "Từ chối", icon: "x", color: "#C0392B" },
  request_info: { label: "Yêu cầu bổ sung", icon: "edit", color: "#856404" },
  transfer: { label: "Chuyển xử lý", icon: "arrow-right-circle", color: "#6F42C1" },
}

export function AdminComplaintManagementPage() {
  const [filter, setFilter] = useState("all")
  const [resolvedSubFilter, setResolvedSubFilter] = useState("all")
  const [reasonFilter, setReasonFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [dateError, setDateError] = useState("")
  const [complaints, setComplaints] = useState<ComplaintListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [responses, setResponses] = useState<ComplaintResponse[]>([])
  const [newResponse, setNewResponse] = useState("")

  const [dialogAction, setDialogAction] = useState<Action | null>(null)
  const [resolveNote, setResolveNote] = useState("")
  const [acceptTypes, setAcceptTypes] = useState<("refund" | "reissue" | "partner_penalized")[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  const [transferTarget, setTransferTarget] = useState("")
  const [adminList, setAdminList] = useState<{ id: string; fullName: string; email: string }[]>([])
  const [adminSearch, setAdminSearch] = useState("")
  const [showAdminDropdown, setShowAdminDropdown] = useState(false)

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const handleDateFromChange = (val: string) => {
    setDateFrom(val)
    if (val && dateTo && val > dateTo) {
      setDateError("Khoảng thời gian không hợp lệ")
    } else {
      setDateError("")
    }
  }

  const handleDateToChange = (val: string) => {
    setDateTo(val)
    if (dateFrom && val && val < dateFrom) {
      setDateError("Khoảng thời gian không hợp lệ")
    } else {
      setDateError("")
    }
  }

  const fetchComplaints = useCallback(async () => {
    if (dateError) return
    setLoading(true)
    setError(null)
    try {
      const params: { status?: string; page?: number; limit?: number } = { limit: 100 }
      if (filter !== "all") params.status = filter
      const result = await feedbackService.listComplaints(params)
      let filtered = result.items
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        filtered = filtered.filter((c) =>
          c.id.toLowerCase().includes(q) ||
          (c.userName ?? "").toLowerCase().includes(q) ||
          (c.orderCode ?? "").toLowerCase().includes(q)
        )
      }
      if (reasonFilter !== "all") {
        filtered = filtered.filter((c) => c.reason === reasonFilter)
      }
      if (filter === "resolved" && resolvedSubFilter !== "all") {
        const typeLabels: Record<string, string> = { refund: "Hoàn tiền", reissue: "Cấp lại voucher", partner_penalized: "Phạt đối tác", no_action: "Từ chối" }
        const label = typeLabels[resolvedSubFilter] ?? ""
        filtered = filtered.filter((c) => (c.resolutionTypes ?? []).includes(resolvedSubFilter) || (label && (c.resolutionNote ?? "").includes(label)))
      }
      if (dateFrom) {
        filtered = filtered.filter((c) => c.createdAt >= dateFrom)
      }
      if (dateTo) {
        const to = dateTo + "T23:59:59"
        filtered = filtered.filter((c) => c.createdAt <= to)
      }
      setComplaints(filtered)
      setTotal(filtered.length)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tải danh sách khiếu nại"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [filter, resolvedSubFilter, reasonFilter, search, dateFrom, dateTo, dateError])

  const isFirstRender = useRef(true)
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
    setSelectedComplaint(null)
    setResponses([])
    try {
      const detail = await feedbackService.getComplaintDetail(complaint.id)
      setSelectedComplaint(detail)
      const resps = await feedbackService.listComplaintResponses(complaint.id)
      setResponses(resps)
    } catch {
      showToast("error", "Không thể tải chi tiết khiếu nại")
      setShowPanel(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDialog = () => {
    if (actionLoading) return
    setDialogAction(null)
    setResolveNote("")
    setAcceptTypes([])
    setTransferTarget("")
    setAdminSearch("")
    setShowAdminDropdown(false)
  }

  const fetchAdmins = useCallback(async (q: string) => {
    try {
      const result = await feedbackService.searchAdmins(q)
      setAdminList(result)
    } catch {}
  }, [])

  useEffect(() => {
    if (dialogAction === "transfer") {
      fetchAdmins(adminSearch)
      if (adminSearch.trim().length >= 2) setShowAdminDropdown(true)
    }
  }, [dialogAction, adminSearch, fetchAdmins])

  const executeAction = async () => {
    if (!dialogAction || !selectedComplaint) return
    setActionLoading(true)
    try {
      if (dialogAction === "accept") {
        if (!resolveNote.trim()) {
          showToast("error", "Vui lòng nhập nội dung xử lý")
          setActionLoading(false)
          return
        }
        if (acceptTypes.length === 0) {
          showToast("error", "Vui lòng chọn ít nhất 1 hình thức xử lý")
          setActionLoading(false)
          return
        }
        const typeLabels: Record<string, string> = { refund: "Hoàn tiền", reissue: "Cấp lại voucher", partner_penalized: "Phạt đối tác" }
        const labels = acceptTypes.map((t) => typeLabels[t])
        const note = `[${labels.join(", ")}] ${resolveNote.trim()}`
        await feedbackService.resolveComplaint(selectedComplaint.id, {
          resolutionNote: note,
          resolutionTypes: acceptTypes,
        })
        showToast("success", `Đã chấp nhận - ${labels.join(", ")}`)
      } else if (dialogAction === "reject") {
        if (!resolveNote.trim()) {
          showToast("error", "Vui lòng nhập lý do từ chối")
          setActionLoading(false)
          return
        }
        await feedbackService.resolveComplaint(selectedComplaint.id, {
          resolutionNote: resolveNote.trim(),
          resolutionTypes: ["no_action"],
        })
        showToast("success", "Đã từ chối khiếu nại")
      } else if (dialogAction === "transfer") {
        if (!transferTarget) {
          showToast("error", "Vui lòng chọn người xử lý")
          setActionLoading(false)
          return
        }
        if (!resolveNote.trim()) {
          showToast("error", "Vui lòng nhập nội dung chuyển xử lý")
          setActionLoading(false)
          return
        }
        await feedbackService.assignComplaint(selectedComplaint.id, transferTarget)
        await feedbackService.createComplaintResponse(selectedComplaint.id, `[Chuyển xử lý] ${resolveNote.trim()}`)
        showToast("success", "Đã chuyển xử lý chuyên môn")
      } else {
        if (!resolveNote.trim()) {
          showToast("error", "Vui lòng nhập nội dung yêu cầu bổ sung")
          setActionLoading(false)
          return
        }
        await feedbackService.updateComplaint(selectedComplaint.id, { status: "under_review" })
        await feedbackService.createComplaintResponse(selectedComplaint.id, resolveNote.trim())
        showToast("success", "Đã gửi yêu cầu bổ sung thông tin")
      }

      closeDialog()
      setShowPanel(false)
      setSelectedComplaint(null)
      fetchComplaints()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Thao tác thất bại"
      showToast("error", message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendResponse = async () => {
    if (!selectedComplaint || !newResponse.trim()) return
    try {
      await feedbackService.createComplaintResponse(selectedComplaint.id, newResponse.trim())
      setNewResponse("")
      const resps = await feedbackService.listComplaintResponses(selectedComplaint.id)
      setResponses(resps)
      showToast("success", "Phản hồi đã gửi")
    } catch {
      showToast("error", "Không thể gửi phản hồi")
    }
  }

  const filterTabs = [
    { v: "all", l: "Tất cả", desc: "" },
    { v: "open", l: "Chờ xử lý", desc: "Khách hàng mới gửi, chưa tiếp nhận" },
    { v: "under_review", l: "Đang xử lý", desc: "Đã tiếp nhận, đang yêu cầu bổ sung hoặc chờ đối tác" },
    { v: "resolved", l: "Đã xử lý", desc: "Đã hoàn tiền / cấp lại / từ chối" },
  ]

  const resolvedSubTabs = Object.entries(RESOLVED_SUB_LABEL)

  const availableActions: Action[] = []
  if (selectedComplaint) {
    if (selectedComplaint.status === "open") {
      availableActions.push("accept", "reject", "request_info", "transfer")
    } else if (selectedComplaint.status === "under_review") {
      availableActions.push("accept", "reject", "request_info")
    }
  }

  const filteredAdmins = adminList
    .filter((a) =>
      a.fullName.toLowerCase().includes(adminSearch.toLowerCase()) ||
      a.email.toLowerCase().includes(adminSearch.toLowerCase())
    )
    .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: C.content }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black" style={{ color: C.indigo }}>
            Quản lý khiếu nại
          </h1>
          <div className="flex items-center gap-3">
            {dateError && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: "#FDECEA", color: "#C0392B" }}>
                {dateError}
              </span>
            )}
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: C.eggshell, color: C.indigo }}
            >
              {loading ? "Đang tải..." : `${total} khiếu nại`}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {filterTabs.map(({ v, l, desc }) => (
              <div key={v} className="relative group">
                <button
                  onClick={() => { setFilter(v); if (v !== "resolved") setResolvedSubFilter("all") }}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: filter === v ? C.indigo : "transparent",
                    color: filter === v ? "white" : C.indigo,
                    border: `1.5px solid ${filter === v ? C.indigo : "#E2DFC8"}`,
                  }}
                >
                  {l}
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

          {filter === "resolved" && (
            <div className="flex flex-wrap gap-1.5 mb-4 pl-2">
              {resolvedSubTabs.map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setResolvedSubFilter(k)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: resolvedSubFilter === k ? "#2D7A52" : "transparent",
                    color: resolvedSubFilter === k ? "white" : "#2D7A52",
                    border: `1px solid ${resolvedSubFilter === k ? "#2D7A52" : "#C8E6D5"}`,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <AppIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
              <input
                type="text"
                placeholder="Tìm mã KNL, tên khách, mã đơn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ borderColor: "#E2DFC8", color: C.indigo }}
              />
            </div>
            <div>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ borderColor: "#E2DFC8", color: C.indigo }}
              >
                <option value="all">Tất cả lý do</option>
                {Object.entries(REASON_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ borderColor: dateError ? "#C0392B" : "#E2DFC8", color: C.indigo }}
              />
            </div>
            <div>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ borderColor: dateError ? "#C0392B" : "#E2DFC8", color: C.indigo }}
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); setDateError(""); }}
                className="px-4 py-2.5 rounded-xl text-sm font-bold border"
                style={{ borderColor: "#E0E0E0", color: "#8A8DA8" }}
              >
                Xóa lọc ngày
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchComplaints} className="underline font-bold ml-2">Thử lại</button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: C.eggshell }}>
                  {["Mã KNL", "Khách hàng", "Đối tượng liên quan", "Lý do", "Trạng thái", "Ngày gửi"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left font-bold text-xs uppercase tracking-wider"
                      style={{ color: C.indigo }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dateError ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center">
                      <AppIcon name="alert-triangle" className="w-10 h-10 mx-auto mb-3" style={{ color: "#C0392B" }} />
                      <div className="font-bold text-sm" style={{ color: "#C0392B" }}>{dateError}</div>
                      <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Vui lòng chọn khoảng thời gian hợp lệ</p>
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center" style={{ color: "#8A8DA8" }}>
                      <AppIcon name="clock" className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: C.indigo }} />
                      <div className="font-semibold text-sm">Đang tải dữ liệu...</div>
                    </td>
                  </tr>
                ) : complaints.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="text-center py-20">
                        <AppIcon name="search" className="w-12 h-12 mb-4 mx-auto" style={{ color: "#D1D5DB" }} />
                        <div className="font-bold text-sm" style={{ color: C.indigo }}>Không tìm thấy khiếu nại</div>
                        <p className="text-xs mt-1" style={{ color: "#8A8DA8" }}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  complaints.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectComplaint(c)}
                      className="border-t hover:bg-gray-50/80 cursor-pointer transition-colors"
                      style={{ borderColor: "#F0EDD8" }}
                    >
                      <td className="px-5 py-3.5">
                        <code
                          className="text-xs font-semibold px-2 py-1 rounded-md"
                          style={{ color: C.indigo, backgroundColor: C.eggshell, fontFamily: "'Inter', monospace" }}
                        >
                          {c.id.slice(0, 8)}...
                        </code>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold" style={{ color: C.indigo }}>
                          {c.userName ?? c.userId.slice(0, 12)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: "#8A8DA8" }}>
                          {c.voucherName ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: "#8A8DA8" }}>
                          {REASON_LABEL[c.reason] ?? c.reason}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={STATUS_COLOR[c.status] ?? STATUS_COLOR.open}
                        >
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: "#8A8DA8" }}>{fmtDate(c.createdAt)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showPanel && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowPanel(false)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-in"
            >
              {detailLoading ? (
                <div className="flex items-center justify-center h-full">
                  <AppIcon name="clock" className="w-8 h-8 animate-spin" style={{ color: C.indigo }} />
                </div>
              ) : selectedComplaint ? (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: "#F0EDD8" }}>
                    <div>
                      <h3 className="text-lg font-black" style={{ color: C.indigo }}>Chi tiết khiếu nại</h3>
                      <code
                        className="text-xs font-semibold px-2 py-0.5 rounded-md mt-1 inline-block"
                        style={{ color: C.indigo, backgroundColor: C.eggshell, fontFamily: "'Inter', monospace" }}
                      >
                        {selectedComplaint.id.slice(0, 12)}...
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

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Trạng thái</p>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={STATUS_COLOR[selectedComplaint.status] ?? STATUS_COLOR.open}
                      >
                        {STATUS_LABEL[selectedComplaint.status] ?? selectedComplaint.status}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Ngày tạo</p>
                      <p className="text-sm font-semibold" style={{ color: C.indigo }}>{fmtDate(selectedComplaint.createdAt)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Khách hàng</p>
                      <p className="text-sm font-semibold" style={{ color: C.indigo }}>{selectedComplaint.userName ?? "N/A"}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#8A8DA8" }}>ID: {selectedComplaint.userId.slice(0, 8)}...</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Lý do</p>
                      <p className="text-sm font-semibold" style={{ color: C.indigo }}>{REASON_LABEL[selectedComplaint.reason] ?? selectedComplaint.reason}</p>
                    </div>
                    {selectedComplaint.orderCode && (
                      <div className="bg-gray-50 rounded-xl p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Đơn hàng</p>
                        <code
                          className="text-sm font-bold px-2 py-0.5 rounded-md inline-block"
                          style={{ color: C.indigo, backgroundColor: C.eggshell, fontFamily: "'Inter', monospace" }}
                        >
                          {selectedComplaint.orderCode}
                        </code>
                        {selectedComplaint.orderId && (
                          <p className="text-[10px] mt-0.5" style={{ color: "#8A8DA8" }}>ID: {selectedComplaint.orderId.slice(0, 8)}...</p>
                        )}
                      </div>
                    )}
                    {selectedComplaint.voucherName && (
                      <div className="bg-gray-50 rounded-xl p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8DA8" }}>Voucher</p>
                        <p className="text-sm font-semibold" style={{ color: C.indigo }}>{selectedComplaint.voucherName}</p>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A8DA8" }}>Nội dung khiếu nại</h4>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm leading-relaxed" style={{ color: C.indigo }}>{selectedComplaint.description}</p>
                    </div>
                  </div>

                  {selectedComplaint.evidenceUrls.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A8DA8" }}>Bằng chứng</h4>
                      <div className="flex gap-2 flex-wrap">
                        {selectedComplaint.evidenceUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Evidence ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border" style={{ borderColor: "#E2DFC8" }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedComplaint.resolutionNote && (
                    <div className="mb-6">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A8DA8" }}>Kết quả xử lý</h4>
                      <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                        <p className="text-xs font-bold mb-1" style={{ color: "#2D7A52" }}>
                          {(selectedComplaint.resolutionTypes ?? []).map((rt) => RESOLUTION_TYPE_LABEL[rt] ?? rt).join(", ")}
                        </p>
                        <p className="text-sm" style={{ color: "#2D7A52" }}>{selectedComplaint.resolutionNote}</p>

                        {(selectedComplaint.resolutionTypes ?? []).includes("refund") && selectedComplaint.payments && selectedComplaint.payments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            {selectedComplaint.payments.filter(p => p.status === "refunded").map((rp) => (
                              <div key={rp.id} className="text-xs space-y-1" style={{ color: "#2D7A52" }}>
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
                                    <span className="font-semibold">Thời gian hoàn tiền:</span>
                                    <span>{fmtDate(rp.refundedAt)}</span>
                                  </div>
                                )}
                                {rp.method && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold">Phương thức thanh toán:</span>
                                    <span className="uppercase">{rp.method}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold">Số tiền hoàn:</span>
                                  <span>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(rp.amount)}</span>
                                </div>
                              </div>
                            ))}
                            {selectedComplaint.payments.filter(p => p.status === "refunded").length === 0 && (
                              <div className="text-xs" style={{ color: "#856404" }}>
                                <span className="font-semibold">Chưa có giao dịch hoàn tiền trên gateway</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8A8DA8" }}>
                      Phản hồi ({responses.length})
                    </h4>
                    <div className="space-y-3">
                      {responses.map((r) => (
                        <div key={r.id} className="bg-gray-50 rounded-xl p-3.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold" style={{ color: C.indigo }}>
                              {r.responderName ?? r.responderRole}
                            </span>
                            <span className="text-[10px]" style={{ color: "#8A8DA8" }}>{fmtDate(r.createdAt)}</span>
                          </div>
                          <p className="text-sm" style={{ color: C.indigo }}>{r.content}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={newResponse}
                        onChange={(e) => setNewResponse(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendResponse()}
                        placeholder="Nhập phản hồi..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        style={{ borderColor: "#E2DFC8", color: C.indigo }}
                      />
                      <button
                        onClick={handleSendResponse}
                        disabled={!newResponse.trim()}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                        style={{ backgroundColor: C.indigo }}
                      >
                        Gửi
                      </button>
                    </div>
                  </div>

                  {availableActions.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 pt-4 border-t" style={{ borderColor: "#F0EDD8" }}>
                      {availableActions.map((action) => {
                        const config = ACTION_CONFIG[action]
                        return (
                          <button
                            key={action}
                            onClick={() => setDialogAction(action)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md"
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

        {dialogAction && selectedComplaint && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={closeDialog}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div onClick={(e) => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
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

              <p className="text-sm mb-4" style={{ color: "#8A8DA8" }}>
                {dialogAction === "accept" && "Chọn hình thức xử lý khiếu nại?"}
                {dialogAction === "reject" && "Từ chối khiếu nại này?"}
                {dialogAction === "request_info" && "Yêu cầu khách hàng bổ sung thông tin?"}
                {dialogAction === "transfer" && "Chuyển khiếu nại cho chuyên viên xử lý?"}
              </p>

              {dialogAction === "accept" && (
                <div className="mb-4">
                  <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>Hình thức xử lý * (chọn 1 hoặc nhiều)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: "refund" as const, l: "Hoàn tiền", icon: "dollar-sign" },
                      { v: "reissue" as const, l: "Cấp lại", icon: "refresh-cw" },
                      { v: "partner_penalized" as const, l: "Phạt ĐT", icon: "alert-triangle" },
                    ]).map((opt) => {
                      const selected = acceptTypes.includes(opt.v)
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setAcceptTypes(selected ? acceptTypes.filter((t) => t !== opt.v) : [...acceptTypes, opt.v])}
                          className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-bold border-2 transition-all"
                          style={{
                            borderColor: selected ? "#2D7A52" : "#E2DFC8",
                            backgroundColor: selected ? "#E8F5EE" : "transparent",
                            color: selected ? "#2D7A52" : C.indigo,
                          }}
                        >
                          {selected && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center">&#10003;</span>}
                          <AppIcon name={opt.icon} className="w-5 h-5" />
                          {opt.l}
                        </button>
                      )
                    })}
                  </div>
                  {acceptTypes.includes("refund") && (
                    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5 flex items-start gap-2">
                      <AppIcon name="info" className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#1A5FAD" }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: "#1A5FAD" }}>
                        Hoàn tiền sẽ được thực hiện qua Sandbox API của VNPay/PayPal. Nếu gateway lỗi, giao dịch sẽ thất bại.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {dialogAction === "transfer" && (
                <div className="mb-4">
                  <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>Chọn người xử lý *</label>
                  <div className="relative">
                    <AppIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
                    <input
                      type="text"
                      value={adminSearch}
                      onChange={(e) => { setAdminSearch(e.target.value); setTransferTarget(""); setShowAdminDropdown(true) }}
                      onFocus={() => { if (adminSearch.trim()) setShowAdminDropdown(true) }}
                      onBlur={() => setTimeout(() => setShowAdminDropdown(false), 200)}
                      placeholder="Tìm tên hoặc email..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      style={{ borderColor: "#E2DFC8", color: C.indigo }}
                    />
                  </div>
                  {showAdminDropdown && adminSearch.trim().length >= 2 && !transferTarget && (
                    <div className="absolute z-10 w-full max-h-40 overflow-y-auto border rounded-xl mt-1 bg-white shadow-lg" style={{ borderColor: "#E2DFC8" }}>
                      {filteredAdmins.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-center" style={{ color: "#8A8DA8" }}>Không tìm thấy</div>
                      ) : (
                        filteredAdmins.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setTransferTarget(a.id); setAdminSearch(a.fullName); setShowAdminDropdown(false) }}
                            className="w-full text-left px-3 py-2.5 text-xs border-b last:border-0 transition-colors hover:bg-gray-50"
                            style={{ borderColor: "#F0EDD8", color: C.indigo }}
                          >
                            <span className="font-semibold">{a.fullName}</span>
                            <span className="ml-2" style={{ color: "#8A8DA8" }}>{a.email}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-5">
                <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>
                  {dialogAction === "reject" ? "Lý do từ chối *" : dialogAction === "transfer" ? "Nội dung chuyển xử lý *" : "Nội dung xử lý *"}
                </label>
                <textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                  style={{ borderColor: "#E2DFC8", color: C.indigo }}
                  rows={3}
                  placeholder={dialogAction === "reject" ? "Nhập lý do từ chối..." : dialogAction === "transfer" ? "Nhập nội dung chuyển xử lý..." : "Nhập nội dung xử lý..."}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={closeDialog} disabled={actionLoading} className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors hover:bg-gray-50 disabled:opacity-50" style={{ borderColor: "#E2DFC8", color: C.indigo }}>
                  Đóng
                </button>
                <button onClick={executeAction} disabled={actionLoading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-md disabled:opacity-50" style={{ backgroundColor: ACTION_CONFIG[dialogAction].color }}>
                  {actionLoading && <AppIcon name="clock" className="w-4 h-4 animate-spin" />}
                  {actionLoading ? "Đang xử lý..." : ACTION_CONFIG[dialogAction].label}
                </button>
              </div>
            </div>
          </div>
        )}

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
