import { prisma } from "../config/prisma.js";

const ROLE_INCLUDE = {
  role_permissions: {
    include: {
      permission: { select: { id: true, key: true, module: true, action: true } },
    },
  },
} as const;

export async function listRoles() {
  return prisma.role.findMany({
    include: ROLE_INCLUDE,
    orderBy: { name: "asc" },
  });
}

export async function findRoleById(id: string) {
  return prisma.role.findUnique({ where: { id }, include: ROLE_INCLUDE });
}

export async function findRoleByKey(key: string) {
  return prisma.role.findUnique({ where: { key }, include: ROLE_INCLUDE });
}

export async function createRole(data: {
  key: string;
  name: string;
  description?: string;
  color?: string;
  is_system?: boolean;
}) {
  return prisma.role.create({
    data: {
      key: data.key,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
      is_system: data.is_system ?? false,
    },
  });
}

export async function updateRole(id: string, patch: Record<string, unknown>) {
  return prisma.role.update({ where: { id }, data: patch });
}

export async function deleteRole(id: string) {
  return prisma.role.delete({ where: { id } });
}

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { key: "asc" } });
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  await prisma.rolePermission.deleteMany({ where: { role_id: roleId } });

  if (permissionIds.length === 0) return [];

  return prisma.rolePermission.createMany({
    data: permissionIds.map((permission_id) => ({
      role_id: roleId,
      permission_id,
    })),
  });
}

export async function getRolePermissions(roleId: string): Promise<string[]> {
  const rows = await prisma.rolePermission.findMany({
    where: { role_id: roleId },
    select: { permission_id: true },
  });
  return rows.map((r) => r.permission_id);
}
