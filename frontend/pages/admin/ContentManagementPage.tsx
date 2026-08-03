import { useState } from "react"
import { Plus, Edit2, Trash2, X, Eye, EyeOff, Image, FileText, Megaphone, ChevronDown } from "lucide-react"
import { C, fmtDate, STATUS_LABEL, statusColor } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"

type ContentType = "banner" | "announcement" | "policy"

interface ContentItem {
  id: string
  type: ContentType
  title: string
  body: string
  target: string
  status: "active" | "inactive" | "scheduled"
  startDate: string
  endDate?: string
  priority: number
  imageUrl?: string
}

const MOCK_CONTENT: ContentItem[] = [
  {
    id: "c1", type: "banner", title: "Flash Sale Tháng 7 – Giảm đến 70%",
    body: "Ưu đãi lớn nhất năm! Hàng trăm voucher giảm sâu từ các thương hiệu hàng đầu.",
    target: "all", status: "active", startDate: "2026-07-01", endDate: "2026-07-31", priority: 1,
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=200&fit=crop",
  },
  {
    id: "c2", type: "announcement", title: "Nâng cấp hệ thống thanh toán",
    body: "Hệ thống thanh toán sẽ bảo trì từ 02:00 – 04:00 ngày 15/07/2026. Xin lỗi vì sự bất tiện này.",
    target: "all", status: "scheduled", startDate: "2026-07-14", endDate: "2026-07-15", priority: 2,
  },
  {
    id: "c3", type: "policy", title: "Chính sách hoàn tiền mới",
    body: "Kể từ ngày 01/08/2026, chính sách hoàn tiền được mở rộng lên 14 ngày kể từ ngày mua.",
    target: "customer", status: "active", startDate: "2026-07-01", priority: 3,
  },
  {
    id: "c4", type: "banner", title: "Chào mừng Đối tác mới – Calla Spa",
    body: "Hệ thống Spa cao cấp Calla vừa gia nhập ASA Voucher với hơn 20 chi nhánh toàn quốc.",
    target: "all", status: "inactive", startDate: "2026-06-01", endDate: "2026-06-30", priority: 4,
    imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=200&fit=crop",
  },
  {
    id: "c5", type: "policy", title: "Điều khoản dịch vụ – Cập nhật v2.1",
    body: "Điều khoản dịch vụ đã được cập nhật nhằm tăng cường bảo vệ người dùng và minh bạch giao dịch.",
    target: "all", status: "active", startDate: "2026-05-01", priority: 5,
  },
]

const TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  banner:       { label: "Banner",       icon: <Image className="w-3.5 h-3.5" />,     color: "#4338CA", bg: "#EEF2FF" },
  announcement: { label: "Thông báo",   icon: <Megaphone className="w-3.5 h-3.5" />, color: "#B45309", bg: "#FEF3C7" },
  policy:       { label: "Chính sách",  icon: <FileText className="w-3.5 h-3.5" />,  color: "#0F766E", bg: "#CCFBF1" },
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: "Đang hiển thị", color: "#2D7A52", bg: "#E8F5EE" },
  inactive:  { label: "Đã tắt",        color: "#6B7280", bg: "#F3F4F6" },
  scheduled: { label: "Đã lên lịch",   color: "#1A5FAD", bg: "#E0EEFF" },
}

const TARGET_LABELS: Record<string, string> = { all: "Tất cả", customer: "Khách hàng", partner: "Đối tác" }

