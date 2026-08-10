import type { UserRole } from "../types/auth.types.js";
import { prisma } from "../config/prisma.js";
import { requireData, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";
import { getAreaMatchCandidates, serializeApplicableAreas } from "../utils/applicable-area.js";
import { rangeFromPagination } from "../validations/common.validation.js";

type CurrentUser = { id: string; role: UserRole; partnerId?: string | null; branchId?: string | null };
type WorkflowStatus = "draft" | "pending_approval" | "rejected" | "approved" | "active" | "paused" | "sold_out" | "expired";

const PARTNER_NAME_INCLUDE = {
  partners: {
    select: {
      business_name: true
    }
  }
};

function calcDiscount(originalPrice: number, sellingPrice: number) {
  return originalPrice === 0 ? 0 : Math.round(((originalPrice - sellingPrice) / originalPrice) * 10000) / 100;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function getPartnerForUser(userId: string) {
  return prisma.partner.findFirst({ where: { representative_user_id: userId } }) as unknown as Promise<Record<string, unknown> | null>;
}

async function getPartnerById(partnerId: string) {
  return prisma.partner.findUnique({ where: { id: partnerId } }) as unknown as Promise<Record<string, unknown> | null>;
}

function idOf(record: Record<string, unknown> | null | undefined) {
  return typeof record?.id === "string" ? record.id : null;
}

async function getCurrentPartner(user: CurrentUser) {
  if (user.partnerId) {
    return getPartnerById(user.partnerId);
  }

  if (user.role === "partner_voucher_staff" && user.branchId) {
    const branch = await prisma.partnerBranch.findUnique({ where: { id: user.branchId }, select: { partner_id: true } });
    return branch?.partner_id ? getPartnerById(branch.partner_id) : null;
  }

  if (user.role === "partner_owner") {
    return getPartnerForUser(user.id);
  }

  return null;
}

async function getCurrentPartnerId(user: CurrentUser) {
  if (user.partnerId) return user.partnerId;

  if (user.role === "partner_voucher_staff" && user.branchId) {
    const branch = await prisma.partnerBranch.findUnique({ where: { id: user.branchId }, select: { partner_id: true } });
    return branch?.partner_id ?? null;
  }

  if (user.role === "partner_owner") {
    const partner = await getPartnerForUser(user.id);
    return idOf(partner);
  }

  return null;
}

async function getVoucher(id: string) {
  return requireData<Record<string, unknown>>(
    await prisma.voucherProduct.findUnique({ where: { id }, include: PARTNER_NAME_INCLUDE }) as unknown as Record<string, unknown> | null,
    "Voucher product not found"
  );
}

async function getRequiredCurrentPartnerId(user: CurrentUser) {
  const partnerId = await getCurrentPartnerId(user);
  if (!partnerId) {
    throw new HttpError(403, "Partner context is required", "PARTNER_CONTEXT_REQUIRED");
  }

  return partnerId;
}

async function assertVoucherOwnerOrAdmin(user: CurrentUser | undefined, voucher: Record<string, unknown>, allowAdminContent = true) {
  if (allowAdminContent && user?.role === "admin_content") return;
  if (!user) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }

  const partnerId = await getCurrentPartnerId(user);
  if (partnerId !== voucher.partner_id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
}

function assertVoucherManager(user: CurrentUser | undefined): asserts user is CurrentUser {
  if (!user || !["partner_owner", "partner_voucher_staff"].includes(user.role)) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
}

function assertPartnerCanManageVouchers(partner: Record<string, unknown> | null): asserts partner is Record<string, unknown> {
  if (!partner || partner.approval_status !== "approved" || partner.status !== "active") {
    throw new HttpError(403, "Partner must be approved and active", "PARTNER_NOT_ACTIVE");
  }
}

function requirePositiveNumber(value: unknown, message: string, code: string) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new HttpError(400, message, code);
  }

  return numberValue;
}

function requirePositiveInteger(value: unknown, message: string, code: string) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new HttpError(400, message, code);
  }

  return numberValue;
}

function requireValidDate(value: unknown, message: string, code: string) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, message, code);
  }

  return date;
}

function hasContent(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => hasContent(item));
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== null && value !== undefined;
}

