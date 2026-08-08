import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/auth.js";
import { requireData, sanitizeUser, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";
import { created, noContent, ok } from "../utils/response.js";
import { rangeFromPagination } from "../validations/common.validation.js";

const PARTNER_STAFF_ROLES = ["partner_voucher_staff", "partner_store_staff"] as const;

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
    throw new HttpError(404, "Partner profile not found", "NOT_FOUND");
  }

  const partner = requireData(
    await prisma.partner.findUnique({
      where: { id: req.user.partnerId },
      select: { id: true, representative_user_id: true, approval_status: true, status: true }
    }),
    "Partner profile not found"
  );

  if (partner.representative_user_id !== req.user.id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }

  if (partner.approval_status !== "approved" || partner.status !== "active") {
    throw new HttpError(403, "Partner profile must be approved and active", "PARTNER_NOT_ACTIVE");
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
  const { page, limit, role, is_active: isActive, search } = req.query as Record<string, string | number | boolean | undefined>;
  const { from, to } = rangeFromPagination(Number(page), Number(limit));

  const searchTerm = typeof search === "string" ? search.trim() : undefined;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role: role as Prisma.UserWhereInput["role"] } : {}),
    ...(typeof isActive === "boolean" ? { is_active: isActive } : {}),
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
  const payload = { ...req.body, password_hash: await hashPassword(req.body.password) };
  delete payload.password;
  try {
    const user = await prisma.user.create({ data: payload as never });
    created(res, sanitizeUser(user as unknown as Record<string, unknown>), "User created");
  } catch (error) {
    throwDbError(error);
  }
}

export async function getUser(req: Request, res: Response) {
  if (req.user!.role !== "admin_operations" && req.user!.id !== req.params.id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }

  const user = requireData(await prisma.user.findUnique({ where: { id: req.params.id } }), "User not found");
  ok(res, sanitizeUser(user as unknown as Record<string, unknown>));
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
      "You cannot deactivate your own account",
      "FORBIDDEN"
    );
  }

  if (!isAdmin && req.user!.id !== req.params.id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }

  const forbiddenForOwner = ["role", "is_active", "is_verified", "partner_branches_id"];
  if (!isAdmin && forbiddenForOwner.some((field) => field in req.body)) {
    throw new HttpError(403, "Only admin can update account status or role", "FORBIDDEN");
  }

  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { ...req.body, updated_at: new Date() } as never });
    ok(res, sanitizeUser(user as unknown as Record<string, unknown>), "User updated");
  } catch (error) {
    throwDbError(error, "User not found");
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
      throw new HttpError(403, "Branch is outside current partner scope", "FORBIDDEN");
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
    throwDbError(error, "Staff not found");
  }
}

export async function deleteUser(req: Request, res: Response) {
  if (req.user!.id === req.params.id) {
    throw new HttpError(
      403,
      "You cannot deactivate your own account",
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
  } catch (error) {
    throwDbError(error, "User not found");
  }

  noContent(res);
}
