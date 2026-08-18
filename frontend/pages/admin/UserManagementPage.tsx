import { useEffect, useRef, useState } from "react"
import { Search, MoreVertical, X, Pencil, Eye, EyeOff, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"
import { C, fmtDate } from "@/utils/constants"
import { StatusBadge } from "@/components/StatusBadge"
import { getUsers, getUser, createUser, updateUser } from "@/services/userService"
import { partnerService, type PartnerProfile, type PartnerBranch } from "@/services/partnerService"
import type { AdminUser, Role, UserQuery } from "@/types"
import { useAuthStore } from "@/stores/authStore"

type UserStatusFilter = "all" | "active" | "inactive"

type UserFilters = {
  full_name: string
  email: string
  phone: string
  role: "" | Role
  status: UserStatusFilter
}

const EMPTY_USER_FILTERS: UserFilters = {
  full_name: "",
  email: "",
  phone: "",
  role: "",
  status: "all",
}

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "buyer", label: "Khách hàng" },
  { value: "partner_owner", label: "Chủ đối tác" },
  { value: "partner_voucher_staff", label: "Nhân viên voucher" },
  { value: "partner_store_staff", label: "Nhân viên cửa hàng" },
  { value: "admin_content", label: "Quản trị nội dung" },
  { value: "admin_operations", label: "Quản trị vận hành" },
  { value: "admin_security", label: "Quản trị bảo mật" },
]

const PARTNER_ROLES: Role[] = ["partner_owner", "partner_voucher_staff", "partner_store_staff"]
const ADMIN_ROLES: Role[] = ["admin_content", "admin_operations", "admin_security"]

function getEditableRoles(currentRole: Role): Array<{ value: Role; label: string }> {
  if (PARTNER_ROLES.includes(currentRole)) {
    return ROLE_OPTIONS.filter((r) => PARTNER_ROLES.includes(r.value))
  }
  if (ADMIN_ROLES.includes(currentRole)) {
    return ROLE_OPTIONS.filter((r) => ADMIN_ROLES.includes(r.value))
  }
  return []
}

function buildUserQuery(page: number, limit: number, filters: UserFilters): UserQuery {
  const fullName = filters.full_name.trim()
  const email = filters.email.trim()
  const phone = filters.phone.trim()

  return {
    page,
    limit,
    ...(fullName ? { full_name: fullName } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status !== "all" ? { is_active: filters.status === "active" } : {}),
  }
}

