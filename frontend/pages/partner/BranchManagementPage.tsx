import { useState } from "react"
import { Plus, Search, Edit2, Trash2, MapPin, Phone, Clock, X, CheckCircle } from "lucide-react"
import { C, STATUS_LABEL, statusColor } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Branch } from "@/types"

const MOCK_BRANCHES: Branch[] = [
  { id: "b1", partnerId: "p1", name: "Pizza Hut Nguyễn Trãi", address: "123 Nguyễn Trãi, Q1", city: "TP.HCM", district: "Quận 1", phone: "028 1234 5678", email: "q1@pizzahut.vn", openTime: "09:00", closeTime: "22:00", status: "active" },
  { id: "b2", partnerId: "p1", name: "Pizza Hut Lê Văn Sỹ", address: "456 Lê Văn Sỹ, Q3", city: "TP.HCM", district: "Quận 3", phone: "028 2345 6789", email: "q3@pizzahut.vn", openTime: "10:00", closeTime: "22:30", status: "active" },
  { id: "b3", partnerId: "p1", name: "Pizza Hut Hoàng Văn Thụ", address: "789 Hoàng Văn Thụ, Tân Bình", city: "TP.HCM", district: "Tân Bình", phone: "028 3456 7890", email: "tanbinh@pizzahut.vn", openTime: "10:00", closeTime: "22:00", status: "inactive" },
]

type FormData = Omit<Branch, "id" | "partnerId">

const EMPTY_FORM: FormData = { name: "", address: "", city: "", district: "", phone: "", email: "", openTime: "08:00", closeTime: "22:00", status: "active" }

export function BranchManagementPage() {
  const [branches, setBranches] = useState(MOCK_BRANCHES)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saved, setSaved] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = branches.filter((b) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.address.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }
  const openEdit = (b: Branch) => { setForm({ name: b.name, address: b.address, city: b.city, district: b.district, phone: b.phone, email: b.email, openTime: b.openTime, closeTime: b.closeTime, status: b.status }); setEditId(b.id); setShowForm(true) }

  const saveForm = () => {
    if (!form.name.trim()) return
    if (editId) {
      setBranches((prev) => prev.map((b) => b.id === editId ? { ...b, ...form } : b))
    } else {
      setBranches((prev) => [...prev, { ...form, id: "b" + Date.now(), partnerId: "p1" }])
    }
    setShowForm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const confirmDelete = () => {
    if (deleteId) setBranches((prev) => prev.filter((b) => b.id !== deleteId))
    setDeleteId(null)
  }

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Quản lý Chi nhánh</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>{branches.length} chi nhánh</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: C.peach }}>
          <Plus className="w-4 h-4" /> Thêm chi nhánh
        </button>
      </div>

      {saved && (
        <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ backgroundColor: C.teal + "20", color: "#2D7A52" }}>
          <CheckCircle className="w-4 h-4" /> Đã lưu thay đổi
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none bg-white"
          style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
          placeholder="Tìm chi nhánh..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((b) => {
          const sc = statusColor(b.status)
          return (
            <div key={b.id} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-black text-sm" style={{ color: C.indigo }}>{b.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>{STATUS_LABEL[b.status]}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4" style={{ color: C.indigo }} /></button>
                  <button onClick={() => setDeleteId(b.id)} className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-4 h-4" style={{ color: C.peach }} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs" style={{ color: "#8A8DA8" }}>
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{b.address}, {b.city}</div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{b.phone}</div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" />{b.openTime} – {b.closeTime}</div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16"><AppIcon name="building" className="w-10 h-10 mb-3 mx-auto" /><div className="font-bold" style={{ color: C.indigo }}>Không tìm thấy chi nhánh</div></div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black" style={{ color: C.indigo }}>{editId ? "Chỉnh sửa Chi nhánh" : "Thêm Chi nhánh"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" style={{ color: "#8A8DA8" }} /></button>
            </div>
            <div className="space-y-4">
              {[
                { key: "name", label: "Tên chi nhánh *", ph: "Nhập tên chi nhánh" },
                { key: "address", label: "Địa chỉ *", ph: "Số nhà, tên đường" },
                { key: "city", label: "Tỉnh/Thành phố", ph: "TP.HCM" },
                { key: "district", label: "Quận/Huyện", ph: "Quận 1" },
                { key: "phone", label: "Số điện thoại", ph: "028 xxxx xxxx" },
                { key: "email", label: "Email", ph: "branch@company.vn" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>{f.label}</label>
                  <input
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                    placeholder={f.ph}
                    value={form[f.key as keyof FormData] as string}
                    onChange={(e) => set(f.key as keyof FormData, e.target.value)}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Giờ mở cửa</label>
                  <input type="time" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={form.openTime} onChange={(e) => set("openTime", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Giờ đóng cửa</label>
                  <input type="time" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E2DFC8" }} value={form.closeTime} onChange={(e) => set("closeTime", e.target.value)} />
                </div>
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
            <h3 className="font-black text-lg mb-2" style={{ color: C.indigo }}>Xóa chi nhánh?</h3>
            <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>Hành động này không thể hoàn tác.</p>
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