function validateVoucherBusinessFields(voucher: Record<string, unknown>) {
  if (!String(voucher.name ?? "").trim()) {
    throw new HttpError(400, "Voucher name is required", "MISSING_REQUIRED_FIELD", { field: "name" });
  }
  if (!String(voucher.description ?? "").trim()) {
    throw new HttpError(400, "Voucher description is required", "MISSING_REQUIRED_FIELD", { field: "description" });
  }
  if (!voucher.category_id) {
    throw new HttpError(400, "Voucher category is required", "MISSING_REQUIRED_FIELD", { field: "category_id" });
  }

  const originalPrice = requirePositiveNumber(voucher.original_price, "Original price must be positive", "INVALID_PRICE");
  const sellingPrice = requirePositiveNumber(voucher.selling_price, "Selling price must be positive", "INVALID_PRICE");
  if (sellingPrice >= originalPrice) {
    throw new HttpError(400, "Selling price must be less than original price", "INVALID_PRICE");
  }

  requirePositiveInteger(voucher.total_quantity, "Total quantity must be positive", "INVALID_QUANTITY");
  requirePositiveInteger(voucher.validity_days, "Validity days must be positive", "INVALID_VALIDITY_DAYS");

  const saleStart = requireValidDate(voucher.sale_start_date, "Sale start date is invalid", "INVALID_DATE_RANGE");
  const saleEnd = requireValidDate(voucher.sale_end_date, "Sale end date is invalid", "INVALID_DATE_RANGE");
  if (saleStart > saleEnd) {
    throw new HttpError(400, "Sale start date must be before sale end date", "INVALID_DATE_RANGE");
  }

  if (!hasContent(voucher.terms_and_conditions)) {
    throw new HttpError(400, "Terms and conditions are required", "MISSING_REQUIRED_FIELD", { field: "terms_and_conditions" });
  }
}

function getWorkflowStatus(voucher: Record<string, unknown>): WorkflowStatus {
  if (voucher.status === "active" && voucher.approval_status === "approved") return "active";
  if (voucher.status === "paused") return "paused";
  if (voucher.status === "sold_out") return "sold_out";
  if (voucher.status === "expired") return "expired";
  if (voucher.approval_status === "rejected") return "rejected";
  if (voucher.approval_status === "approved") return "approved";
  if (voucher.status === "draft" && voucher.submitted_at) return "pending_approval";
  return "draft";
}

const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  draft: "Nháp",
  pending_approval: "Chờ duyệt",
  rejected: "Bị từ chối",
  approved: "Đã duyệt",
  active: "Đang bán",
  paused: "Tạm dừng",
  sold_out: "Hết số lượng",
  expired: "Hết hạn"
};

function withWorkflow<T extends Record<string, unknown>>(voucher: T) {
  const workflowStatus = getWorkflowStatus(voucher);
  return {
    ...voucher,
    workflow_status: workflowStatus,
    workflow_label: WORKFLOW_LABELS[workflowStatus]
  };
}

export async function listVoucherProducts(user: CurrentUser | undefined, queryInput: Record<string, string | number>) {
  const { page, limit, category_id: categoryId, partner_id: partnerId, search, scope, area } = queryInput;
  const { from, to } = rangeFromPagination(Number(page), Number(limit));

  const where: Record<string, unknown> = {};
  if (scope === "mine") {
    assertVoucherManager(user);
    where.partner_id = await getRequiredCurrentPartnerId(user);
  } else {
    const today = new Date(todayIsoDate());
    Object.assign(where, {
      approval_status: "approved",
      status: "active",
      sale_start_date: { lte: today },
      sale_end_date: { gte: today },
      remaining_quantity: { gt: 0 }
    });
    if (partnerId) where.partner_id = partnerId;
  }

  if (categoryId) where.category_id = categoryId;
  if (search) where.name = { contains: String(search), mode: "insensitive" };
  if (area) {
    const areaCandidates = getAreaMatchCandidates(String(area));
    if (areaCandidates.length > 0) {
      where.voucher_product_branches = {
        some: {
          partner_branches: {
            OR: areaCandidates.map((candidate) => ({
              city: {
                equals: candidate,
                mode: "insensitive"
              }
            }))
          }
        }
      };
    }
  }

  const [items, count] = await prisma.$transaction([
    prisma.voucherProduct.findMany({ where, include: PARTNER_NAME_INCLUDE, skip: from, take: to - from + 1, orderBy: { created_at: "desc" } }),
    prisma.voucherProduct.count({ where })
  ]);
  return { items: (items as unknown as Record<string, unknown>[]).map(withWorkflow), count, page, limit };
}