export function UserManagementPage() {
  const [filters, setFilters] = useState<UserFilters>(EMPTY_USER_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>(EMPTY_USER_FILTERS)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [deactivateUser, setDeactivateUser] = useState<AdminUser | null>(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "buyer" as AdminUser["role"],
    partner_id: "",
    partner_branches_id: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [createFormError, setCreateFormError] = useState("")
  const createFormErrorRef = useRef<HTMLDivElement>(null)
  const [partners, setPartners] = useState<PartnerProfile[]>([])
  const [branches, setBranches] = useState<PartnerBranch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [editRoleUser, setEditRoleUser] = useState<AdminUser | null>(null)
  const [editRoleValue, setEditRoleValue] = useState<Role>("buyer")
  const [editRoleLoading, setEditRoleLoading] = useState(false)
  const [editRoleError, setEditRoleError] = useState("")
  const currentUser = useAuthStore((state) => state.user)
  const limit = 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const isOperationsRole = (role: AdminUser["role"]) => String(role).toLowerCase() === "admin_operations"
  const hasActiveFilters = Boolean(
    filters.full_name.trim() ||
    filters.email.trim() ||
    filters.phone.trim() ||
    filters.role ||
    filters.status !== "all"
  )

  useEffect(() => {
    let mounted = true
    async function loadPartners() {
      try {
        const result = await partnerService.listPartners({ limit: 100 })
        if (mounted) setPartners(result.items)
      } catch {
        console.error("Failed to load partners")
      }
    }
    if (showCreate || selectedUser) loadPartners()
    return () => { mounted = false }
  }, [showCreate, selectedUser])

  useEffect(() => {
    let mounted = true
    async function loadBranches() {
      const partnerId = createForm.role === "partner_store_staff" && createForm.partner_id
        ? createForm.partner_id
        : selectedUser?.partner_id
      if (!partnerId) {
        setBranches([])
        return
      }
      try {
        setLoadingBranches(true)
        const result = await partnerService.listBranches(partnerId)
        if (mounted) setBranches(result)
      } catch {
        console.error("Failed to load branches")
      } finally {
        if (mounted) setLoadingBranches(false)
      }
    }
    loadBranches()
    return () => { mounted = false }
  }, [createForm.partner_id, createForm.role, selectedUser?.partner_id])

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedFilters(filters)
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [filters])

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true)
        setError("")

        const result = await getUsers(buildUserQuery(page, limit, appliedFilters))

        setUsers(result.data.items)
        setTotal(result.data.count)
      } catch (error) {
        console.error("Failed to load users:", error)
        setError("Không thể tải danh sách người dùng")
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [page, appliedFilters])

  function getRoleLabel(role: AdminUser["role"]) {
    const labels: Record<AdminUser["role"], string> = {
      buyer: "Khách hàng",
      partner_owner: "Chủ đối tác",
      partner_voucher_staff: "Nhân viên voucher",
      partner_store_staff: "Nhân viên cửa hàng",
      admin_content: "Quản trị nội dung",
      admin_operations: "Quản trị vận hành",
      admin_security: "Quản trị bảo mật",
    }

    return labels[role]
  }

  async function handleViewUser(id: string) {
    try {
      setDetailLoading(true)

      const result = await getUser(id)

      setSelectedUser(result.data)
    } catch (error) {
      console.error("Failed to load user:", error)
      setError("Không thể tải thông tin người dùng")
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()

    try {
      setCreateLoading(true)
      setCreateFormError("")

      const payload: Record<string, unknown> = {
        email: createForm.email,
        password: createForm.password,
        full_name: createForm.full_name,
        phone: createForm.phone || undefined,
        role: createForm.role,
      }

      if (createForm.role === "partner_owner") {
        payload.partner_id = createForm.partner_id || undefined
      } else if (createForm.role === "partner_voucher_staff" || createForm.role === "partner_store_staff") {
        payload.partner_id = createForm.partner_id || undefined
        payload.partner_branches_id = createForm.partner_branches_id || undefined
      }

      await createUser(payload as any)

      toast.success("Tạo người dùng thành công")
      setShowCreate(false)
      setCreateFormError("")
      setCreateForm({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "buyer",
        partner_id: "",
        partner_branches_id: "",
      })
      setShowPassword(false)

      const result = await getUsers(buildUserQuery(page, limit, appliedFilters))
      setUsers(result.data.items)
      setTotal(result.data.count)
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || "Không thể tạo người dùng"
      setCreateFormError(msg)
      toast.error(msg)
      setTimeout(() => {
        createFormErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleDeactivateUser() {
    if (!deactivateUser) return

    try {
      setDeactivateLoading(true)
      setError("")

      await updateUser(deactivateUser.id, {
        is_active: false
      })

      toast.success("Đã vô hiệu hóa người dùng")
      setDeactivateUser(null)

      const result = await getUsers(buildUserQuery(page, limit, appliedFilters))

      setUsers(result.data.items)
      setTotal(result.data.count)
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || "Không thể vô hiệu hóa người dùng"
      console.error("Failed to deactivate user:", error)
      setDeactivateUser(null)
      setError(msg)
      toast.error(msg)
    } finally {
      setDeactivateLoading(false)
    }
  }

  async function handleActivateUser(user: AdminUser) {
    try {
      setError("")

      await updateUser(user.id, {
        is_active: true,
      })

      toast.success("Đã kích hoạt lại người dùng")
      const result = await getUsers(buildUserQuery(page, limit, appliedFilters))

      setUsers(result.data.items)
      setTotal(result.data.count)
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || "Không thể kích hoạt lại người dùng"
      console.error("Failed to activate user:", error)
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleEditRole() {
    if (!editRoleUser) return
    try {
      setEditRoleLoading(true)
      setEditRoleError("")
      await updateUser(editRoleUser.id, { role: editRoleValue })
      toast.success("Đã thay đổi vai trò thành công")
      setEditRoleUser(null)
      const result = await getUsers(buildUserQuery(page, limit, appliedFilters))
      setUsers(result.data.items)
      setTotal(result.data.count)
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || "Không thể thay đổi vai trò"
      setEditRoleError(msg)
      toast.error(msg)
    } finally {
      setEditRoleLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-black text-lg" style={{ color: C.indigo }}>
            Quản lý người dùng ({total})
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: C.indigo }}
          >
            + Thêm người dùng
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.4fr_1fr_1.1fr_1fr_auto]">
          <label className="space-y-1">
            <span className="text-xs font-bold" style={{ color: C.indigo }}>Họ tên</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#8A8DA8" }} />
              <input
                className="w-full rounded-2xl border py-2.5 pl-9 pr-4 text-sm outline-none"
                style={{ borderColor: "#E2DFC8", backgroundColor: "white" }}
                placeholder="Nhập họ tên"
                value={filters.full_name}
                onChange={(e) => setFilters((current) => ({ ...current, full_name: e.target.value }))}
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-bold" style={{ color: C.indigo }}>Email</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#8A8DA8" }} />
              <input
                className="w-full rounded-2xl border py-2.5 pl-9 pr-4 text-sm outline-none"
                style={{ borderColor: "#E2DFC8", backgroundColor: "white" }}
                placeholder="email@example.com"
                value={filters.email}
                onChange={(e) => setFilters((current) => ({ ...current, email: e.target.value }))}
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-bold" style={{ color: C.indigo }}>SĐT</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#8A8DA8" }} />
              <input
                className="w-full rounded-2xl border py-2.5 pl-9 pr-4 text-sm outline-none"
                style={{ borderColor: "#E2DFC8", backgroundColor: "white" }}
                placeholder="0901234567"
                value={filters.phone}
                onChange={(e) => setFilters((current) => ({ ...current, phone: e.target.value }))}
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-bold" style={{ color: C.indigo }}>Vai trò</span>
            <select
              className="w-full rounded-2xl border px-4 py-2.5 text-sm outline-none"
              style={{ borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo }}
              value={filters.role}
              onChange={(e) => setFilters((current) => ({ ...current, role: e.target.value as "" | Role }))}
            >
              <option value="">Tất cả vai trò</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-bold" style={{ color: C.indigo }}>Trạng thái</span>
            <select
              className="w-full rounded-2xl border px-4 py-2.5 text-sm outline-none"
              style={{ borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo }}
              value={filters.status}
              onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value as UserStatusFilter }))}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã hủy</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={() => setFilters({ ...EMPTY_USER_FILTERS })}
              className="flex h-[42px] w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 xl:w-auto"
              style={{ borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo }}
            >
              <X className="h-4 w-4" />
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm">Đang tải danh sách người dùng...</div>
      ) : error ? (
        <div className="p-6 text-center text-sm text-red-500">{error}</div>
      ) : (
        <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: C.eggshell }}>
                  {[
                    "Họ tên",
                    "Email",
                    "SĐT",
                    "Vai trò",
                    "Tham gia",
                    "Trạng thái",
                    "",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: C.indigo }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-muted/30 transition-colors" style={{ borderColor: "#F0EDD8" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: isOperationsRole(u.role) ? C.peach : C.teal, color: "white" }}
                        >
                          {u.full_name ? u.full_name[0] : "?"}
                        </div>
                        <span className="font-semibold text-xs" style={{ color: C.indigo }}>
                          {u.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8", fontFamily: "'Inter', sans-serif" }}>
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {u.phone}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: isOperationsRole(u.role) ? C.peach + "15" : C.teal + "15",
                          color: isOperationsRole(u.role) ? C.peach : C.teal,
                        }}
                      >
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {fmtDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.is_active ? "active" : "cancelled"} />
                    </td>
                    <td className="px-4 py-3 relative">
                      <div className="relative flex justify-center">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                          className="p-1.5 rounded-lg hover:bg-muted"
                        >
                          <MoreVertical className="w-4 h-4" style={{ color: "#8A8DA8" }} />
                        </button>

                        {openMenuId === u.id && (
                          <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border bg-white shadow-lg overflow-hidden">
                            <button
                              onClick={() => {
                                setOpenMenuId(null)
                                handleViewUser(u.id)
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5" style={{ color: "#8A8DA8" }} />
                              Xem chi tiết
                            </button>

                            {u.role !== "buyer" && (
                              <button
                                onClick={() => {
                                  setOpenMenuId(null)
                                  setEditRoleUser(u)
                                  setEditRoleValue(u.role)
                                  setEditRoleError("")
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Pencil className="w-3.5 h-3.5" style={{ color: C.indigo }} />
                                Chỉnh sửa vai trò
                              </button>
                            )}

                            {u.is_active ? (
                              u.id !== currentUser?.id && (
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    setDeactivateUser(u)
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  Vô hiệu hóa
                                </button>
                              )
                            ) : (
                              u.id !== currentUser?.id && (
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    handleActivateUser(u)
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-xs text-green-600 hover:bg-green-50 flex items-center gap-2"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  Kích hoạt lại
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "#F0EDD8" }}>
            <span className="text-xs" style={{ color: "#8A8DA8" }}>
              Trang {page} / {totalPages}
            </span>

            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-40"
              >
                Trước
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>

          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-black text-lg" style={{ color: C.indigo }}>
                    Chi tiết người dùng
                  </h3>

                  <button onClick={() => setSelectedUser(null)} className="text-sm text-gray-500 hover:text-gray-800">
                    ✕
                  </button>
                </div>

                {detailLoading ? (
                  <div className="py-8 text-center text-sm">Đang tải...</div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-semibold">Họ tên: </span>
                      {selectedUser.full_name || "-"}
                    </div>

                    <div>
                      <span className="font-semibold">Email: </span>
                      {selectedUser.email}
                    </div>

                    <div>
                      <span className="font-semibold">SĐT: </span>
                      {selectedUser.phone || "-"}
                    </div>

                    <div>
                      <span className="font-semibold">Vai trò: </span>
                      {getRoleLabel(selectedUser.role)}
                    </div>

                    {selectedUser.partner_id && (
                      <div>
                        <span className="font-semibold">Đối tác: </span>
                        {partners.find((p) => p.id === selectedUser.partner_id)?.businessName || selectedUser.partner_id}
                      </div>
                    )}

                    {selectedUser.partner_branches_id && (
                      <div>
                        <span className="font-semibold">Chi nhánh: </span>
                        {branches.find((b) => b.id === selectedUser.partner_branches_id)?.branchName || selectedUser.partner_branches_id}
                      </div>
                    )}

                    <div>
                      <span className="font-semibold">Trạng thái: </span>
                      {selectedUser.is_active ? "Đang hoạt động" : "Đã khóa"}
                    </div>

                    <div>
                      <span className="font-semibold">Ngày tham gia: </span>
                      {fmtDate(selectedUser.created_at)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <form onSubmit={handleCreateUser} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-black text-lg" style={{ color: C.indigo }}>
                    Thêm người dùng
                  </h3>

                  <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-gray-800">
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {createFormError && (
                    <div ref={createFormErrorRef} className="rounded-xl p-3 text-sm" style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}>
                      {createFormError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold mb-1">Họ tên</label>

                    <input
                      required
                      value={createForm.full_name}
                      onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                      placeholder="Nhập họ tên"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Email</label>

                    <input
                      required
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                      placeholder="example@gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Mật khẩu</label>

                    <div className="relative">
                      <input
                        required
                        type={showPassword ? "text" : "password"}
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        className="w-full px-3 py-2.5 pr-10 rounded-xl border text-sm outline-none"
                        placeholder="Mật khẩu"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" style={{ color: "#8A8DA8" }} />
                        ) : (
                          <Eye className="w-4 h-4" style={{ color: "#8A8DA8" }} />
                        )}
                      </button>
                    </div>
                    <div className="mt-1.5 text-xs" style={{ color: "#8A8DA8" }}>
                      <span className="font-semibold">Quy cách:</span> 8-64 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Số điện thoại</label>

                    <input
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                      placeholder="0901234567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Vai trò</label>

                    <select
                      value={createForm.role}
                      onChange={(e) => {
                        const role = e.target.value as AdminUser["role"]
                        setCreateForm({ ...createForm, role, partner_id: "", partner_branches_id: "" })
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    >
                      <option value="buyer">Khách hàng</option>
                      <option value="partner_owner">Chủ đối tác</option>
                      <option value="partner_voucher_staff">Nhân viên voucher</option>
                      <option value="partner_store_staff">Nhân viên cửa hàng</option>
                      <option value="admin_content">Quản trị nội dung</option>
                      <option value="admin_operations">Quản trị vận hành</option>
                      <option value="admin_security">Quản trị bảo mật</option>
                    </select>
                  </div>

                  {createForm.role === "partner_owner" && (
                    <div>
                      <label className="block text-xs font-bold mb-1">Chọn đối tác</label>
                      <select
                        required
                        value={createForm.partner_id}
                        onChange={(e) => setCreateForm({ ...createForm, partner_id: e.target.value, partner_branches_id: "" })}
                        className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                      >
                        <option value="">Chọn đối tác</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>{p.businessName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(createForm.role === "partner_voucher_staff" || createForm.role === "partner_store_staff") && (
                    <div>
                      <label className="block text-xs font-bold mb-1">Đối tác</label>
                      <select
                        required
                        value={createForm.partner_id}
                        onChange={(e) => setCreateForm({ ...createForm, partner_id: e.target.value, partner_branches_id: "" })}
                        className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                      >
                        <option value="">Chọn đối tác</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>{p.businessName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {createForm.role === "partner_store_staff" && createForm.partner_id && (
                    <div>
                      <label className="block text-xs font-bold mb-1">Chi nhánh</label>
                      <select
                        required
                        value={createForm.partner_branches_id}
                        onChange={(e) => setCreateForm({ ...createForm, partner_branches_id: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                        disabled={loadingBranches}
                      >
                        <option value="">{loadingBranches ? "Đang tải..." : "Chọn chi nhánh"}</option>
                        {branches.filter((b) => b.isActive).map((b) => (
                          <option key={b.id} value={b.id}>{b.branchName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl border text-sm">
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: C.indigo }}
                  >
                    {createLoading ? "Đang tạo..." : "Tạo người dùng"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {deactivateUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="font-black text-lg mb-3" style={{ color: C.indigo }}>
                  Vô hiệu hóa người dùng
                </h3>

                <p className="text-sm text-gray-600 mb-5">
                  Bạn có chắc muốn vô hiệu hóa tài khoản <strong>{deactivateUser.full_name}</strong>?
                </p>

                <p className="text-xs text-gray-500 mb-6">
                  Người dùng sẽ không còn ở trạng thái hoạt động. Dữ liệu tài khoản vẫn được giữ lại.
                </p>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setDeactivateUser(null)} className="px-4 py-2 rounded-xl border text-sm">
                    Hủy
                  </button>

                  <button type="button" onClick={handleDeactivateUser} disabled={deactivateLoading} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 disabled:opacity-50">
                    {deactivateLoading ? "Đang xử lý..." : "Vô hiệu hóa"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {editRoleUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-black text-lg" style={{ color: C.indigo }}>
                    Chỉnh sửa vai trò
                  </h3>
                  <button onClick={() => setEditRoleUser(null)} className="text-sm text-gray-500 hover:text-gray-800">✕</button>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-semibold mb-1">{editRoleUser.full_name}</div>
                  <div className="text-xs text-gray-500">{editRoleUser.email}</div>
                  <div className="text-xs mt-1">
                    <span className="font-semibold">Vai trò hiện tại: </span>
                    {getRoleLabel(editRoleUser.role)}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-bold mb-1">Vai trò mới</label>
                  <select
                    value={editRoleValue}
                    onChange={(e) => setEditRoleValue(e.target.value as Role)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  >
                    {getEditableRoles(editRoleUser.role).map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {editRoleError && (
                  <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
                    {editRoleError}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditRoleUser(null)} className="px-4 py-2 rounded-xl border text-sm">
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleEditRole}
                    disabled={editRoleLoading || editRoleValue === editRoleUser.role}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: C.indigo }}
                  >
                    {editRoleLoading ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
