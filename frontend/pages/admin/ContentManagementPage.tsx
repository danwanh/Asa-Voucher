import { useEffect, useState } from "react"
import { Plus, Edit2, Eye, EyeOff, Image, FileText, Megaphone, ChevronDown, Loader2, X, AlertCircle } from "lucide-react"
import { C, fmtDate, STATUS_LABEL } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { cmsContentService, type CmsContentFilters } from "@/services/cmsContentService"
import type { CmsContent } from "@/types"

type ContentType = "category" | "banner" | "article" | "popup" | "policy"

const TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  category: { label: "Danh mục",  icon: <AppIcon name="tag" className="w-3.5 h-3.5" />,       color: "#4338CA", bg: "#EEF2FF" },
  banner:   { label: "Banner",    icon: <Image className="w-3.5 h-3.5" />,                     color: "#B45309", bg: "#FEF3C7" },
  article:  { label: "Bài viết",  icon: <FileText className="w-3.5 h-3.5" />,                  color: "#0F766E", bg: "#CCFBF1" },
  popup:    { label: "Popup",     icon: <Megaphone className="w-3.5 h-3.5" />,                 color: "#7C3AED", bg: "#EDE9FE" },
  policy:   { label: "Chính sách", icon: <FileText className="w-3.5 h-3.5" />,                 color: "#DC2626", bg: "#FEE2E2" },
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Đang hiển thị", color: "#2D7A52", bg: "#E8F5EE" },
  hidden: { label: "Đã ẩn",         color: "#6B7280", bg: "#F3F4F6" },
}

