import { useState } from "react"
import { Shield, Check, Minus, Save, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"

interface Permission {
  id: string
  module: string
  action: string
}

interface RoleConfig {
  id: string
  name: string
  icon: string
  color: string
  permissions: Set<string>
}

const ALL_PERMISSIONS: Permission[] = [
  // Nội dung
  { id: "content.view",    module: "Nội dung",    action: "Xem nội dung" },
  { id: "content.create",  module: "Nội dung",    action: "Tạo nội dung" },
  { id: "content.edit",    module: "Nội dung",    action: "Sửa nội dung" },
  { id: "content.delete",  module: "Nội dung",    action: "Xóa nội dung" },
  // Voucher
  { id: "voucher.view",    module: "Voucher",     action: "Xem voucher" },
  { id: "voucher.approve", module: "Voucher",     action: "Duyệt voucher" },
  { id: "voucher.reject",  module: "Voucher",     action: "Từ chối voucher" },
  { id: "voucher.create",  module: "Voucher",     action: "Tạo voucher" },
  { id: "voucher.edit",    module: "Voucher",     action: "Sửa voucher" },
  // Người dùng
  { id: "user.view",       module: "Người dùng", action: "Xem tài khoản" },
  { id: "user.lock",       module: "Người dùng", action: "Khóa/mở khóa" },
  { id: "user.edit",       module: "Người dùng", action: "Chỉnh sửa TK" },
  // Đối tác
  { id: "partner.view",    module: "Đối tác",     action: "Xem đối tác" },
  { id: "partner.approve", module: "Đối tác",     action: "Duyệt đối tác" },
  { id: "partner.lock",    module: "Đối tác",     action: "Khóa đối tác" },
  // Đơn hàng
  { id: "order.view",      module: "Đơn hàng",   action: "Xem đơn hàng" },
  { id: "order.cancel",    module: "Đơn hàng",   action: "Hủy đơn hàng" },
  { id: "order.refund",    module: "Đơn hàng",   action: "Hoàn tiền" },
  // Bảo mật / Log
  { id: "log.view",        module: "Bảo mật",     action: "Xem nhật ký" },
  { id: "security.lock",   module: "Bảo mật",     action: "Khóa TK bảo mật" },
  { id: "rbac.manage",     module: "Bảo mật",     action: "Quản lý phân quyền" },
]

const MODULES = [...new Set(ALL_PERMISSIONS.map((p) => p.module))]

const INITIAL_ROLES: RoleConfig[] = [
  {
    id: "admin-content", name: "Admin Nội dung", icon: "document", color: "#81B29A",
    permissions: new Set(["content.view","content.create","content.edit","content.delete","voucher.view","voucher.approve","voucher.reject"]),
  },
  {
    id: "admin-operations", name: "Admin Vận hành", icon: "user", color: "#3D405B",
    permissions: new Set(["user.view","user.lock","user.edit","partner.view","partner.approve","partner.lock","order.view","order.cancel","order.refund","voucher.view"]),
  },
  {
    id: "admin-security", name: "Admin Bảo mật", icon: "lock", color: "#E07A5F",
    permissions: new Set(["log.view","security.lock","rbac.manage","user.view","partner.view"]),
  },
  {
    id: "partner-owner", name: "Đối tác chủ TK", icon: "building", color: "#F2CC8F",
    permissions: new Set(["voucher.view","voucher.create","voucher.edit"]),
  },
  {
    id: "voucher-staff", name: "NV Tạo Voucher", icon: "tag", color: "#9CA3AF",
    permissions: new Set(["voucher.view","voucher.create","voucher.edit"]),
  },
  {
    id: "store-staff", name: "NV Cửa hàng", icon: "ticket", color: "#6B7280",
    permissions: new Set([]),
  },
]

export function RBACManagementPage() {
  const [roles, setRoles] = useState<RoleConfig[]>(INITIAL_ROLES)
  const [selectedRole, setSelectedRole] = useState<string>("admin-content")
  const [saved, setSaved] = useState(false)

  const role = roles.find((r) => r.id === selectedRole)!

  const toggle = (permId: string) => {
    if (selectedRole === "admin-security" && permId === "rbac.manage") {
      // Guard: cannot remove the last rbac.manage permission
      const secRole = roles.find((r) => r.id === "admin-security")!
      const othersHaveRbac = roles.some((r) => r.id !== "admin-security" && r.permissions.has("rbac.manage"))
      if (!othersHaveRbac && secRole.permissions.has("rbac.manage")) {
        toast.error("Không thể gỡ bỏ quyền quản lý phân quyền cuối cùng trong hệ thống!")
        return
      }
    }
    setRoles((prev) => prev.map((r) => {
      if (r.id !== selectedRole) return r
      const next = new Set(r.permissions)
      next.has(permId) ? next.delete(permId) : next.add(permId)
      return { ...r, permissions: next }
    }))
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Quản lý Phân quyền (RBAC)</h1>
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Cấu hình quyền truy cập từng chức năng cho từng vai trò trong hệ thống</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
          style={{ backgroundColor: saved ? "#16A34A" : C.indigo }}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Đã lưu!" : "Lưu cấu hình"}
        </button>
      </div>

      <div className="flex gap-5">
        {/* Role list */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b text-xs font-bold" style={{ borderColor: "#F0EDD8", color: "#8A8DA8" }}>VAI TRÒ</div>
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b transition-colors hover:bg-muted/20"
                style={{
                  borderColor: "#F0EDD8",
                  backgroundColor: selectedRole === r.id ? r.color + "15" : "transparent",
                  borderLeft: selectedRole === r.id ? `3px solid ${r.color}` : "3px solid transparent",
                }}
              >
                 <AppIcon name={r.icon} className="w-5 h-5" />
                <div>
                  <div className="text-xs font-bold" style={{ color: selectedRole === r.id ? r.color : C.indigo }}>{r.name}</div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>{r.permissions.size} quyền</div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-xl text-xs flex items-start gap-2" style={{ backgroundColor: "#FFF7ED", color: "#92400E" }}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Thay đổi có hiệu lực ngay ở phiên đăng nhập tiếp theo.
          </div>
        </div>

        {/* Permission matrix */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Role header */}
          <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "#F0EDD8", backgroundColor: role.color + "0D" }}>
             <AppIcon name={role.icon} className="w-7 h-7" />
            <div>
              <div className="font-black text-sm" style={{ color: role.color }}>{role.name}</div>
              <div className="text-xs" style={{ color: "#6B7280" }}>{role.permissions.size} / {ALL_PERMISSIONS.length} quyền đang bật</div>
            </div>
          </div>

          {/* Permissions by module */}
          <div className="divide-y" style={{ borderColor: "#F0EDD8" }}>
            {MODULES.map((mod) => {
              const perms = ALL_PERMISSIONS.filter((p) => p.module === mod)
              const activeCount = perms.filter((p) => role.permissions.has(p.id)).length
              return (
                <div key={mod} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" style={{ color: role.color }} />
                      <span className="text-xs font-black" style={{ color: C.indigo }}>{mod}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: activeCount > 0 ? role.color + "20" : "#F3F4F6", color: activeCount > 0 ? role.color : "#9CA3AF" }}>
                      {activeCount}/{perms.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {perms.map((perm) => {
                      const on = role.permissions.has(perm.id)
                      return (
                        <button
                          key={perm.id}
                          onClick={() => toggle(perm.id)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all"
                          style={{
                            backgroundColor: on ? role.color + "15" : "#F9F9F7",
                            border: `1px solid ${on ? role.color + "40" : "#E5E7EB"}`,
                            color: on ? role.color : "#9CA3AF",
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: on ? role.color : "#E5E7EB" }}
                          >
                            {on ? <Check className="w-2.5 h-2.5 text-white" /> : <Minus className="w-2.5 h-2.5 text-gray-400" />}
                          </div>
                          {perm.action}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
