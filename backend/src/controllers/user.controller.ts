import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/auth.js";
import { requireData, sanitizeUser, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";
import { created, noContent, ok } from "../utils/response.js";
import { rangeFromPagination } from "../validations/common.validation.js";
import { writeAuditLog } from "../services/audit-log.service.js";

const PARTNER_STAFF_ROLES = ["partner_voucher_staff", "partner_store_staff"] as const;

function validatePasswordDetail(password: string): string | null {
  if (password.length < 8 || password.length > 64) return "Mật khẩu phải theo quy cách: 8-64 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt";
  if (!/[A-Z]/.test(password)) return "Mật khẩu phải theo quy cách: 8-64 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt";
  if (!/[a-z]/.test(password)) return "Mật khẩu phải theo quy cách: 8-64 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt";
  if (!/[0-9]/.test(password)) return "Mật khẩu phải theo quy cách: 8-64 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt";
  if (!/[^A-Za-z0-9]/.test(password)) return "Mật khẩu phải theo quy cách: 8-64 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt";
  return null;
}

const partnerStaffSelect = {
  id: true,
  email: true,
  phone: true,
  full_name: true,
  role: true,
  is_active: true,
  partner_branches_id: true,
  created_at: true,
  updated_at: true,
  partner_branches: {
    select: {
      id: true,
      branch_name: true,
      partner_id: true,
      is_active: true
    }
  }
} satisfies Prisma.UserSelect;

type PartnerStaffRow = Prisma.UserGetPayload<{ select: typeof partnerStaffSelect }>;

function serializePartnerStaff(user: PartnerStaffRow) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
    partner_branches_id: user.partner_branches_id,
    branch: user.partner_branches
      ? {
          id: user.partner_branches.id,
          branch_name: user.partner_branches.branch_name,
          partner_id: user.partner_branches.partner_id,
          is_active: user.partner_branches.is_active
        }
      : null,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

async function requireCurrentPartnerForOwner(req: Request) {
  if (!req.user?.partnerId) {
    throw new HttpError(404, "Không tìm thấy thông tin đối tác", "NOT_FOUND");
  }

  const partner = requireData(
    await prisma.partner.findUnique({
      where: { id: req.user.partnerId },
      select: { id: true, representative_user_id: true, approval_status: true, status: true }
    }),
    "Partner profile not found"
  );

  if (partner.representative_user_id !== req.user.id) {
    throw new HttpError(403, "Không có quyền thực hiện thao tác này", "FORBIDDEN");
  }

  if (partner.approval_status !== "approved" || partner.status !== "active") {
    throw new HttpError(403, "Đối tác phải được duyệt và đang hoạt động", "PARTNER_NOT_ACTIVE");
  }

  return partner;
}

function partnerStaffWhere(partnerId: string, staffId?: string) {
  return {
    ...(staffId ? { id: staffId } : {}),
    role: { in: [...PARTNER_STAFF_ROLES] },
    partner_branches: { is: { partner_id: partnerId } }
  } satisfies Prisma.UserWhereInput;
}

export async function listUsers(req: Request, res: Response) {
  const { page, limit, role, is_active: isActive, search, full_name: fullName, email, phone } = req.query as Record<string, string | number | boolean | undefined>;
  const { from, to } = rangeFromPagination(Number(page), Number(limit));

  const searchTerm = typeof search === "string" ? search.trim() : undefined;
  const fullNameTerm = typeof fullName === "string" ? fullName.trim() : undefined;
  const emailTerm = typeof email === "string" ? email.trim() : undefined;
  const phoneTerm = typeof phone === "string" ? phone.trim() : undefined;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role: role as Prisma.UserWhereInput["role"] } : {}),
    ...(typeof isActive === "boolean" ? { is_active: isActive } : {}),
    ...(fullNameTerm ? { full_name: { contains: fullNameTerm, mode: "insensitive" } } : {}),
    ...(emailTerm ? { email: { contains: emailTerm, mode: "insensitive" } } : {}),
    ...(phoneTerm ? { phone: { contains: phoneTerm, mode: "insensitive" } } : {}),
    ...(searchTerm
      ? {
          OR: [
            { full_name: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
            { phone: { contains: searchTerm, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [data, count] = await prisma.$transaction([
    prisma.user.findMany({ where, skip: from, take: to - from + 1, orderBy: { created_at: "desc" } }),
    prisma.user.count({ where })
  ]);
  ok(res, { items: data.map((user) => sanitizeUser(user as unknown as Record<string, unknown>)), count, page, limit });
}

export async function listPartnerStaff(req: Request, res: Response) {
  const partner = await requireCurrentPartnerForOwner(req);
  const { page, limit, search } = req.query as Record<string, string | number | undefined>;
  const searchTerm = typeof search === "string" ? search : undefined;
  const { from, to } = rangeFromPagination(Number(page), Number(limit));
  const where: Prisma.UserWhereInput = {
    ...partnerStaffWhere(partner.id),
    ...(searchTerm
      ? {
          OR: [
            { full_name: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
            { phone: { contains: searchTerm, mode: "insensitive" } },
            { partner_branches: { is: { branch_name: { contains: searchTerm, mode: "insensitive" } } } }
          ]
        }
      : {})
  };

  const [data, count] = await prisma.$transaction([
    prisma.user.findMany({ where, select: partnerStaffSelect, skip: from, take: to - from + 1, orderBy: { created_at: "desc" } }),
    prisma.user.count({ where })
  ]);

  ok(res, { items: data.map(serializePartnerStaff), count, page, limit });
}

export async function getPartnerStaff(req: Request, res: Response) {
  const partner = await requireCurrentPartnerForOwner(req);
  const staff = requireData(
    await prisma.user.findFirst({ where: partnerStaffWhere(partner.id, req.params.id), select: partnerStaffSelect }),
    "Staff not found"
  );

  ok(res, serializePartnerStaff(staff));
}

export async function createUserByAdmin(req: Request, res: Response) {
  const { password, partner_id, partner_branches_id, ...rest } = req.body;

  const passwordError = validatePasswordDetail(password);
  if (passwordError) {
    throw new HttpError(400, passwordError, "PASSWORD_INVALID");
  }

  if (rest.role === "partner_owner") {
    if (!partner_id) {
      throw new HttpError(400, "Trường đối tác là bắt buộc cho chủ đối tác", "VALIDATION_ERROR");
    }
    const partner = await prisma.partner.findUnique({ where: { id: partner_id }, select: { id: true } });
    if (!partner) {
      throw new HttpError(404, "Không tìm thấy đối tác", "NOT_FOUND");
    }
    const payload = {
      ...rest,
      password_hash: await hashPassword(password),
      partner_id,
      partner_branches_id: null,
    };
    try {
      const user = await prisma.user.create({ data: payload as never });
      await writeAuditLog({
        adminId: req.user!.id,
        action: "user_created",
        description: `Tạo người dùng ${user.email} (${user.role}) cho đối tác`,
        targetUserId: user.id,
      });
      created(res, sanitizeUser(user as unknown as Record<string, unknown>), "User created");
      return;
    } catch (error) {
      throwDbError(error);
    }
  }

  if (["partner_voucher_staff", "partner_store_staff"].includes(rest.role)) {
    if (!partner_id) {
      throw new HttpError(400, "Trường đối tác là bắt buộc cho vai trò đối tác", "VALIDATION_ERROR");
    }
    const partner = await prisma.partner.findUnique({ where: { id: partner_id }, select: { id: true } });
    if (!partner) {
      throw new HttpError(404, "Không tìm thấy đối tác", "NOT_FOUND");
    }
  }

  if (rest.role === "partner_store_staff") {
    if (!partner_branches_id) {
      throw new HttpError(400, "Trường chi nhánh là bắt buộc cho nhân viên cửa hàng", "VALIDATION_ERROR");
    }
    const branch = await prisma.partnerBranch.findUnique({ where: { id: partner_branches_id }, select: { id: true, partner_id: true } });
    if (!branch) {
      throw new HttpError(404, "Không tìm thấy chi nhánh", "NOT_FOUND");
    }
    if (partner_id && branch.partner_id !== partner_id) {
      throw new HttpError(400, "Chi nhánh không thuộc đối tác đã chọn", "VALIDATION_ERROR");
    }
  }

  const payload = {
    ...rest,
    password_hash: await hashPassword(password),
    partner_id: partner_id || null,
    partner_branches_id: partner_branches_id || null,
  };

  try {
    const user = await prisma.user.create({ data: payload as never });
    await writeAuditLog({
      adminId: req.user!.id,
      action: "user_created",
      description: `Tạo người dùng ${user.email} (${user.role})`,
      targetUserId: user.id,
    });
    created(res, sanitizeUser(user as unknown as Record<string, unknown>), "User created");
  } catch (error) {
    throwDbError(error);
  }
}

export async function getUser(req: Request, res: Response) {
  if (req.user!.role !== "admin_operations" && req.user!.id !== req.params.id) {
    throw new HttpError(403, "Không có quyền thực hiện thao tác này", "FORBIDDEN");
  }

  const user = requireData(await prisma.user.findUnique({ where: { id: req.params.id } }), "Không tìm thấy người dùng");
  ok(res, sanitizeUser(user as unknown as Record<string, unknown>));
}

export async function lookupRecipient(req: Request, res: Response) {
  const identifier = String(req.query.identifier).trim();
  const phone = identifier.replace(/\s/g, "");
  const normalizedPhone = phone.startsWith("+84") ? `0${phone.slice(3)}` : phone;
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { phone: normalizedPhone },
        { phone }
      ],
      is_active: true
    },
    select: { id: true, full_name: true, email: true, phone: true }
  });

  if (!user) throw new HttpError(404, "Không tìm thấy tài khoản người nhận", "RECIPIENT_NOT_FOUND");
  if (user.id === req.user!.id) throw new HttpError(422, "Không thể tặng voucher cho chính mình", "RECIPIENT_IS_SELF");
  ok(res, user);
}

export async function updateUser(req: Request, res: Response) {
  const isAdmin = req.user!.role === "admin_operations";
  if (
    isAdmin &&
    req.user!.id === req.params.id &&
    req.body.is_active === false
  ) {
    throw new HttpError(
      403,
      "Bạn không thể vô hiệu hóa tài khoản của chính mình",
      "FORBIDDEN"
    );
  }

  if (!isAdmin && req.user!.id !== req.params.id) {
    throw new HttpError(403, "Không có quyền thực hiện thao tác này", "FORBIDDEN");
  }

  const forbiddenForOwner = ["role", "is_active", "is_verified", "partner_branches_id"];
  if (!isAdmin && forbiddenForOwner.some((field) => field in req.body)) {
    throw new HttpError(403, "Chỉ quản trị viên mới có thể cập nhật trạng thái hoặc vai trò tài khoản", "FORBIDDEN");
  }

  if (isAdmin && req.body.role) {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { role: true, partner_id: true }
    });

    if (currentUser) {
      const currentRole = currentUser.role;
      const newRole = req.body.role as string;

      const PARTNER_ROLES = ["partner_owner", "partner_voucher_staff", "partner_store_staff"];
      const ADMIN_ROLES = ["admin_content", "admin_operations", "admin_security"];

      if (currentRole === "buyer") {
        throw new HttpError(400, "Không thể thay đổi vai trò của tài khoản khách hàng", "ROLE_CHANGE_NOT_ALLOWED");
      }

      if (PARTNER_ROLES.includes(currentRole) && !PARTNER_ROLES.includes(newRole)) {
        throw new HttpError(400, "Vai trò đối tác chỉ có thể chuyển sang vai trò đối tác khác", "ROLE_GROUP_MISMATCH");
      }

      if (ADMIN_ROLES.includes(currentRole) && !ADMIN_ROLES.includes(newRole)) {
        throw new HttpError(400, "Vai trò quản trị chỉ có thể chuyển sang vai trò quản trị khác", "ROLE_GROUP_MISMATCH");
      }

      if (currentRole === "partner_owner" && newRole !== "partner_owner" && currentUser.partner_id) {
        const ownerCount = await prisma.user.count({
          where: {
            partner_id: currentUser.partner_id,
            role: "partner_owner",
            is_active: true
          }
        });

        if (ownerCount <= 1) {
          throw new HttpError(
            400,
            "Phải giữ lại ít nhất một chủ đối tác. Vui lòng bổ sung chủ đối tác khác trước khi thay đổi vai trò.",
            "LAST_PARTNER_OWNER"
          );
        }
      }

      if (ADMIN_ROLES.includes(currentRole) && currentRole !== newRole) {
        const adminCount = await prisma.user.count({
          where: {
            role: currentRole as any,
            is_active: true
          }
        });

        if (adminCount <= 1) {
          throw new HttpError(
            400,
            `Không thể thay đổi vai trò. Phải giữ lại ít nhất một tài khoản ${currentRole === "admin_operations" ? "quản trị vận hành" : currentRole === "admin_security" ? "quản trị bảo mật" : "quản trị nội dung"}.`,
            "LAST_ADMIN_OF_TYPE"
          );
        }
      }
    }
  }

  try {
    const updateData: Record<string, unknown> = { ...req.body, updated_at: new Date() };
    if ("dob" in req.body) {
      updateData.dob = req.body.dob ? new Date(req.body.dob) : null;
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData as never });
    if (isAdmin && req.user!.id !== req.params.id) {
      const changes = Object.keys(req.body).filter((k) => k !== "updated_at").join(", ");
      await writeAuditLog({
        adminId: req.user!.id,
        action: req.body.is_active === false ? "user_deactivated" : "user_updated",
        description: `Cập nhật người dùng ${user.email}: ${changes}`,
        targetUserId: user.id,
      });
    }
    ok(res, sanitizeUser(user as unknown as Record<string, unknown>), "User updated");
  } catch (error) {
    throwDbError(error, "Không tìm thấy người dùng");
  }
}

