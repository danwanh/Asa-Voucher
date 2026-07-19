import type { UserRole } from "../types/role.js";
import { db, requireData, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";
import { rangeFromPagination } from "../validations/common.validation.js";

type CurrentUser = { id: string; role: UserRole; partnerId?: string };

function calcDiscount(originalPrice: number, sellingPrice: number) {
  return originalPrice === 0 ? 0 : Math.round(((originalPrice - sellingPrice) / originalPrice) * 10000) / 100;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function getPartnerForUser(userId: string) {
  const { data, error } = await db().from("partners").select("*").eq("representative_user_id", userId).maybeSingle();
  if (error) throwDbError(error);
  return data as Record<string, unknown> | null;
}

async function getVoucher(id: string) {
  const { data, error } = await db().from("voucher_products").select("*").eq("id", id).single();
  return requireData<Record<string, unknown>>(data, error, "Voucher product not found");
}

function assertVoucherOwnerOrAdmin(user: CurrentUser | undefined, voucher: Record<string, unknown>, allowAdminContent = true) {
  if (allowAdminContent && user?.role === "admin_content") return;
  if (user?.partnerId !== voucher.partner_id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
}

export async function listVoucherProducts(queryInput: Record<string, string | number>) {
  const { page, limit, category_id: categoryId, partner_id: partnerId, search } = queryInput;
  const { from, to } = rangeFromPagination(Number(page), Number(limit));
  const today = todayIsoDate();
  let query = db()
    .from("voucher_products")
    .select("*", { count: "exact" })
    .eq("approval_status", "approved")
    .eq("status", "active")
    .lte("sale_start_date", today)
    .gte("sale_end_date", today)
    .gt("remaining_quantity", 0)
    .range(from, to)
    .order("created_at", { ascending: false });

  if (categoryId) query = query.eq("category_id", categoryId);
  if (partnerId) query = query.eq("partner_id", partnerId);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error, count } = await query;
  if (error) throwDbError(error);
  return { items: data ?? [], count, page, limit };
}

export async function createVoucherProduct(user: CurrentUser, input: Record<string, unknown>) {
  const partner = user.partnerId ? { id: user.partnerId, approval_status: "approved", status: "active" } : await getPartnerForUser(user.id);
  if (!partner || partner.approval_status !== "approved" || partner.status !== "active") {
    throw new HttpError(403, "Partner must be approved and active", "PARTNER_NOT_ACTIVE");
  }
  if (Number(input.selling_price) > Number(input.original_price)) {
    throw new HttpError(400, "Selling price must not exceed original price", "INVALID_PRICE");
  }

  const payload = {
    ...input,
    partner_id: partner.id,
    remaining_quantity: input.total_quantity,
    discount_rate: calcDiscount(Number(input.original_price), Number(input.selling_price)),
    approval_status: "pending",
    status: input.status ?? "draft"
  };
  const { data, error } = await db().from("voucher_products").insert(payload).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function getVoucherProduct(user: CurrentUser | undefined, id: string) {
  const voucher = await getVoucher(id);
  const isPublicVisible = voucher.approval_status === "approved" && voucher.status === "active";
  if (!isPublicVisible && user) assertVoucherOwnerOrAdmin(user, voucher);
  if (!isPublicVisible && !user) throw new HttpError(404, "Voucher product not found", "NOT_FOUND");
  return voucher;
}

export async function updateVoucherProduct(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher, false);
  if (input.selling_price && Number(input.selling_price) > Number(input.original_price ?? voucher.original_price)) {
    throw new HttpError(400, "Selling price must not exceed original price", "INVALID_PRICE");
  }
  const originalPrice = Number(input.original_price ?? voucher.original_price);
  const sellingPrice = Number(input.selling_price ?? voucher.selling_price);
  const payload = { ...input, discount_rate: calcDiscount(originalPrice, sellingPrice), updated_at: new Date().toISOString() };
  const { data, error } = await db().from("voucher_products").update(payload).eq("id", id).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function deleteVoucherProduct(user: CurrentUser, id: string) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher);
  const { error } = await db().from("voucher_products").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throwDbError(error);
}

export async function submitVoucherProduct(user: CurrentUser, id: string) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher, false);
  const { data, error } = await db().from("voucher_products").update({ approval_status: "pending", updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function approveVoucherProduct(adminId: string, id: string, approvalStatus: string) {
  const { data, error } = await db()
    .from("voucher_products")
    .update({ approval_status: approvalStatus, approved_by: adminId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  return requireData<Record<string, unknown>>(data, error, "Voucher product not found");
}

export async function updateVoucherStatus(user: CurrentUser, id: string, status: string) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher);
  if (status === "active" && voucher.approval_status !== "approved") {
    throw new HttpError(422, "Only approved voucher can be active", "VOUCHER_NOT_APPROVED");
  }
  const { data, error } = await db().from("voucher_products").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function listVoucherImages(id: string) {
  const { data, error } = await db().from("voucher_product_images").select("*").eq("voucher_product_id", id).order("sort_order");
  if (error) throwDbError(error);
  return data ?? [];
}

export async function createVoucherImage(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher, false);
  const { data, error } = await db().from("voucher_product_images").insert({ ...input, voucher_product_id: id }).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function updateVoucherImage(user: CurrentUser, imageId: string, input: Record<string, unknown>) {
  const { data: image, error } = await db().from("voucher_product_images").select("*, voucher_products(*)").eq("id", imageId).single();
  const existing = requireData<Record<string, unknown>>(image, error, "Image not found");
  assertVoucherOwnerOrAdmin(user, existing.voucher_products as Record<string, unknown>, false);
  const { data, error: updateError } = await db().from("voucher_product_images").update(input).eq("id", imageId).select("*").single();
  if (updateError) throwDbError(updateError);
  return data;
}

export async function deleteVoucherImage(user: CurrentUser, imageId: string) {
  const { data: image, error } = await db().from("voucher_product_images").select("*, voucher_products(*)").eq("id", imageId).single();
  const existing = requireData<Record<string, unknown>>(image, error, "Image not found");
  assertVoucherOwnerOrAdmin(user, existing.voucher_products as Record<string, unknown>, false);
  const { error: deleteError } = await db().from("voucher_product_images").delete().eq("id", imageId);
  if (deleteError) throwDbError(deleteError);
}

export async function listVoucherBranches(id: string) {
  const { data, error } = await db().from("voucher_product_branches").select("*, partner_branches(*)").eq("voucher_product_id", id);
  if (error) throwDbError(error);
  return data ?? [];
}

export async function createVoucherBranch(user: CurrentUser, id: string, branchId: string) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher, false);
  const { data, error } = await db().from("voucher_product_branches").insert({ voucher_product_id: id, branch_id: branchId }).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function deleteVoucherBranch(user: CurrentUser, id: string, branchId: string) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher, false);
  const { error } = await db().from("voucher_product_branches").delete().eq("voucher_product_id", id).eq("branch_id", branchId);
  if (error) throwDbError(error);
}
