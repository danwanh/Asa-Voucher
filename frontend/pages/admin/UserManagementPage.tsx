import { useEffect, useState } from "react"
import { Search, MoreVertical } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"
import { StatusBadge } from "@/components/StatusBadge"
import { getUsers, getUser, createUser, updateUser } from "@/services/userService"
import type { AdminUser } from "@/types"

export function UserManagementPage() {
  const [search, setSearch] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
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
  })

  const limit = 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const isOperationsRole = (role: AdminUser["role"]) => String(role).toLowerCase() === "admin_operations"

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(search.trim())
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true)
        setError("")

        const result = await getUsers({
          page,
          limit,
          search: searchQuery || undefined,
        })

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
  }, [page, searchQuery])

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
      setError("")

      await createUser({
        email: createForm.email,
        password: createForm.password,
        full_name: createForm.full_name,
        phone: createForm.phone || undefined,
        role: createForm.role,
      })

      setShowCreate(false)

      setCreateForm({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "buyer",
      })

      const result = await getUsers({
        page,
        limit,
        search: searchQuery || undefined,
      })

      setUsers(result.data.items)
      setTotal(result.data.count)
    } catch (error) {
      console.error("Failed to create user:", error)
      setError("Không thể tạo người dùng")
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

      setDeactivateUser(null)

      const result = await getUsers({
        page,
        limit,
        search: searchQuery || undefined,
      })

      setUsers(result.data.items)
      setTotal(result.data.count)
    } catch (error) {
      console.error("Failed to deactivate user:", error)
      setError("Không thể vô hiệu hóa người dùng")
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

      const result = await getUsers({
        page,
        limit,
        search: searchQuery || undefined,
      })

      setUsers(result.data.items)
      setTotal(result.data.count)
    } catch (error) {
      console.error("Failed to activate user:", error)
      setError("Không thể kích hoạt lại người dùng")
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
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

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border text-sm outline-none"
            style={{ borderColor: "#E2DFC8", backgroundColor: "white" }}
            placeholder="Tìm người dùng..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
            }}
          />
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
                    "Đơn hàng",
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
                    <td className="px-4 py-3 text-xs font-semibold text-center" style={{ color: C.indigo }}>
                      -
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#8A8DA8" }}>
                      {fmtDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.is_active ? "active" : "cancelled"} />
                    </td>
                    <td className="px-4 py-3">
  <div className="relative flex justify-center">
    <button
      onClick={() =>
        setOpenMenuId(openMenuId === u.id ? null : u.id)
      }
      className="p-1.5 rounded-lg hover:bg-muted"
    >
      <MoreVertical
        className="w-4 h-4"
        style={{ color: "#8A8DA8" }}
      />
    </button>

    {openMenuId === u.id && (
      <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border bg-white shadow-lg overflow-hidden">
        <button
          onClick={() => {
            setOpenMenuId(null)
            handleViewUser(u.id)
          }}
          className="w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50"
        >
          Xem chi tiết
        </button>

        {u.is_active ? (
          <button
            onClick={() => {
              setOpenMenuId(null)
              setDeactivateUser(u)
            }}
            className="w-full px-4 py-2.5 text-left text-xs text-red-500 hover:bg-red-50"
          >
            Vô hiệu hóa
          </button>
        ) : (
          <button
            onClick={() => {
              setOpenMenuId(null)
              handleActivateUser(u)
            }}
            className="w-full px-4 py-2.5 text-left text-xs text-green-600 hover:bg-green-50"
          >
            Kích hoạt lại
          </button>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <form onSubmit={handleCreateUser} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-black text-lg" style={{ color: C.indigo }}>
                    Thêm người dùng
                  </h3>

                  <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-gray-800">
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
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

                    <input
                      required
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                      placeholder="Mật khẩu"
                    />
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
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as AdminUser["role"] })}
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
        </div>
      )}
    </div>
  )
}
