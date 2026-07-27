import { useState } from "react"
import { Search, MessageSquare, X, Send } from "lucide-react"
import { C, fmtDate, STATUS_LABEL, statusColor } from "@/utils/constants"
import type { Feedback } from "@/types"

const MOCK_FEEDBACK: Feedback[] = [
  { id: "f1", userId: "u01", userName: "Nguyễn Thị Mai", content: "Voucher của tôi không thể sử dụng tại chi nhánh Lê Văn Sỹ dù còn hạn. Mong admin xem xét.", createdAt: "2024-08-01", status: "open" },
  { id: "f2", userId: "u02", userName: "Trần Văn Nam", content: "App bị lỗi khi thanh toán qua VNPay. Màn hình trắng sau khi xác nhận.", createdAt: "2024-07-30", status: "replied", reply: "Chúng tôi đã ghi nhận sự cố và đang khắc phục. Vui lòng thử lại sau 24h." },
  { id: "f3", userId: "u03", userName: "Lê Thị Hoa", content: "Dịch vụ rất tốt! Voucher pizza hôm qua dùng rất ngon. Sẽ tiếp tục ủng hộ.", createdAt: "2024-07-28", status: "closed", reply: "Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của Asa!" },
  { id: "f4", userId: "u04", userName: "Phạm Tuấn Anh", content: "Tại sao voucher spa bị hủy mà không có thông báo? Tôi đã đặt lịch rồi.", createdAt: "2024-07-25", status: "open" },
  { id: "f5", userId: "u05", userName: "Hoàng Minh Đức", content: "Muốn đề xuất thêm danh mục voucher sức khỏe và y tế.", createdAt: "2024-07-22", status: "replied", reply: "Cảm ơn góp ý của bạn. Chúng tôi sẽ xem xét bổ sung trong thời gian tới." },
]

const STATUS_FILTER = [
  { value: "all", label: "Tất cả" },
  { value: "open", label: "Chờ phản hồi" },
  { value: "replied", label: "Đã phản hồi" },
  { value: "closed", label: "Đã đóng" },
]

export function FeedbackManagementPage() {
  const [feedbacks, setFeedbacks] = useState(MOCK_FEEDBACK)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selected, setSelected] = useState<Feedback | null>(null)
  const [reply, setReply] = useState("")

  const filtered = feedbacks.filter((f) => {
    const matchSearch = !search || f.userName.toLowerCase().includes(search.toLowerCase()) || f.content.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || f.status === statusFilter
    return matchSearch && matchStatus
  })

  const openDetail = (f: Feedback) => { setSelected(f); setReply(f.reply ?? "") }

  const sendReply = () => {
    if (!reply.trim() || !selected) return
    setFeedbacks((prev) => prev.map((f) => f.id === selected.id ? { ...f, status: "replied", reply } : f))
    setSelected(null)
  }

  const closeFeedback = (id: string) => {
    setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, status: "closed" } : f))
    setSelected(null)
  }

  const statusCfg: Record<string, { label: string; bg: string; text: string }> = {
    open: { label: "Chờ phản hồi", bg: "#FFF3CD", text: "#856404" },
    replied: { label: "Đã phản hồi", bg: "#E8F5EE", text: "#2D7A52" },
    closed: { label: "Đã đóng", bg: C.eggshell, text: "#8A8DA8" },
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Quản lý Phản hồi</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>
            {feedbacks.filter((f) => f.status === "open").length} chờ phản hồi
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
          <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none bg-white" style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }} placeholder="Tìm tên, nội dung..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTER.map((s) => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)} className="px-3 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: statusFilter === s.value ? C.indigo : "white", color: statusFilter === s.value ? "white" : C.indigo, border: `1px solid ${statusFilter === s.value ? C.indigo : "#E2DFC8"}` }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl">
            <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: "#E2DFC8" }} />
            <div className="font-bold" style={{ color: C.indigo }}>Không có phản hồi</div>
          </div>
        ) : filtered.map((f) => {
          const sc = statusCfg[f.status]
          return (
            <div key={f.id} className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow transition-shadow" onClick={() => openDetail(f)} style={{ borderLeft: f.status === "open" ? `3px solid ${C.peach}` : "3px solid transparent" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0" style={{ backgroundColor: C.peach + "15", color: C.peach }}>{f.userName[0]}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm" style={{ color: C.indigo }}>{f.userName}</div>
                    <div className="text-sm mt-1 line-clamp-2" style={{ color: "#8A8DA8" }}>{f.content}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>{sc.label}</span>
                  <span className="text-xs" style={{ color: "#B0B3C8" }}>{fmtDate(f.createdAt)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black" style={{ color: C.indigo }}>Chi tiết phản hồi</h2>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" style={{ color: "#8A8DA8" }} /></button>
            </div>

            <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: C.eggshell }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ backgroundColor: C.peach + "20", color: C.peach }}>{selected.userName[0]}</div>
                <span className="font-bold text-sm" style={{ color: C.indigo }}>{selected.userName}</span>
                <span className="text-xs ml-auto" style={{ color: "#8A8DA8" }}>{fmtDate(selected.createdAt)}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: C.indigo }}>{selected.content}</p>
            </div>

            {selected.reply && (
              <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: C.teal + "10", borderLeft: `3px solid ${C.teal}` }}>
                <div className="text-xs font-bold mb-2" style={{ color: C.teal }}>Phản hồi từ Admin</div>
                <p className="text-sm" style={{ color: C.indigo }}>{selected.reply}</p>
              </div>
            )}

            {selected.status !== "closed" && (
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Phản hồi</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                  style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                  rows={4}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Nhập nội dung phản hồi..."
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={sendReply} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: C.peach }}>
                    <Send className="w-4 h-4" /> Gửi phản hồi
                  </button>
                  <button onClick={() => closeFeedback(selected.id)} className="px-4 py-2.5 rounded-xl font-bold border text-sm" style={{ borderColor: "#E2DFC8", color: "#8A8DA8" }}>
                    Đóng
                  </button>
                </div>
              </div>
            )}

            {selected.status === "closed" && (
              <div className="text-center py-4 text-sm" style={{ color: "#8A8DA8" }}>Phản hồi này đã được đóng.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
