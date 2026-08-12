import { HttpError } from "../utils/http-error.js";
import * as rbacRepo from "../repositories/rbac.repository.js";
import { isAdminRole, type AuthUser } from "../types/auth.types.js";
import type { CreateRoleInput, UpdatePermissionsInput } from "../validations/rbac.validation.js";
import { prisma } from "../config/prisma.js";

function assertAdminSecurity(user: AuthUser) {
  if (user.role !== "admin_security") {
    throw new HttpError(403, "Bạn không có quyền quản lý phân quyền");
  }
}

export async function listRoles(user: AuthUser) {
  assertAdminSecurity(user);
  return rbacRepo.listRoles();
}

export async function getRole(user: AuthUser, id: string) {
  assertAdminSecurity(user);
  const role = await rbacRepo.findRoleById(id);
  if (!role) throw new HttpError(404, "Không tìm thấy vai trò");
  return role;
}

export async function createRole(user: AuthUser, input: CreateRoleInput) {
  assertAdminSecurity(user);

  const existing = await rbacRepo.findRoleByKey(input.key);
  if (existing) {
    throw new HttpError(409, "Mã vai trò đã tồn tại");
  }

  return rbacRepo.createRole(input);
}

export async function updateRole(user: AuthUser, id: string, input: Record<string, unknown>) {
  assertAdminSecurity(user);

  const role = await rbacRepo.findRoleById(id);
  if (!role) throw new HttpError(404, "Không tìm thấy vai trò");

  return rbacRepo.updateRole(id, input);
}

export async function deleteRole(user: AuthUser, id: string) {
  assertAdminSecurity(user);

  const role = await rbacRepo.findRoleById(id);
  if (!role) throw new HttpError(404, "Không tìm thấy vai trò");
  if (role.is_system) {
    throw new HttpError(403, "Không thể xóa vai trò hệ thống");
  }

  const usersWithRole = await prisma.user.count({ where: { role: role.key } });
  if (usersWithRole > 0) {
    throw new HttpError(409, `Vẫn còn ${usersWithRole} người dùng đang sử dụng vai trò này`);
  }

  await rbacRepo.deleteRole(id);
  return { success: true };
}

export async function listPermissions(user: AuthUser) {
  assertAdminSecurity(user);
  return rbacRepo.listPermissions();
}

export async function updateRolePermissions(
  user: AuthUser,
  roleId: string,
  input: UpdatePermissionsInput,
) {
  assertAdminSecurity(user);

  const role = await rbacRepo.findRoleById(roleId);
  if (!role) throw new HttpError(404, "Không tìm thấy vai trò");

  const hasRbacManage = role.role_permissions.some(
    (rp) => rp.permission.key === "rbac.manage",
  );

  if (hasRbacManage) {
    const allRoles = await rbacRepo.listRoles();
    const otherRolesWithRbacManage = allRoles.some(
      (r) =>
        r.id !== roleId &&
        r.role_permissions.some((rp) => rp.permission.key === "rbac.manage"),
    );

    if (!input.permissionIds.includes(roleId) || !otherRolesWithRbacManage) {
      const newHasRbacManage = input.permissionIds.some((pid) => {
        const perm = role.role_permissions.find((rp) => rp.permission_id === pid);
        return perm?.permission.key === "rbac.manage";
      });

      if (!newHasRbacManage && !otherRolesWithRbacManage) {
        throw new HttpError(403, "Không thể gỡ bỏ quyền quản lý phân quyền cuối cùng trong hệ thống");
      }
    }
  }

  await rbacRepo.setRolePermissions(roleId, input.permissionIds);
  return rbacRepo.findRoleById(roleId);
}
