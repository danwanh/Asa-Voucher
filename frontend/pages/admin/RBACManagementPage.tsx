import { useEffect, useState } from "react"
import { Shield, Check, Minus, Save, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { rbacService, type RoleItem, type PermissionItem } from "@/services/rbacService"

export function RBACManagementPage() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [localPerms, setLocalPerms] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [rolesData, permsData] = await Promise.all([
          rbacService.listRoles(),
          rbacService.listPermissions(),
        ])
        if (!mounted) return
        setRoles(rolesData)
        setAllPermissions(permsData)
        if (rolesData.length > 0) {
          setSelectedRoleId(rolesData[0].id)
          setLocalPerms(new Set(rolesData[0].permissions.map((p) => p.id)))
        }
      } catch {
        toast.error("Không thể tải dữ liệu phân quyền")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const selectedRole = roles.find((r) => r.id === selectedRoleId)

  useEffect(() => {
    if (selectedRole) {
      setLocalPerms(new Set(selectedRole.permissions.map((p) => p.id)))
    }
  }, [selectedRoleId])

  const modules = [...new Set(allPermissions.map((p) => p.module))]

  const toggle = (permId: string) => {
    if (selectedRole?.isSystem && selectedRole.key === "admin-security" && permId === "rbac.manage") {
      const othersHaveRbac = roles.some((r) => r.key !== "admin-security" && r.permissions.some((p) => p.id === permId))
      const secStillHas = localPerms.has(permId) && [...localPerms].filter((id) => id === permId).length > 1
      if (!othersHaveRbac && localPerms.has(permId)) {
        toast.error("Không thể gỡ bỏ quyền quản lý phân quyền cuối cùng trong hệ thống!")
        return
      }
    }
    setLocalPerms((prev) => {
      const next = new Set(prev)
      next.has(permId) ? next.delete(permId) : next.add(permId)
      return next
    })
  }

  const handleSave = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      await rbacService.updateRolePermissions(selectedRole.id, [...localPerms])
      setRoles((prev) => prev.map((r) =>
        r.id === selectedRole.id
          ? { ...r, permissions: allPermissions.filter((p) => localPerms.has(p.id)) }
          : r
      ))
      toast.success("Đã lưu cấu hình quyền!")
    } catch {
      toast.error("Lưu thất bại, vui lòng thử lại")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <AppIcon name="clock" className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: C.indigo }} />
          <div className="font-bold text-sm" style={{ color: C.indigo }}>Đang tải dữ liệu phân quyền...</div>
        </div>
      </div>
    )
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
          disabled={saving || !selectedRole}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: saving ? "#16A34A" : C.indigo }}
        >
          {saving ? <AppIcon name="clock" className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
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
                onClick={() => setSelectedRoleId(r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b transition-colors hover:bg-muted/20"
                style={{
                  borderColor: "#F0EDD8",
                  backgroundColor: selectedRoleId === r.id ? (r.color ?? C.indigo) + "15" : "transparent",
                  borderLeft: selectedRoleId === r.id ? `3px solid ${r.color ?? C.indigo}` : "3px solid transparent",
                }}
              >
                <AppIcon name="shield" className="w-5 h-5" style={{ color: r.color ?? C.indigo }} />
                <div>
                  <div className="text-xs font-bold" style={{ color: selectedRoleId === r.id ? (r.color ?? C.indigo) : C.indigo }}>{r.name}</div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>{r.permissions.length} quyền</div>
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
        {selectedRole && (
          <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Role header */}
            <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "#F0EDD8", backgroundColor: (selectedRole.color ?? C.indigo) + "0D" }}>
              <AppIcon name="shield" className="w-7 h-7" style={{ color: selectedRole.color ?? C.indigo }} />
              <div>
                <div className="font-black text-sm" style={{ color: selectedRole.color ?? C.indigo }}>{selectedRole.name}</div>
                <div className="text-xs" style={{ color: "#6B7280" }}>{localPerms.size} / {allPermissions.length} quyền đang bật</div>
              </div>
            </div>

            {/* Permissions by module */}
            <div className="divide-y" style={{ borderColor: "#F0EDD8" }}>
              {modules.map((mod) => {
                const perms = allPermissions.filter((p) => p.module === mod)
                const activeCount = perms.filter((p) => localPerms.has(p.id)).length
                return (
                  <div key={mod} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" style={{ color: selectedRole.color ?? C.indigo }} />
                        <span className="text-xs font-black" style={{ color: C.indigo }}>{mod}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: activeCount > 0 ? (selectedRole.color ?? C.indigo) + "20" : "#F3F4F6", color: activeCount > 0 ? (selectedRole.color ?? C.indigo) : "#9CA3AF" }}>
                        {activeCount}/{perms.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {perms.map((perm) => {
                        const on = localPerms.has(perm.id)
                        return (
                          <button
                            key={perm.id}
                            onClick={() => toggle(perm.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all"
                            style={{
                              backgroundColor: on ? (selectedRole.color ?? C.indigo) + "15" : "#F9F9F7",
                              border: `1px solid ${on ? (selectedRole.color ?? C.indigo) + "40" : "#E5E7EB"}`,
                              color: on ? (selectedRole.color ?? C.indigo) : "#9CA3AF",
                            }}
                          >
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: on ? (selectedRole.color ?? C.indigo) : "#E5E7EB" }}
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
        )}
      </div>
    </div>
  )
}
