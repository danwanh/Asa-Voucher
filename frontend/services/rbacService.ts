import { api } from "./api"

type Envelope<T> = { data: T; message?: string }
function unwrap<T>(response: { data: Envelope<T> }) { return response.data.data }

export interface PermissionItem {
  id: string
  key: string
  module: string
  action: string
}

export interface RoleItem {
  id: string
  key: string
  name: string
  description: string | null
  color: string | null
  isSystem: boolean
  permissions: PermissionItem[]
}

export const rbacService = {
  async listRoles() {
    const response = await api.get<Envelope<RoleItem[]>>("/roles")
    return (unwrap(response) as any[]).map((r) => ({
      id: String(r.id),
      key: r.key,
      name: r.name,
      description: r.description,
      color: r.color,
      isSystem: r.is_system,
      permissions: (r.role_permissions ?? []).map((rp: any) => ({
        id: String(rp.permission.id),
        key: rp.permission.key,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    }))
  },

  async getRole(id: string) {
    const r = unwrap(await api.get<Envelope<any>>(`/roles/${id}`)) as any
    return {
      id: String(r.id),
      key: r.key,
      name: r.name,
      description: r.description,
      color: r.color,
      isSystem: r.is_system,
      permissions: (r.role_permissions ?? []).map((rp: any) => ({
        id: String(rp.permission.id),
        key: rp.permission.key,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    }
  },

  async createRole(input: { key: string; name: string; description?: string; color?: string }) {
    return unwrap(await api.post<Envelope<any>>("/roles", input))
  },

  async updateRole(id: string, input: { name?: string; description?: string; color?: string }) {
    return unwrap(await api.patch<Envelope<any>>(`/roles/${id}`, input))
  },

  async deleteRole(id: string) {
    return unwrap(await api.delete<Envelope<any>>(`/roles/${id}`))
  },

  async listPermissions() {
    return (unwrap(await api.get<Envelope<PermissionItem[]>>("/permissions")) as any[]).map((p) => ({
      id: String(p.id),
      key: p.key,
      module: p.module,
      action: p.action,
    }))
  },

  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    return unwrap(await api.put<Envelope<any>>(`/roles/${roleId}/permissions`, { permissionIds }))
  },
}
