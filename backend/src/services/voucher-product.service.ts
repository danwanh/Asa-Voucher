import type { UserRole } from "../types/auth.types.js";
import { prisma } from "../config/prisma.js";
import { requireData, throwDbError } from "../utils/db.js";
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
  return prisma.partner.findFirst({ where: { representative_user_id: userId } }) as unknown as Promise<Record<string, unknown> | null>;
}

async function getVoucher(id: string) {
  return requireData<Record<string, unknown>>(await prisma.voucherProduct.findUnique({ where: { id } }) as unknown as Record<string, unknown> | null, "Voucher product not found");
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
  const today = new Date(todayIsoDate());
  const where: Record<string, unknown> = {
    approval_status: "approved",
    status: "active",
    sale_start_date: { lte: today },
    sale_end_date: { gte: today },
    remaining_quantity: { gt: 0 }
  };

  if (categoryId) where.category_id = categoryId;
  if (partnerId) where.partner_id = partnerId;
  if (search) where.name = { contains: String(search), mode: "insensitive" };

  const [items, count] = await prisma.$transaction([
    prisma.voucherProduct.findMany({ where, skip: from, take: to - from + 1, orderBy: { created_at: "desc" } }),
    prisma.voucherProduct.count({ where })
  ]);
  return { items, count, page, limit };
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
  try {
    return await prisma.voucherProduct.create({ data: payload as never });
  } catch (error) {
    throwDbError(error);
  }
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
  const payload = { ...input, discount_rate: calcDiscount(originalPrice, sellingPrice), updated_at: new Date() };
  try {
    return await prisma.voucherProduct.update({ where: { id }, data: payload as never });
  } catch (error) {
    throwDbError(error, "Voucher product not found");
  }
}

export async function deleteVoucherProduct(user: CurrentUser, id: string) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher);
  try {
    await prisma.voucherProduct.update({ where: { id }, data: { status: "paused", updated_at: new Date() } });
  } catch (error) {
    throwDbError(error, "Voucher product not found");
  }
}

export async function submitVoucherProduct(user: CurrentUser, id: string) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher, false);
  try {
    return await prisma.voucherProduct.update({ where: { id }, data: { approval_status: "pending", updated_at: new Date() } });
  } catch (error) {
    throwDbError(error, "Voucher product not found");
  }
}

export async function approveVoucherProduct(adminId: string, id: string, approvalStatus: string) {
  try {
    return await prisma.voucherProduct.update({ where: { id }, data: { approval_status: approvalStatus, approved_by: adminId, approved_at: new Date(), updated_at: new Date() } });
  } catch (error) {
    throwDbError(error, "Voucher product not found");
  }
}

export async function updateVoucherStatus(user: CurrentUser, id: string, status: string) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher);
  if (status === "active" && voucher.approval_status !== "approved") {
    throw new HttpError(422, "Only approved voucher can be active", "VOUCHER_NOT_APPROVED");
  }
  try {
    return await prisma.voucherProduct.update({ where: { id }, data: { status, updated_at: new Date() } });
  } catch (error) {
    throwDbError(error, "Voucher product not found");
  }
}

export async function listVoucherImages(id: string) {
  return prisma.voucherProductImage.findMany({ where: { voucher_product_id: id }, orderBy: { sort_order: "asc" } });
}

export async function createVoucherImage(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher, false);
  try {
    return await prisma.voucherProductImage.create({ data: { ...input, voucher_product_id: id } as never });
  } catch (error) {
    throwDbError(error);
  }
}

export async function updateVoucherImage(user: CurrentUser, imageId: string, input: Record<string, unknown>) {
  const existing = requireData<Record<string, unknown>>(await prisma.voucherProductImage.findUnique({ where: { id: imageId }, include: { voucher_products: true } }) as unknown as Record<string, unknown> | null, "Image not found");
  assertVoucherOwnerOrAdmin(user, existing.voucher_products as Record<string, unknown>, false);
  try {
    return await prisma.voucherProductImage.update({ where: { id: imageId }, data: input as never });
  } catch (error) {
    throwDbError(error, "Image not found");
  }
}

export async function deleteVoucherImage(user: CurrentUser, imageId: string) {
  const existing = requireData<Record<string, unknown>>(await prisma.voucherProductImage.findUnique({ where: { id: imageId }, include: { voucher_products: true } }) as unknown as Record<string, unknown> | null, "Image not found");
  assertVoucherOwnerOrAdmin(user, existing.voucher_products as Record<string, unknown>, false);
  try {
    await prisma.voucherProductImage.delete({ where: { id: imageId } });
  } catch (error) {
    throwDbError(error, "Image not found");
  }
}

export async function listVoucherBranches(id: string) {
  return prisma.voucherProductBranch.findMany({ where: { voucher_product_id: id }, include: { partner_branches: true } });
}

export async function createVoucherBranch(user: CurrentUser, id: string, branchId: string) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher, false);
  try {
    return await prisma.voucherProductBranch.create({ data: { voucher_product_id: id, branch_id: branchId } });
  } catch (error) {
    throwDbError(error);
  }
}

export async function deleteVoucherBranch(user: CurrentUser, id: string, branchId: string) {
  const voucher = await getVoucher(id);
  assertVoucherOwnerOrAdmin(user, voucher, false);
  await prisma.voucherProductBranch.deleteMany({ where: { voucher_product_id: id, branch_id: branchId } });
}