export function ContentManagementPage() {
  const [items, setItems] = useState<CmsContent[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<CmsContentFilters>({ page: 1, limit: 20 })

  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<CmsContent | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const [form, setForm] = useState({
    content_type: "banner" as ContentType,
    title: "",
    content: "",
    image_url: "",
    display_time: "",
    status: "active",
    sort_order: 0,
  })

  async function loadContents() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await cmsContentService.list(filters)
      setItems(res.rows)
      setTotal(res.total)
    } catch {
      setError("Không thể tải danh sách nội dung")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadContents() }, [filters])

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  function openCreate() {
    setEditItem(null)
    setForm({ content_type: "banner", title: "", content: "", image_url: "", display_time: "", status: "active", sort_order: items.length + 1 })
    setShowModal(true)
  }

  function openEdit(item: CmsContent) {
    setEditItem(item)
    setForm({
      content_type: item.content_type as ContentType,
      title: item.title,
      content: item.content || "",
      image_url: item.image_url || "",
      display_time: item.display_time ? item.display_time.slice(0, 16) : "",
      status: item.status,
      sort_order: item.sort_order,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setIsSaving(true)
    try {
      const payload = {
        content_type: form.content_type,
        title: form.title,
        content: form.content || undefined,
        image_url: form.image_url || undefined,
        display_time: form.display_time || undefined,
        status: form.status,
        sort_order: form.sort_order,
      }
      if (editItem) {
        await cmsContentService.update(editItem.id, payload)
        showToast("success", "Cập nhật nội dung thành công")
      } else {
        await cmsContentService.create(payload)
        showToast("success", "Tạo nội dung thành công")
      }
      setShowModal(false)
      loadContents()
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "Thao tác thất bại"
      showToast("error", msg)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggle(id: string) {
    try {
      await cmsContentService.toggleStatus(id)
      loadContents()
    } catch {
      showToast("error", "Đổi trạng thái thất bại")
    }
  }

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold text-white"
          style={{ backgroundColor: toast.type === "success" ? "#2D7A52" : "#DC2626" }}>
          {toast.type === "success" ? <Eye className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Quản lý Nội dung</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>Banner, bài viết, popup, chính sách hiển thị trên hệ thống</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: C.teal }}>
          <Plus className="w-4 h-4" /> Tạo nội dung
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["category", "banner", "article", "popup", "policy"] as ContentType[]).map((t) => {
          const tc = TYPE_CONFIG[t]
          const active = filters.content_type === t
          return (
            <button key={t} onClick={() => setFilters({ ...filters, content_type: active ? undefined : t, page: 1 })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ backgroundColor: active ? C.teal : "white", color: active ? "white" : "#6B7280", border: `1px solid ${active ? C.teal : "#E5E7EB"}` }}>
              <span style={{ color: active ? "white" : tc.color }}>{tc.icon}</span>
              {tc.label}
            </button>
          )
        })}
        <select value={filters.status || ""} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
          className="ml-auto px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none bg-white" style={{ borderColor: "#E5E7EB", color: C.indigo }}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hiển thị</option>
          <option value="hidden">Đã ẩn</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.teal }} />
          <span className="ml-2 text-sm" style={{ color: "#8A8DA8" }}>Đang tải...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: "#FEE2E2" }}>
          <AlertCircle className="w-5 h-5" style={{ color: "#B91C1C" }} />
          <span className="text-sm font-bold" style={{ color: "#B91C1C" }}>{error}</span>
        </div>
      )}

      {/* Content list */}
      {!isLoading && !error && (
        <div className="space-y-3">
          {items.map((item) => {
            const tc = TYPE_CONFIG[item.content_type as ContentType] || TYPE_CONFIG.banner
            const sc = STATUS_CFG[item.status] || STATUS_CFG.active
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4 p-4">
                  {item.image_url ? (
                    <div className="w-28 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ backgroundColor: tc.bg }}>
                      {tc.icon}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold" style={{ backgroundColor: tc.bg, color: tc.color }}>
                        {tc.icon} {tc.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ backgroundColor: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm mb-0.5 truncate" style={{ color: C.indigo }}>{item.title}</h3>
                    <p className="text-xs line-clamp-1" style={{ color: "#6B7280" }}>{item.content || "—"}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "#9CA3AF" }}>
                      <span>Tạo {fmtDate(item.created_at)}</span>
                      {item.display_time && <span>Hiển thị: {fmtDate(item.display_time)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleToggle(item.id)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title={item.status === "active" ? "Ẩn" : "Hiện"}>
                      {item.status === "active" ? <EyeOff className="w-4 h-4" style={{ color: "#E07A5F" }} /> : <Eye className="w-4 h-4" style={{ color: "#81B29A" }} />}
                    </button>
                    <button onClick={() => openEdit(item)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Chỉnh sửa">
                      <Edit2 className="w-4 h-4" style={{ color: "#6B7280" }} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {items.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-black/5">
              <AppIcon name="package" className="w-10 h-10 mb-2 mx-auto" />
              <div className="font-bold text-sm" style={{ color: C.indigo }}>Không có nội dung</div>
              <div className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Nhấn "Tạo nội dung" để bắt đầu</div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: "#F3F4F6" }}>
              <h3 className="font-black text-lg" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
                {editItem ? "Chỉnh sửa nội dung" : "Tạo nội dung mới"}
              </h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" style={{ color: "#6B7280" }} /></button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Type */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#6B7280" }}>Loại nội dung</label>
                <div className="grid grid-cols-5 gap-2">
                  {(["category", "banner", "article", "popup", "policy"] as ContentType[]).map((t) => {
                    const tc = TYPE_CONFIG[t]
                    return (
                      <button key={t} onClick={() => setForm({ ...form, content_type: t })}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-bold transition-all"
                        style={{ borderColor: form.content_type === t ? tc.color : "#E5E7EB", backgroundColor: form.content_type === t ? tc.bg : "transparent", color: form.content_type === t ? tc.color : "#6B7280" }}>
                        {tc.icon}
                        {tc.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Tiêu đề *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nhập tiêu đề..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: "#E5E7EB" }} />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Nội dung</label>
                <textarea rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Nội dung hiển thị..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none resize-none" style={{ borderColor: "#E5E7EB" }} />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>URL ảnh</label>
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: "#E5E7EB" }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Trạng thái</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: "#E5E7EB" }}>
                    <option value="active">Hiển thị</option>
                    <option value="hidden">Ẩn</option>
                  </select>
                </div>
                {/* Sort order */}
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Thứ tự</label>
                  <input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: "#E5E7EB" }} />
                </div>
              </div>

              {/* Display time */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Thời gian hiển thị</label>
                <input type="datetime-local" value={form.display_time} onChange={(e) => setForm({ ...form, display_time: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: "#E5E7EB" }} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5 pt-3 border-t" style={{ borderColor: "#F3F4F6" }}>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Hủy</button>
              <button onClick={handleSave} disabled={isSaving || !form.title.trim()} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40" style={{ backgroundColor: C.teal }}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editItem ? "Lưu thay đổi" : "Tạo nội dung"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
