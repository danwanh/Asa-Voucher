import type { PrismaClient } from "@prisma/client";

type SeedContext = {
  prisma: PrismaClient;
};

const PERMISSIONS_DATA = [
  { key: "content.view", module: "Nội dung", action: "Xem nội dung" },
  { key: "content.create", module: "Nội dung", action: "Tạo nội dung" },
  { key: "content.edit", module: "Nội dung", action: "Sửa nội dung" },
  { key: "content.delete", module: "Nội dung", action: "Xóa nội dung" },
  { key: "voucher.view", module: "Voucher", action: "Xem voucher" },
  { key: "voucher.approve", module: "Voucher", action: "Duyệt voucher" },
  { key: "voucher.reject", module: "Voucher", action: "Từ chối voucher" },
  { key: "voucher.create", module: "Voucher", action: "Tạo voucher" },
  { key: "voucher.edit", module: "Voucher", action: "Sửa voucher" },
  { key: "user.view", module: "Người dùng", action: "Xem tài khoản" },
  { key: "user.lock", module: "Người dùng", action: "Khóa/mở khóa" },
  { key: "user.edit", module: "Người dùng", action: "Chỉnh sửa TK" },
  { key: "partner.view", module: "Đối tác", action: "Xem đối tác" },
  { key: "partner.approve", module: "Đối tác", action: "Duyệt đối tác" },
  { key: "partner.lock", module: "Đối tác", action: "Khóa đối tác" },
  { key: "order.view", module: "Đơn hàng", action: "Xem đơn hàng" },
  { key: "order.cancel", module: "Đơn hàng", action: "Hủy đơn hàng" },
  { key: "order.refund", module: "Đơn hàng", action: "Hoàn tiền" },
  { key: "log.view", module: "Bảo mật", action: "Xem nhật ký" },
  { key: "security.lock", module: "Bảo mật", action: "Khóa TK bảo mật" },
  { key: "rbac.manage", module: "Bảo mật", action: "Quản lý phân quyền" },
];

const ROLES_DATA = [
  {
    key: "admin_content",
    name: "Admin Nội dung",
    description: "Quản trị nội dung và duyệt voucher",
    color: "#81B29A",
    is_system: true,
    permissions: [
      "content.view",
      "content.create",
      "content.edit",
      "content.delete",
      "voucher.view",
      "voucher.approve",
      "voucher.reject",
    ],
  },
  {
    key: "admin_operations",
    name: "Admin Vận hành",
    description: "Quản trị vận hành, người dùng và đối tác",
    color: "#3D405B",
    is_system: true,
    permissions: [
      "user.view",
      "user.lock",
      "user.edit",
      "partner.view",
      "partner.approve",
      "partner.lock",
      "order.view",
      "order.cancel",
      "order.refund",
      "voucher.view",
    ],
  },
  {
    key: "admin_security",
    name: "Admin Bảo mật",
    description: "Quản trị bảo mật và phân quyền",
    color: "#E07A5F",
    is_system: true,
    permissions: ["log.view", "security.lock", "rbac.manage", "user.view", "partner.view"],
  },
  {
    key: "buyer",
    name: "Khách hàng",
    description: "Người dùng mua và sử dụng voucher",
    color: "#3B82F6",
    is_system: true,
    permissions: [],
  },
  {
    key: "partner_owner",
    name: "Đối tác chủ tài khoản",
    description: "Chủ tài khoản đối tác, quản lý voucher",
    color: "#F2CC8F",
    is_system: true,
    permissions: ["voucher.view", "voucher.create", "voucher.edit"],
  },
  {
    key: "partner_voucher_staff",
    name: "NV Tạo Voucher",
    description: "Nhân viên đối tác tạo và quản lý voucher",
    color: "#9CA3AF",
    is_system: true,
    permissions: ["voucher.view", "voucher.create", "voucher.edit"],
  },
  {
    key: "partner_store_staff",
    name: "NV Cửa hàng",
    description: "Nhân viên cửa hàng đối tác",
    color: "#6B7280",
    is_system: true,
    permissions: [],
  },
];

export async function seedRbac({ prisma }: SeedContext) {
  for (const perm of PERMISSIONS_DATA) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      create: { key: perm.key, module: perm.module, action: perm.action },
      update: { module: perm.module, action: perm.action },
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map((p) => [p.key, p.id]));

  for (const role of ROLES_DATA) {
    const existing = await prisma.role.findUnique({ where: { key: role.key } });

    let roleId: string;

    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: {
          name: role.name,
          description: role.description,
          color: role.color,
          is_system: role.is_system,
        },
      });
      roleId = existing.id;
    } else {
      const created = await prisma.role.create({
        data: {
          key: role.key,
          name: role.name,
          description: role.description,
          color: role.color,
          is_system: role.is_system,
        },
      });
      roleId = created.id;
    }

    await prisma.rolePermission.deleteMany({ where: { role_id: roleId } });

    if (role.permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: role.permissions
          .map((permKey) => {
            const permId = permMap.get(permKey);
            if (!permId) {
              console.warn(`[rbac-seed] Permission not found: ${permKey}`);
              return null;
            }
            return { role_id: roleId, permission_id: permId };
          })
          .filter((r): r is { role_id: string; permission_id: string } => r !== null),
      });
    }
  }
}