export async function updatePartnerStaff(req: Request, res: Response) {
  const partner = await requireCurrentPartnerForOwner(req);
  const currentStaff = requireData(
    await prisma.user.findFirst({ where: partnerStaffWhere(partner.id, req.params.id), select: { id: true } }),
    "Staff not found"
  );

  if (req.body.partner_branches_id) {
    const branch = await prisma.partnerBranch.findUnique({
      where: { id: req.body.partner_branches_id },
      select: { partner_id: true }
    });

    if (!branch || branch.partner_id !== partner.id) {
      throw new HttpError(403, "Chi nhánh không thuộc phạm vi đối tác hiện tại", "FORBIDDEN");
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: currentStaff.id },
      data: { ...req.body, updated_at: new Date() } as never,
      select: partnerStaffSelect
    });
    ok(res, serializePartnerStaff(updated), "Staff updated");
  } catch (error) {
    throwDbError(error, "Không tìm thấy nhân viên");
  }
}

export async function deleteUser(req: Request, res: Response) {
  if (req.user!.id === req.params.id) {
    throw new HttpError(
      403,
      "Bạn không thể vô hiệu hóa tài khoản của chính mình",
      "FORBIDDEN"
    );
  }

  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });
    await writeAuditLog({
      adminId: req.user!.id,
      action: "user_deactivated",
      description: `Vô hiệu hóa tài khoản người dùng`,
      targetUserId: req.params.id,
    });
  } catch (error) {
    throwDbError(error, "Không tìm thấy người dùng");
  }

  noContent(res);
}
