import { useState } from "react"
import { Plus, Edit2, Trash2, X, CheckCircle } from "lucide-react"
import { C, STATUS_LABEL, statusColor } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Category } from "@/types"

const MOCK_CATEGORIES: Category[] = [
  { id: "cat1", name: "Ẩm thực", icon: "gift", description: "Nhà hàng, quán ăn, cafe", status: "active", voucherCount: 45 },
  { id: "cat2", name: "Làm đẹp", icon: "heart", description: "Spa, salon, chăm sóc sắc đẹp", status: "active", voucherCount: 32 },
  { id: "cat3", name: "Du lịch", icon: "location", description: "Khách sạn, resort, tour du lịch", status: "active", voucherCount: 28 },
  { id: "cat4", name: "Giải trí", icon: "ticket", description: "Rạp chiếu phim, khu vui chơi", status: "active", voucherCount: 21 },
  { id: "cat5", name: "Thể thao", icon: "shield", description: "Gym, sân bóng, bể bơi", status: "inactive", voucherCount: 8 },
  { id: "cat6", name: "Giáo dục", icon: "document", description: "Trung tâm, khóa học", status: "inactive", voucherCount: 5 },
]

const EMPTY: Omit<Category, "id" | "voucherCount"> = { name: "", icon: "", description: "", status: "active" }

export function CategoryManagementPage() {
  const [categories, setCategories] = useState(MOCK_CATEGORIES)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (c: Category) => { setForm({ name: c.name, icon: c.icon, description: c.description, status: c.status }); setEditId(c.id); setShowForm(true) }

  const saveForm = () => {
    if (!form.name.trim()) return
    if (editId) {
      setCategories((prev) => prev.map((c) => c.id === editId ? { ...c, ...form } : c))
    } else {
      setCategories((prev) => [...prev, { ...form, id: "cat" + Date.now(), voucherCount: 0 }])
    }
    setShowForm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const confirmDelete = () => {
    if (deleteId) setCategories((prev) => prev.filter((c) => c.id !== deleteId))
    setDeleteId(null)
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Quản lý Danh mục</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>{categories.length} danh mục</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: C.peach }}>
          <Plus className="w-4 h-4" /> Thêm danh mục
        </button>
      </div>

      {saved && (
        <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ backgroundColor: C.teal + "20", color: "#2D7A52" }}>
          <CheckCircle className="w-4 h-4" /> Đã lưu thay đổi
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: C.eggshell }}>
              {["Danh mục", "Mô tả", "Số Voucher", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left font-bold text-xs" style={{ color: C.indigo }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const sc = statusColor(c.status)
              return (
                <tr key={c.id} className="border-t hover:bg-muted/20" style={{ borderColor: "#F0EDD8" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                       <AppIcon name={c.icon} className="w-5 h-5" />
                      <span className="font-bold text-sm" style={{ color: C.indigo }}>{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>{c.description}</td>
                  <td className="px-4 py-3 text-xs font-bold" style={{ color: C.indigo }}>{c.voucherCount}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4" style={{ color: C.indigo }} /></button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-4 h-4" style={{ color: C.peach }} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Biểu tượng (emoji)</label>
                 <input className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="tag" />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Mô tả</label>
                <textarea className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none" style={{ borderColor: "#E2DFC8" }} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Mô tả ngắn về danh mục" />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Trạng thái</label>
                <select className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={form.status} onChange={(e) => set("status", e.target.value as "active" | "inactive")}>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Không hoạt động</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveForm} className="flex-1 py-2.5 rounded-xl font-bold text-white" style={{ backgroundColor: C.peach }}>Lưu</button>
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
            <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>Hành động này không thể hoàn tác. Voucher thuộc danh mục này sẽ bị ảnh hưởng.</p>
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