export async function createVoucherProduct(user: CurrentUser, input: Record<string, unknown>) {
  const partner = await getCurrentPartner(user);
  assertPartnerCanManageVouchers(partner);
  validateVoucherBusinessFields(input);
  const saleStartDate = requireValidDate(input.sale_start_date, "Sale start date is invalid", "INVALID_DATE_RANGE");
  const saleEndDate = requireValidDate(input.sale_end_date, "Sale end date is invalid", "INVALID_DATE_RANGE");

  const payload = {
    category_id: input.category_id,
    name: input.name,
    description: input.description,
    thumbnail_url: input.thumbnail_url,
    original_price: input.original_price,
    selling_price: input.selling_price,
    applicable_area: input.applicable_area
      ? serializeApplicableAreas(String(input.applicable_area).split(","))
      : null,
    total_quantity: input.total_quantity,
    terms_and_conditions: input.terms_and_conditions,
    usage_instructions: input.usage_instructions,
    sale_start_date: saleStartDate,
    sale_end_date: saleEndDate,
    validity_days: input.validity_days,
    partner_id: partner.id,
    remaining_quantity: input.total_quantity,
    discount_rate: calcDiscount(Number(input.original_price), Number(input.selling_price)),
    created_by: user.id,
    submitted_by: null,
    submitted_at: null,
    approval_status: "pending",
    status: "draft"
  };
  try {
    const voucher = await prisma.voucherProduct.create({ data: payload as never });
    return withWorkflow(voucher as unknown as Record<string, unknown>);
  } catch (error) {
    throwDbError(error);
  }
}

export async function getVoucherProduct(user: CurrentUser | undefined, id: string) {
  const voucher = await getVoucher(id);
  const isPublicVisible = voucher.approval_status === "approved" && voucher.status === "active";
  if (!isPublicVisible && user) await assertVoucherOwnerOrAdmin(user, voucher);
  if (!isPublicVisible && !user) throw new HttpError(404, "Voucher product not found", "NOT_FOUND");
  return withWorkflow(voucher);
}

export async function updateVoucherProduct(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const voucher = await getVoucher(id);
  await assertVoucherOwnerOrAdmin(user, voucher, false);
  if (input.selling_price && Number(input.selling_price) >= Number(input.original_price ?? voucher.original_price)) {
    throw new HttpError(400, "Selling price must be less than original price", "INVALID_PRICE");
  }
  const originalPrice = Number(input.original_price ?? voucher.original_price);
  const sellingPrice = Number(input.selling_price ?? voucher.selling_price);
  const payload = {
    ...input,
    applicable_area: input.applicable_area === undefined
      ? undefined
      : serializeApplicableAreas(String(input.applicable_area).split(",")),
    discount_rate: calcDiscount(originalPrice, sellingPrice),
    updated_at: new Date()
  };
  try {
    const updated = await prisma.voucherProduct.update({ where: { id }, data: payload as never });
    return withWorkflow(updated as unknown as Record<string, unknown>);
  } catch (error) {
    throwDbError(error, "Voucher product not found");
  }
}

export async function deleteVoucherProduct(user: CurrentUser, id: string) {
  const voucher = await getVoucher(id);
  await assertVoucherOwnerOrAdmin(user, voucher);
  try {
    await prisma.voucherProduct.update({ where: { id }, data: { status: "paused", updated_at: new Date() } });
  } catch (error) {
    throwDbError(error, "Voucher product not found");
  }
}

