import { adminRoles, type UserRole } from "../types/role.js";
import { db, requireData, throwDbError } from "../utils/db.js";
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
  const { data, error } = await db().from("partners").select("*").eq("id", id).single();
  return requireData<Record<string, unknown>>(data, error, "Partner not found");
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
  let query = db().from("partners").select("*", { count: "exact" }).range(from, to).order("created_at", { ascending: false });
  if (approvalStatus) query = query.eq("approval_status", approvalStatus);
  if (status) query = query.eq("status", status);
  const { data, error, count } = await query;
  if (error) throwDbError(error);
  return { items: data ?? [], count, page, limit };
}

export async function createPartner(user: CurrentUser, input: Record<string, unknown>) {
  const representativeUserId = isAdminAccount(user) && input.representative_user_id ? input.representative_user_id : user.id;
  const { data, error } = await db()
    .from("partners")
    .insert({ ...input, representative_user_id: representativeUserId, approval_status: "pending", status: "active" })
    .select("*")
    .single();
  if (error) throwDbError(error);
  return data;
}

export async function getPartnerById(user: CurrentUser, id: string) {
  const partner = await getPartner(id);
  assertPartnerOwnerOrAdmin(user, partner);
  return partner;
}

export async function updatePartner(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const partner = await getPartner(id);
  assertPartnerOwnerOrAdmin(user, partner);
  const { data, error } = await db()
    .from("partners")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throwDbError(error);
  return data;
}

export async function deletePartner(id: string) {
  const { error } = await db().from("partners").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throwDbError(error);
}

export async function updatePartnerApproval(adminId: string, id: string, approvalStatus: string) {
  const { data, error } = await db()
    .from("partners")
    .update({ approval_status: approvalStatus, approved_by: adminId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  return requireData<Record<string, unknown>>(data, error, "Partner not found");
}

export async function updatePartnerStatus(id: string, status: string) {
  const { data, error } = await db().from("partners").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  return requireData<Record<string, unknown>>(data, error, "Partner not found");
}

export async function listBranches(user: CurrentUser, partnerId: string) {
  const partner = await getPartner(partnerId);
  if (user.role === "partner_store_staff") {
    const { data: branch, error } = await db().from("partner_branches").select("partner_id").eq("id", user.branchId).maybeSingle();
    if (error) throwDbError(error);
    if (branch?.partner_id !== partnerId) throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  } else {
    assertPartnerReadAccess(user, partner);
  }

  const { data, error } = await db().from("partner_branches").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false });
  if (error) throwDbError(error);
  return data ?? [];
}

export async function createBranch(user: CurrentUser, partnerId: string, input: Record<string, unknown>) {
  const partner = await getPartner(partnerId);
  assertPartnerOwnerOrAdmin(user, partner);
  const { data, error } = await db().from("partner_branches").insert({ ...input, partner_id: partnerId }).select("*").single();
  if (error) throwDbError(error);
  return data;
}

async function getBranch(id: string) {
  const { data, error } = await db().from("partner_branches").select("*, partners(*)").eq("id", id).single();
  return requireData<Record<string, unknown>>(data, error, "Branch not found");
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
  const { data, error } = await db().from("partner_branches").update(input).eq("id", id).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function deleteBranch(user: CurrentUser, id: string) {
  const branch = await getBranch(id);
  assertPartnerOwnerOrAdmin(user, branch.partners as Record<string, unknown>);
  const { error } = await db().from("partner_branches").update({ is_active: false }).eq("id", id);
  if (error) throwDbError(error);
}
