import type { UserRole } from "../types/auth.types.js";
import { prisma } from "../config/prisma.js";
import { requireData, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";
import { getAreaMatchCandidates, serializeApplicableAreas } from "../utils/applicable-area.js";
import { rangeFromPagination } from "../validations/common.validation.js";
import { notifyVoucherApproved, notifyVoucherRejected } from "./notification.service.js";

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

/**
 * FC-PAV-MANAGE: Field locking by voucher status.
 * BR-PAV-03 / BR-PAR-04: Partner may only edit fields permitted for the current status.
 * RB-11: total_quantity/remaining_quantity must not be altered after approval.
 */
const LOCKED_FIELDS_BY_STATUS: Record<string, string[]> = {
  draft: [],
  pending: [],
  approved: ["total_quantity", "remaining_quantity"],
  active: ["total_quantity", "remaining_quantity", "original_price", "selling_price"],
  sold_out: ["total_quantity", "remaining_quantity", "original_price", "selling_price", "name", "category_id"],
  expired: ["*"],
};

function getLockedFields(status: string): string[] {
  return LOCKED_FIELDS_BY_STATUS[status] ?? ["*"];
}

function assertFieldsNotLocked(status: string, inputKeys: string[]) {
  const locked = getLockedFields(status);
  if (locked.includes("*")) {
    throw new HttpError(403, `Cannot edit voucher in "${status}" status`, "STATUS_LOCKED");
  }
  const blocked = inputKeys.filter((k) => locked.includes(k));
  if (blocked.length > 0) {
    throw new HttpError(
      403,
      `Field(s) not editable in "${status}" status: ${blocked.join(", ")}`,
      "FIELD_LOCKED",
      { locked_fields: blocked }
    );
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
    prisma.voucherProduct.findMany({
      where,
      select: {
        id: true,
        partner_id: true,
        category_id: true,
        name: true,
        description: true,
        thumbnail_url: true,
        original_price: true,
        selling_price: true,
        discount_rate: true,
        applicable_area: true,
        total_quantity: true,
        remaining_quantity: true,
        sale_start_date: true,
        sale_end_date: true,
        status: true,
        approval_status: true,
        partners: { select: { business_name: true } },
      },
      skip: from,
      take: to - from + 1,
      orderBy: { created_at: "desc" },
    }),
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

export async function getPublicVoucherDetail(id: string) {
  const [voucher, branches, reviews] = await Promise.all([
    prisma.voucherProduct.findFirst({
      where: { id, approval_status: "approved", status: { in: ["active", "paused", "sold_out", "expired"] } },
      select: {
        id: true,
        partner_id: true,
        category_id: true,
        name: true,
        description: true,
        thumbnail_url: true,
        original_price: true,
        selling_price: true,
        discount_rate: true,
        applicable_area: true,
        total_quantity: true,
        remaining_quantity: true,
        sale_start_date: true,
        sale_end_date: true,
        validity_days: true,
        terms_and_conditions: true,
        usage_instructions: true,
        status: true,
        approval_status: true,
        partners: { select: { business_name: true } },
        categories: { select: { name: true, slug: true } }
      }
    }),
    prisma.voucherProductBranch.findMany({
      where: { voucher_product_id: id },
      select: {
        id: true,
        branch_id: true,
        partner_branches: {
          select: { id: true, branch_name: true, address: true, city: true, district: true }
        }
      }
    }),
    Promise.all([
      prisma.review.findMany({
        where: { voucher_product_id: id, is_published: true },
        orderBy: { created_at: "desc" },
        take: 6,
        select: {
          id: true,
          rating: true,
          comment: true,
          created_at: true,
          users: { select: { full_name: true } }
        }
      }),
      prisma.review.aggregate({
        where: { voucher_product_id: id, is_published: true },
        _avg: { rating: true },
        _count: { _all: true }
      })
    ])
  ]);

  const current = requireData(voucher, "Voucher product not found") as Record<string, unknown>;
  const [reviewItems, reviewStats] = reviews;
  return {
    voucher: withWorkflow(current),
    branches,
    reviews: {
      items: reviewItems,
      pagination: { total: reviewStats._count._all },
      average_rating: Number((reviewStats._avg.rating ?? 0).toFixed(1))
    }
  };
}

export async function updateVoucherProduct(user: CurrentUser, id: string, input: Record<string, unknown>) {
  const voucher = await getVoucher(id);
  await assertVoucherOwnerOrAdmin(user, voucher, false);

  // FC-PAV-MANAGE: Field locking — reject edits to locked fields based on current status
  const inputKeys = Object.keys(input).filter((k) => input[k] !== undefined);
  assertFieldsNotLocked(String(voucher.status), inputKeys);

  // RB-02: selling price must not exceed original price
  if (input.selling_price && Number(input.selling_price) >= Number(input.original_price ?? voucher.original_price)) {
    throw new HttpError(400, "Selling price must be less than original price", "INVALID_PRICE");
  }

  // RB-11: remaining_quantity must track with total_quantity changes
  if (input.total_quantity !== undefined) {
    const newTotal = Number(input.total_quantity);
    const currentSold = Number(voucher.total_quantity) - Number(voucher.remaining_quantity);
    if (newTotal < currentSold) {
      throw new HttpError(
        400,
        `Total quantity (${newTotal}) cannot be less than already sold quantity (${currentSold})`,
        "INVALID_QUANTITY",
        { sold: currentSold, requested: newTotal }
      );
    }
    // Auto-update remaining_quantity to maintain sold count
    (input as Record<string, unknown>).remaining_quantity = newTotal - currentSold;
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

export async function approveVoucherProduct(adminId: string, id: string, input: {
  approval_status: string;
  reject_reason?: string
}) {
  // Kiểm tra voucher (include partner info + representative email)
  const voucher = await requireData<Record<string, unknown>>(
    await prisma.voucherProduct.findUnique({
      where: { id },
      include: {
        partners: {
          select: {
            business_name: true,
            representative_user: {
              select: { email: true, full_name: true },
            },
          },
        },
      },
    }) as unknown as Record<string, unknown> | null,
    "Voucher product not found"
  );

  if (voucher.approval_status !== "pending") {
    throw new HttpError(400, "Voucher không ở trạng thái chờ duyệt", "INVALID_APPROVAL_STATUS");
  }

  // Nếu là reject --> kiểm tra reject_reason, nếu thiếu thì báo lỗi
  if (input.approval_status === "rejected" && !input.reject_reason) {
    throw new HttpError(400, "Lý do từ chối không được để trống", "MISSING_REJECT_REASON");
  }

  // Nếu là voucher được duyệt --> kiểm tra BR
  if (input.approval_status === "approved") {
    // RB-02: Kiểm tra giá bán < original_price
    const sellingPrice = Number(voucher.selling_price);
    const originalPrice = Number(voucher.original_price);
    if (isNaN(sellingPrice) || isNaN(originalPrice) || sellingPrice >= originalPrice) {
      throw new HttpError(400, "Giá bán phải nhỏ hơn giá gốc (Vi phạm quy tắc giá RB-02)", "INVALID_PRICE_RULE");
    }

    // RB-03: Kiểm tra có đầy đủ thời gian bán bắt đầu, kết thúc và số ngày sử dụng
    const hasSaleTime = voucher.sale_start_date && voucher.sale_end_date;
    const hasValidTime = voucher.validity_days;
    if (!hasSaleTime || !hasValidTime) {
      throw new HttpError(400, "Voucher thiếu thời gian bán hàng hoặc thời gian sử dụng", "MISSING_TIME_RANGE");
    }

    // RB-04: Kiểm tra voucher hết số lượng phát hành hoặc hết thời gian bán
    const saleEndDate = voucher.sale_end_date instanceof Date ? voucher.sale_end_date : new Date(String(voucher.sale_end_date));
    const remainingQuantity = Number(voucher.remaining_quantity);
    const isOutOfQuantity = remainingQuantity <= 0;
    const isSaleExpired = !isNaN(saleEndDate.getTime()) && saleEndDate.getTime() <= Date.now();
    if (isOutOfQuantity || isSaleExpired) {
      throw new HttpError(400, "Voucher đã hết số lượng phát hành hoặc hết thời hạn bán", "VOUCHER_EXPIRED_OR_OUT_OF_STOCK");
    }
  }

  // Transaction: cập nhật và audit log
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.voucherProduct.update({
      where: { id },
      data: {
        approval_status: input.approval_status,
        approved_by: adminId,
        approved_at: new Date(),
        updated_at: new Date(),
      },
    });

    await tx.adminLog.create({
      data: {
        admin_id: adminId,
        action: input.approval_status === "approved" ? "APPROVE_VOUCHER" : "REJECT_VOUCHER",
        content_type: "voucher",
        description: input.approval_status === "approved"
          ? `Duyệt voucher: ${voucher.name}`
          : `Từ chối voucher: ${voucher.name}. Lý do: ${input.reject_reason}`,
        target_voucher_id: id,
      },
    });

    return withWorkflow(updated as Record<string, unknown>);
  });

  // Gửi email notification cho partner (fire-and-forget)
  const partner = voucher.partners as { business_name: string; representative_user: { email: string; full_name: string } } | null;
  if (partner?.representative_user?.email) {
    const emailParams = {
      partnerEmail: partner.representative_user.email,
      partnerName: partner.representative_user.full_name || partner.business_name,
      voucherName: voucher.name as string,
    };

    if (input.approval_status === "approved") {
      notifyVoucherApproved(emailParams).catch((err) =>
        console.error("[Notification] Failed to send approval email:", err)
      );
    } else {
      notifyVoucherRejected({ ...emailParams, rejectReason: input.reject_reason! }).catch((err) =>
        console.error("[Notification] Failed to send rejection email:", err)
      );
    }
  }

  return result;
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