export async function submitVoucherProduct(user: CurrentUser, id: string) {
  const partner = await getCurrentPartner(user);
  assertPartnerCanManageVouchers(partner);
  const voucher = await getVoucher(id);
  if (idOf(partner) !== voucher.partner_id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
  if (voucher.status !== "draft") {
    throw new HttpError(422, "Only draft vouchers can be submitted", "INVALID_VOUCHER_STATUS");
  }
  if (voucher.approval_status !== "pending") {
    throw new HttpError(422, "Only pending approval vouchers can be submitted", "INVALID_APPROVAL_STATUS");
  }
  if (voucher.submitted_at) {
    throw new HttpError(422, "Voucher is already pending approval", "VOUCHER_ALREADY_SUBMITTED");
  }
  validateVoucherBusinessFields(voucher);

  const branchCount = await prisma.voucherProductBranch.count({
    where: {
      voucher_product_id: id,
      partner_branches: {
        partner_id: String(voucher.partner_id),
        is_active: true
      }
    }
  });
  if (branchCount === 0) {
    throw new HttpError(400, "At least one applicable branch is required", "MISSING_VOUCHER_BRANCH");
  }

  try {
    const submitted = await prisma.voucherProduct.update({
      where: { id },
      data: {
        approval_status: "pending",
        submitted_by: user.id,
        submitted_at: new Date(),
        approved_by: null,
        approved_at: null,
        updated_at: new Date()
      } as never
    });
    return withWorkflow(submitted as unknown as Record<string, unknown>);
  } catch (error) {
    throwDbError(error, "Voucher product not found");
  }
}

export async function approveVoucherProduct(adminId: string, id: string, approvalStatus: string) {
  try {
    const updated = await prisma.voucherProduct.update({ where: { id }, data: { approval_status: approvalStatus, approved_by: adminId, approved_at: new Date(), updated_at: new Date() } });
    return withWorkflow(updated as unknown as Record<string, unknown>);
  } catch (error) {
    throwDbError(error, "Voucher product not found");
  }
}

export async function updateVoucherStatus(user: CurrentUser, id: string, status: string) {
  const voucher = await getVoucher(id);
  await assertVoucherOwnerOrAdmin(user, voucher);
  if (status === "active" && voucher.approval_status !== "approved") {
    throw new HttpError(422, "Only approved voucher can be active", "VOUCHER_NOT_APPROVED");
  }
  try {
    const updated = await prisma.voucherProduct.update({ where: { id }, data: { status, updated_at: new Date() } });
    return withWorkflow(updated as unknown as Record<string, unknown>);
  } catch (error) {
    throwDbError(error, "Voucher product not found");
  }
}

export async function listVoucherImages(id: string) {
  return prisma.voucherProductImage.findMany({ where: { voucher_product_id: id }, orderBy: { sort_order: "asc" } });
}

export async function createVoucherImage(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const voucher = await getVoucher(id);
  await assertVoucherOwnerOrAdmin(user, voucher, false);
  try {
    return await prisma.voucherProductImage.create({ data: { ...input, voucher_product_id: id } as never });
  } catch (error) {
    throwDbError(error);
  }
}

export async function updateVoucherImage(user: CurrentUser, imageId: string, input: Record<string, unknown>) {
  const existing = requireData<Record<string, unknown>>(await prisma.voucherProductImage.findUnique({ where: { id: imageId }, include: { voucher_products: true } }) as unknown as Record<string, unknown> | null, "Image not found");
  await assertVoucherOwnerOrAdmin(user, existing.voucher_products as Record<string, unknown>, false);
  try {
    return await prisma.voucherProductImage.update({ where: { id: imageId }, data: input as never });
  } catch (error) {
    throwDbError(error, "Image not found");
  }
}

export async function deleteVoucherImage(user: CurrentUser, imageId: string) {
  const existing = requireData<Record<string, unknown>>(await prisma.voucherProductImage.findUnique({ where: { id: imageId }, include: { voucher_products: true } }) as unknown as Record<string, unknown> | null, "Image not found");
  await assertVoucherOwnerOrAdmin(user, existing.voucher_products as Record<string, unknown>, false);
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
  const partnerId = await getRequiredCurrentPartnerId(user);
  if (partnerId !== voucher.partner_id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }
  const branch = await prisma.partnerBranch.findUnique({ where: { id: branchId }, select: { partner_id: true, is_active: true } });
  if (!branch || branch.partner_id !== partnerId || !branch.is_active) {
    throw new HttpError(403, "Branch does not belong to current partner", "INVALID_BRANCH_OWNER");
  }
  try {
    return await prisma.voucherProductBranch.create({ data: { voucher_product_id: id, branch_id: branchId } });
  } catch (error) {
    throwDbError(error);
  }
}

export async function deleteVoucherBranch(user: CurrentUser, id: string, branchId: string) {
  const voucher = await getVoucher(id);
  await assertVoucherOwnerOrAdmin(user, voucher, false);
  await prisma.voucherProductBranch.deleteMany({ where: { voucher_product_id: id, branch_id: branchId } });
}
