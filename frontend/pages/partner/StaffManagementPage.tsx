import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle, Eye, Loader2, Pencil, RefreshCw, Search, Users, X } from "lucide-react"
import { toast } from "sonner"
import { C } from "@/utils/constants"
import { useAuthStore } from "@/stores/authStore"
import { partnerService, type PartnerBranch, type PartnerStaffMember, type PartnerStaffRole } from "@/services/partnerService"

type StaffForm = {
  fullName: string
  phone: string
  role: PartnerStaffRole
  branchId: string
}

const ROLE_OPTIONS: Array<{ value: PartnerStaffRole; label: string }> = [
  { value: "partner_voucher_staff", label: "Nhân viên tạo voucher" },
  { value: "partner_store_staff", label: "Nhân viên cửa hàng" },
]

const ROLE_LABELS = ROLE_OPTIONS.reduce<Record<PartnerStaffRole, string>>((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {} as Record<PartnerStaffRole, string>)

function getErrorMessage(error: unknown, fallback: string) {
  const err = error as { response?: { data?: { error?: { message?: string } } } }
  return err?.response?.data?.error?.message ?? fallback
}

function getInitialForm(staff: PartnerStaffMember): StaffForm {
  return {
    fullName: staff.fullName,
    phone: staff.phone,
    role: staff.role,
    branchId: staff.branchId ?? "",
  }
}

export function StaffManagementPage() {
  const user = useAuthStore((state) => state.user)
  const [staff, setStaff] = useState<PartnerStaffMember[]>([])
  const [branches, setBranches] = useState<PartnerBranch[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<PartnerStaffMember | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<StaffForm | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.partnerId) {
      setStaff([])
      setBranches([])
      setError("Không tìm thấy hồ sơ đối tác hiện tại")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [staffResult, branchResult] = await Promise.all([
        partnerService.listPartnerStaff({ page: 1, limit: 100, search: search || undefined }),
        partnerService.listBranches(user.partnerId),
      ])
      setStaff(staffResult.items)
      setBranches(branchResult)
    } catch (loadError) {
      setStaff([])
      setBranches([])
      setError(getErrorMessage(loadError, "Không thể tải danh sách nhân viên"))
    } finally {
      setIsLoading(false)
    }
  }, [search, user?.partnerId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.isActive || branch.id === form?.branchId),
    [branches, form?.branchId],
  )

  const openDetail = async (item: PartnerStaffMember) => {
    setSelectedStaff(item)
    setForm(getInitialForm(item))
    setIsEditing(false)
    try {
      const detail = await partnerService.getPartnerStaff(item.id)
      setSelectedStaff(detail)
      setForm(getInitialForm(detail))
    } catch (detailError) {
      toast.error(getErrorMessage(detailError, "Không thể tải chi tiết nhân viên"))
    }
  }

  const openEdit = async (item: PartnerStaffMember) => {
    await openDetail(item)
    setIsEditing(true)
  }

  const requestSave = () => {
    if (!selectedStaff || !form) return
    if (!form.fullName.trim()) {
      toast.error("Họ tên không được để trống")
      return
    }
    if (!form.branchId) {
      toast.error("Vui lòng chọn chi nhánh phụ trách")
      return
    }
    setConfirmSave(true)
  }

  const saveStaff = async () => {
    if (!selectedStaff || !form) return
    setIsSaving(true)
    try {
      await partnerService.updatePartnerStaff(selectedStaff.id, {
        full_name: form.fullName,
        phone: form.phone.trim() ? form.phone.trim() : null,
        role: form.role,
        partner_branches_id: form.branchId,
      })
      toast.success("Đã cập nhật nhân viên")
      setConfirmSave(false)
      setSelectedStaff(null)
      setIsEditing(false)
      setForm(null)
      await loadData()
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, "Không thể cập nhật nhân viên"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Quản lý Nhân viên</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>{staff.length} nhân viên</p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold disabled:opacity-60"
          style={{ borderColor: "#E2DFC8", color: C.indigo }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Tải lại
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none bg-white"
          style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
          placeholder="Tìm theo tên, email, số điện thoại hoặc chi nhánh..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl p-3 text-sm" style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl bg-white p-6 flex items-center gap-2 text-sm" style={{ color: "#8A8DA8" }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải nhân viên...
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <div className="font-black" style={{ color: C.indigo }}>Không tải được dữ liệu</div>
          <p className="text-sm mt-1 mb-4" style={{ color: "#8A8DA8" }}>{error}</p>
          <button onClick={loadData} className="px-4 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: C.peach }}>
            Thử lại
          </button>
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: C.indigo + "12" }}>
            <Users className="w-7 h-7" style={{ color: C.indigo }} />
          </div>
          <div className="font-black" style={{ color: C.indigo }}>Không có nhân viên</div>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Danh sách sẽ hiển thị khi Admin Operations tạo và phân công nhân viên cho doanh nghiệp.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead style={{ backgroundColor: "#F8F6EA", color: C.indigo }}>
                <tr>
                  <th className="px-4 py-3 text-left font-black">Họ tên</th>
                  <th className="px-4 py-3 text-left font-black">Email</th>
                  <th className="px-4 py-3 text-left font-black">Số điện thoại</th>
                  <th className="px-4 py-3 text-left font-black">Vai trò</th>
                  <th className="px-4 py-3 text-left font-black">Chi nhánh</th>
                  <th className="px-4 py-3 text-left font-black">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-black">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((item) => (
                  <tr key={item.id} className="border-t" style={{ borderColor: "#EEEAD8" }}>
                    <td className="px-4 py-3 font-bold" style={{ color: C.indigo }}>{item.fullName}</td>
                    <td className="px-4 py-3" style={{ color: "#5F6278" }}>{item.email}</td>
                    <td className="px-4 py-3" style={{ color: "#5F6278" }}>{item.phone || "Chưa cập nhật"}</td>
                    <td className="px-4 py-3" style={{ color: "#5F6278" }}>{ROLE_LABELS[item.role]}</td>
                    <td className="px-4 py-3" style={{ color: "#5F6278" }}>{item.branchName}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: item.isActive ? "#E8F5EE" : "#FEE2E2",
                          color: item.isActive ? "#2D7A52" : "#B91C1C",
                        }}
                      >
                        {item.isActive ? "Đang hoạt động" : "Ngưng hoạt động"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openDetail(item)} className="p-2 rounded-lg hover:bg-muted" title="Xem chi tiết">
                          <Eye className="w-4 h-4" style={{ color: C.indigo }} />
                        </button>
                        <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-muted" title="Cập nhật">
                          <Pencil className="w-4 h-4" style={{ color: C.peach }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedStaff && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black" style={{ color: C.indigo }}>{isEditing ? "Cập nhật nhân viên" : "Chi tiết nhân viên"}</h2>
              <button onClick={() => { setSelectedStaff(null); setIsEditing(false); setForm(null) }}>
                <X className="w-5 h-5" style={{ color: "#8A8DA8" }} />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Họ tên</label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none disabled:bg-gray-50"
                  style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                  value={form.fullName}
                  disabled={!isEditing}
                  onChange={(event) => setForm((prev) => prev ? { ...prev, fullName: event.target.value } : prev)}
                />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Email</label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none bg-gray-50"
                  style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                  value={selectedStaff.email}
                  disabled
                />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Số điện thoại</label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none disabled:bg-gray-50"
                  style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                  value={form.phone}
                  disabled={!isEditing}
                  onChange={(event) => setForm((prev) => prev ? { ...prev, phone: event.target.value } : prev)}
                />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Trạng thái tài khoản</label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none bg-gray-50"
                  style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                  value={selectedStaff.isActive ? "Đang hoạt động" : "Ngưng hoạt động"}
                  disabled
                />
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Vai trò nghiệp vụ</label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none disabled:bg-gray-50"
                  style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                  value={form.role}
                  disabled={!isEditing}
                  onChange={(event) => setForm((prev) => prev ? { ...prev, role: event.target.value as PartnerStaffRole } : prev)}
                >
                  {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold block mb-1.5" style={{ color: C.indigo }}>Chi nhánh phụ trách</label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none disabled:bg-gray-50"
                  style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', sans-serif" }}
                  value={form.branchId}
                  disabled={!isEditing}
                  onChange={(event) => setForm((prev) => prev ? { ...prev, branchId: event.target.value } : prev)}
                >
                  <option value="">Chọn chi nhánh</option>
                  {activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchName}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setSelectedStaff(null); setIsEditing(false); setForm(null) }}
                className="flex-1 py-2.5 rounded-xl border-2 font-bold"
                style={{ borderColor: "#E2DFC8", color: C.indigo }}
              >
                Đóng
              </button>
              {isEditing ? (
                <button
                  onClick={requestSave}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white disabled:opacity-70"
                  style={{ backgroundColor: C.peach }}
                >
                  Lưu
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white"
                  style={{ backgroundColor: C.peach }}
                >
                  Cập nhật
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmSave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5" style={{ color: C.teal }} />
              <h3 className="text-lg font-black" style={{ color: C.indigo }}>Xác nhận cập nhật?</h3>
            </div>
            <p className="text-sm" style={{ color: "#8A8DA8" }}>Thông tin nhân viên sẽ được cập nhật theo dữ liệu đã nhập.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmSave(false)} className="flex-1 py-2.5 rounded-xl border-2 font-bold" style={{ borderColor: "#E2DFC8", color: C.indigo }}>
                Hủy
              </button>
              <button onClick={saveStaff} disabled={isSaving} className="flex-1 py-2.5 rounded-xl font-bold text-white disabled:opacity-70" style={{ backgroundColor: C.peach }}>
                {isSaving ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
