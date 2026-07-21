import { adminRoles, type UserRole } from "../types/auth.types.js";
import { prisma } from "../config/prisma.js";
import { requireData, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";
import { rangeFromPagination } from "../validations/common.validation.js";

type CurrentUser = { id: string; role: UserRole; partnerId?: string; branchId?: string };

function isAdminAccount(user: CurrentUser) {
  return user.role === "admin_account";
}

function isAnyAdmin(user: CurrentUser) {
  return adminRoles.includes(user.role);
}

async function getPartner(id: string) {
  return requireData<Record<string, unknown>>(await prisma.partner.findUnique({ where: { id } }) as unknown as Record<string, unknown> | null, "Partner not found");
}

function assertPartnerOwnerOrAdmin(user: CurrentUser, partner: Record<string, unknown>) {
  if (!isAdminAccount(user) && partner.representative_user_id !== user.id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
}

function assertPartnerReadAccess(user: CurrentUser, partner: Record<string, unknown>) {
  if (isAnyAdmin(user) || partner.representative_user_id === user.id) return;
  throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
}

export async function listPartners(queryInput: Record<string, string | number>) {
  const { page, limit, approval_status: approvalStatus, status } = queryInput;
  const { from, to } = rangeFromPagination(Number(page), Number(limit));
  const where: Record<string, unknown> = {};
  if (approvalStatus) where.approval_status = approvalStatus;
  if (status) where.status = status;
  const [items, count] = await prisma.$transaction([
    prisma.partner.findMany({ where, skip: from, take: to - from + 1, orderBy: { created_at: "desc" } }),
    prisma.partner.count({ where })
  ]);
  return { items, count, page, limit };
}

export async function createPartner(user: CurrentUser, input: Record<string, unknown>) {
  const representativeUserId = isAdminAccount(user) && input.representative_user_id ? input.representative_user_id : user.id;
  try {
    return await prisma.partner.create({ data: { ...input, representative_user_id: representativeUserId, approval_status: "pending", status: "active" } as never });
  } catch (error) {
    throwDbError(error);
  }
}

export async function getPartnerById(user: CurrentUser, id: string) {
  const partner = await getPartner(id);
  assertPartnerOwnerOrAdmin(user, partner);
  return partner;
}

export async function updatePartner(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const partner = await getPartner(id);
  assertPartnerOwnerOrAdmin(user, partner);
  try {
    return await prisma.partner.update({ where: { id }, data: { ...input, updated_at: new Date() } as never });
  } catch (error) {
    throwDbError(error, "Partner not found");
  }
}

export async function deletePartner(id: string) {
  try {
    await prisma.partner.update({ where: { id }, data: { status: "closed", updated_at: new Date() } });
  } catch (error) {
    throwDbError(error, "Partner not found");
  }
}

export async function updatePartnerApproval(adminId: string, id: string, approvalStatus: string) {
  try {
    return await prisma.partner.update({ where: { id }, data: { approval_status: approvalStatus, approved_by: adminId, approved_at: new Date(), updated_at: new Date() } });
  } catch (error) {
    throwDbError(error, "Partner not found");
  }
}

export async function updatePartnerStatus(id: string, status: string) {
  try {
    return await prisma.partner.update({ where: { id }, data: { status, updated_at: new Date() } });
  } catch (error) {
    throwDbError(error, "Partner not found");
  }
}

export async function listBranches(user: CurrentUser, partnerId: string) {
  const partner = await getPartner(partnerId);
  if (user.role === "partner_store_staff") {
    const branch = user.branchId ? await prisma.partnerBranch.findUnique({ where: { id: user.branchId }, select: { partner_id: true } }) : null;
    if (branch?.partner_id !== partnerId) throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  } else {
    assertPartnerReadAccess(user, partner);
  }

  return prisma.partnerBranch.findMany({ where: { partner_id: partnerId }, orderBy: { created_at: "desc" } });
}

export async function createBranch(user: CurrentUser, partnerId: string, input: Record<string, unknown>) {
  const partner = await getPartner(partnerId);
  assertPartnerOwnerOrAdmin(user, partner);
  try {
    return await prisma.partnerBranch.create({ data: { ...input, partner_id: partnerId } as never });
  } catch (error) {
    throwDbError(error);
  }
}

async function getBranch(id: string) {
  return requireData<Record<string, unknown>>(await prisma.partnerBranch.findUnique({ where: { id }, include: { partners: true } }) as unknown as Record<string, unknown> | null, "Branch not found");
}

export async function getBranchById(user: CurrentUser, id: string) {
  const branch = await getBranch(id);
  if (user.role === "partner_store_staff" && user.branchId !== id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
  if (user.role !== "partner_store_staff") {
    assertPartnerReadAccess(user, branch.partners as Record<string, unknown>);
  }
  return branch;
}

export async function updateBranch(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const branch = await getBranch(id);
  assertPartnerOwnerOrAdmin(user, branch.partners as Record<string, unknown>);
  try {
    return await prisma.partnerBranch.update({ where: { id }, data: input as never });
  } catch (error) {
    throwDbError(error, "Branch not found");
  }
}

export async function deleteBranch(user: CurrentUser, id: string) {
  const branch = await getBranch(id);
  assertPartnerOwnerOrAdmin(user, branch.partners as Record<string, unknown>);
  try {
    await prisma.partnerBranch.update({ where: { id }, data: { is_active: false } });
  } catch (error) {
    throwDbError(error, "Branch not found");
  }
}