export function ContentManagementPage() {
  const [items, setItems] = useState<ContentItem[]>(MOCK_CONTENT)
  const [filterType, setFilterType] = useState<"all" | ContentType>("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<ContentItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null)
  const [form, setForm] = useState<Partial<ContentItem>>({
    type: "banner", title: "", body: "", target: "all", status: "active", startDate: "", priority: 99,
  })

  const filtered = items.filter((i) => {
    const matchType = filterType === "all" || i.type === filterType
    const matchStatus = filterStatus === "all" || i.status === filterStatus
    return matchType && matchStatus
  })

  const openCreate = () => {
    setEditItem(null)
    setForm({ type: "banner", title: "", body: "", target: "all", status: "active", startDate: "", priority: items.length + 1 })
    setShowModal(true)
  }

  const openEdit = (item: ContentItem) => {
    setEditItem(item)
    setForm({ ...item })
    setShowModal(true)
  }

  const saveItem = () => {
    if (!form.title?.trim() || !form.body?.trim()) return
    if (editItem) {
      setItems((prev) => prev.map((i) => i.id === editItem.id ? { ...editItem, ...form } as ContentItem : i))
    } else {
      const newItem: ContentItem = {
        id: `c${Date.now()}`,
        type: form.type ?? "banner",
        title: form.title ?? "",
        body: form.body ?? "",
        target: form.target ?? "all",
        status: form.status ?? "active",
        startDate: form.startDate ?? new Date().toISOString().split("T")[0],
        endDate: form.endDate,
        priority: form.priority ?? 99,
        imageUrl: form.imageUrl,
      }
      setItems((prev) => [newItem, ...prev])
    }
    setShowModal(false)
  }

  const toggleStatus = (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: i.status === "active" ? "inactive" : "active" } : i))
  }

  const deleteItem = () => {
    if (deleteId) setItems((prev) => prev.filter((i) => i.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Quản lý Nội dung</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>Banner, thông báo, chính sách hiển thị trên hệ thống</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
          style={{ backgroundColor: C.teal }}
        >
          <Plus className="w-4 h-4" /> Tạo nội dung
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Tất cả", value: items.length, color: C.indigo, type: "all" as const },
          { label: "Banner", value: items.filter((i) => i.type === "banner").length, color: "#4338CA", type: "banner" as ContentType },
          { label: "Thông báo", value: items.filter((i) => i.type === "announcement").length, color: "#B45309", type: "announcement" as ContentType },
          { label: "Chính sách", value: items.filter((i) => i.type === "policy").length, color: "#0F766E", type: "policy" as ContentType },
          { label: "Đang hiển thị", value: items.filter((i) => i.status === "active").length, color: "#2D7A52", type: "all" as const },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => setFilterType(s.type)}
            className="bg-white rounded-2xl p-3 text-center border border-black/5 hover:shadow-sm transition-all"
            style={{ outline: filterType === s.type && s.type !== "all" ? `2px solid ${s.color}` : "none" }}
          >
            <div className="text-xl font-black" style={{ color: s.color, fontFamily: "'Nunito', sans-serif" }}>{s.value}</div>
            <div className="text-xs mt-0.5 font-semibold" style={{ color: "#6B7280" }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "banner", "announcement", "policy"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              backgroundColor: filterType === t ? C.teal : "white",
              color: filterType === t ? "white" : "#6B7280",
              border: `1px solid ${filterType === t ? C.teal : "#E5E7EB"}`,
            }}
          >
            {t !== "all" && <span style={{ color: filterType === t ? "white" : TYPE_CONFIG[t].color }}>{TYPE_CONFIG[t].icon}</span>}
            {t === "all" ? "Tất cả loại" : TYPE_CONFIG[t].label}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none bg-white"
            style={{ borderColor: "#E5E7EB", color: C.indigo }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hiển thị</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="inactive">Đã tắt</option>
          </select>
        </div>
      </div>

      {/* Content list */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const tc = TYPE_CONFIG[item.type]
          const sc = STATUS_CFG[item.status]
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4 p-4">
                {/* Thumbnail or type icon */}
                {item.imageUrl ? (
                  <div className="w-28 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ backgroundColor: tc.bg }}>
                    <AppIcon name={item.type === "announcement" ? "bell" : item.type === "policy" ? "document" : "image"} className="w-5 h-5" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold" style={{ backgroundColor: tc.bg, color: tc.color }}>
                      {tc.icon} {tc.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ backgroundColor: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                      {TARGET_LABELS[item.target]}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm mb-0.5 truncate" style={{ color: C.indigo }}>{item.title}</h3>
                  <p className="text-xs line-clamp-1" style={{ color: "#6B7280" }}>{item.body}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "#9CA3AF" }}>
                    <span>Từ {fmtDate(item.startDate)}</span>
                    {item.endDate && <span>→ {fmtDate(item.endDate)}</span>}
                    <span className="ml-auto">Ưu tiên #{item.priority}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    title="Xem trước"
                  >
                    <Eye className="w-4 h-4" style={{ color: "#6B7280" }} />
                  </button>
                  <button
                    onClick={() => toggleStatus(item.id)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    title={item.status === "active" ? "Tắt hiển thị" : "Bật hiển thị"}
                  >
                    {item.status === "active"
                      ? <EyeOff className="w-4 h-4" style={{ color: "#E07A5F" }} />
                      : <Eye className="w-4 h-4" style={{ color: "#81B29A" }} />}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" style={{ color: "#6B7280" }} />
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="p-2 rounded-xl hover:bg-red-50 transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-black/5">
            <AppIcon name="package" className="w-10 h-10 mb-2 mx-auto" />
            <div className="font-bold text-sm" style={{ color: C.indigo }}>Không có nội dung</div>
            <div className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Nhấn "Tạo nội dung" để bắt đầu</div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: "#F3F4F6" }}>
              <h3 className="font-black text-lg" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
                {editItem ? "Chỉnh sửa nội dung" : "Tạo nội dung mới"}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" style={{ color: "#6B7280" }} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Type */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#6B7280" }}>Loại nội dung</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["banner", "announcement", "policy"] as ContentType[]).map((t) => {
                    const tc = TYPE_CONFIG[t]
                    return (
                      <button
                        key={t}
                        onClick={() => setForm({ ...form, type: t })}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-bold transition-all"
                        style={{
                          borderColor: form.type === t ? tc.color : "#E5E7EB",
                          backgroundColor: form.type === t ? tc.bg : "transparent",
                          color: form.type === t ? tc.color : "#6B7280",
                        }}
                      >
                        <AppIcon name={t === "banner" ? "image" : t === "announcement" ? "bell" : "document"} className="w-5 h-5" />
                        {tc.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Tiêu đề *</label>
                <input
                  value={form.title ?? ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Nhập tiêu đề nội dung..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none"
                  style={{ borderColor: "#E5E7EB" }}
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Nội dung *</label>
                <textarea
                  rows={3}
                  value={form.body ?? ""}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Nội dung hiển thị cho người dùng..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none resize-none"
                  style={{ borderColor: "#E5E7EB" }}
                />
              </div>

              {/* Image URL (banner only) */}
              {form.type === "banner" && (
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>URL ảnh banner</label>
                  <input
                    value={form.imageUrl ?? ""}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none"
                    style={{ borderColor: "#E5E7EB" }}
                  />
                  {form.imageUrl && (
                    <div className="mt-2 h-24 rounded-xl overflow-hidden">
                      <img src={form.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Target */}
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Đối tượng</label>
                  <select
                    value={form.target ?? "all"}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none"
                    style={{ borderColor: "#E5E7EB" }}
                  >
                    <option value="all">Tất cả</option>
                    <option value="customer">Khách hàng</option>
                    <option value="partner">Đối tác</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Trạng thái</label>
                  <select
                    value={form.status ?? "active"}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ContentItem["status"] })}
                    className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none"
                    style={{ borderColor: "#E5E7EB" }}
                  >
                    <option value="active">Đang hiển thị</option>
                    <option value="inactive">Tắt</option>
                    <option value="scheduled">Lên lịch</option>
                  </select>
                </div>

                {/* Start date */}
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={form.startDate ?? ""}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none"
                    style={{ borderColor: "#E5E7EB" }}
                  />
                </div>

                {/* End date */}
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Ngày kết thúc</label>
                  <input
                    type="date"
                    value={form.endDate ?? ""}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none"
                    style={{ borderColor: "#E5E7EB" }}
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Độ ưu tiên (số nhỏ hơn = hiển thị trước)</label>
                <input
                  type="number"
                  min={1}
                  value={form.priority ?? 99}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none"
                  style={{ borderColor: "#E5E7EB" }}
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5 pt-3 border-t" style={{ borderColor: "#F3F4F6" }}>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Hủy</button>
              <button onClick={saveItem} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: C.teal }}>
                {editItem ? "Lưu thay đổi" : "Tạo nội dung"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#F3F4F6" }}>
              <h3 className="font-black text-sm" style={{ color: C.indigo }}>Xem trước nội dung</h3>
              <button onClick={() => setPreviewItem(null)}><X className="w-4 h-4" style={{ color: "#6B7280" }} /></button>
            </div>
            {previewItem.imageUrl && (
              <div className="h-44 overflow-hidden">
                <img src={previewItem.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold"
                  style={{ backgroundColor: TYPE_CONFIG[previewItem.type].bg, color: TYPE_CONFIG[previewItem.type].color }}>
                  {TYPE_CONFIG[previewItem.type].icon} {TYPE_CONFIG[previewItem.type].label}
                </span>
              </div>
              <h2 className="font-black text-lg mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{previewItem.title}</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#4B5563" }}>{previewItem.body}</p>
              <div className="flex gap-3 mt-4 pt-3 border-t text-xs" style={{ borderColor: "#F3F4F6", color: "#9CA3AF" }}>
                <span>Từ {fmtDate(previewItem.startDate)}</span>
                {previewItem.endDate && <span>→ {fmtDate(previewItem.endDate)}</span>}
                <span className="ml-auto">{TARGET_LABELS[previewItem.target]}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <AppIcon name="trash" className="w-10 h-10 mb-3 mx-auto" />
            <h3 className="font-black text-lg mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Xóa nội dung?</h3>
            <p className="text-sm mb-4" style={{ color: "#6B7280" }}>Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Hủy</button>
              <button onClick={deleteItem} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: "#EF4444" }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
