import { useEffect, useState } from "react"
import { Plus, Edit2, Trash2, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { categoryService, type CategoryWithCount } from "@/services/categoryService"

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const EMPTY_FORM = { name: "", slug: "", description: "", sort_order: 0 }

export function CategoryManagementPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadCategories() {
    setIsLoading(true)
    try {
      const items = await categoryService.listWithCounts()
      setCategories(items)
    } catch {
      showToast("error", "Không thể tải danh sách danh mục")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }
  const openEdit = (c: CategoryWithCount) => {
    setForm({ name: c.name, slug: c.slug, description: c.description ?? "", sort_order: c.sort_order })
    setEditId(c.id)
    setShowForm(true)
  }

  const set = (k: keyof typeof EMPTY_FORM, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v }
      if (k === "name" && !f.slug) next.slug = slugify(v)
      return next
    })
  }

  async function saveForm() {
    if (!form.name.trim() || !form.slug.trim()) return
    setIsSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description.trim() || undefined,
        sort_order: form.sort_order,
      }
      if (editId) {
        await categoryService.update(editId, payload)
        showToast("success", "Cập nhật danh mục thành công")
      } else {
        await categoryService.create(payload)
        showToast("success", "Tạo danh mục thành công")
      }
      setShowForm(false)
      loadCategories()
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "Thao tác thất bại"
      showToast("error", msg)
    } finally {
      setIsSaving(false)
    }
  }

  function handleDeleteClick(c: CategoryWithCount) {
    if (c.voucherCount > 0) {
      showToast("error", `Không thể xóa danh mục "${c.name}" vì đang có ${c.voucherCount} voucher`)
      return
    }
    setDeleteId(c.id)
  }

  async function confirmDelete() {
    if (!deleteId) return
    const target = categories.find((c) => c.id === deleteId)
    if (target && target.voucherCount > 0) {
      showToast("error", `Không thể xóa danh mục "${target.name}" vì đang có ${target.voucherCount} voucher`)
      setDeleteId(null)
      return
    }
    try {
      await categoryService.remove(deleteId)
      showToast("success", "Xóa danh mục thành công")
      setDeleteId(null)
      loadCategories()
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      const detailsCount = err?.response?.data?.error?.details?.voucherCount
      let msg = err?.response?.data?.error?.message || "Xóa danh mục thất bại"
      if (code === "CATEGORY_IN_USE" && typeof detailsCount === "number") {
        msg = `Không thể xóa danh mục vì đang có ${detailsCount} voucher`
      } else if (code === "CATEGORY_IN_USE") {
        msg = "Danh mục đang được sử dụng, không thể xóa"
      }
      showToast("error", msg)
      setDeleteId(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold text-white"
          style={{ backgroundColor: toast.type === "success" ? "#2D7A52" : "#DC2626" }}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Quản lý Danh mục</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>{isLoading ? "Đang tải..." : `${categories.length} danh mục`}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: C.peach }}>
          <Plus className="w-4 h-4" /> Thêm danh mục
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: C.eggshell }}>
              {["Danh mục", "Mô tả", "Số Voucher", "Thao tác"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/20" style={{ borderColor: "#F0EDD8" }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <AppIcon name="tag" className="w-5 h-5" style={{ color: C.peach }} />
                    <div>
                      <div className="font-bold text-sm" style={{ color: C.indigo }}>{c.name}</div>
                      <div className="text-xs" style={{ color: "#9CA3AF" }}>/{c.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{c.description || "—"}</td>
                <td className="px-4 py-3 text-xs font-bold" style={{ color: C.indigo }}>{c.voucherCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-muted" title="Chỉnh sửa"><Edit2 className="w-4 h-4" style={{ color: C.indigo }} /></button>
                    <button onClick={() => handleDeleteClick(c)} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40" title={c.voucherCount > 0 ? `Không thể xóa - đang có ${c.voucherCount} voucher` : "Xóa"}><Trash2 className="w-4 h-4" style={{ color: c.voucherCount > 0 ? "#9CA3AF" : C.peach }} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && categories.length === 0 && (
          <div className="text-center py-12 text-sm font-semibold" style={{ color: "#8A8DA8" }}>Chưa có danh mục nào. Nhấn "Thêm danh mục" để bắt đầu.</div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black" style={{ color: C.indigo }}>{editId ? "Chỉnh sửa danh mục" : "Thêm danh mục"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" style={{ color: "#8A8DA8" }} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Tên danh mục *</label>
                <input className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nhập tên danh mục" />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Slug *</label>
                <input className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="ten-danh-muc" />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Mô tả</label>
                <textarea className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none" style={{ borderColor: "#E2DFC8" }} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Mô tả ngắn về danh mục" />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Thứ tự</label>
                <input type="number" min={0} className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveForm} disabled={isSaving || !form.name.trim() || !form.slug.trim()} className="flex-1 py-2.5 rounded-xl font-bold text-white disabled:opacity-40" style={{ backgroundColor: C.peach }}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Lưu"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl font-bold border" style={{ borderColor: "#E2DFC8", color: C.indigo }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
            <h3 className="font-black text-lg mb-2" style={{ color: C.indigo }}>Xóa danh mục?</h3>
            <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>Danh mục đang có voucher sẽ không thể xóa. Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl font-bold text-white" style={{ backgroundColor: "#C0392B" }}>Xóa</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold border" style={{ borderColor: "#E2DFC8", color: C.indigo }}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}