import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/http-error.js";
import { buildPaginatedResult } from "../utils/pagination.js";
import * as issuedVoucherRepo from "../repositories/issued-voucher.repository.js";
import * as voucherUsageRepo from "../repositories/voucher-usage.repository.js";
import { isAdminRole, isPartnerStaff, type AuthUser } from "../types/auth.types.js";
import type { IssuedVoucherStatus } from "../types/issued-voucher.types.js";
import type { ListIssuedVouchersQuery } from "../validations/issued-voucher.validation.js";
import type {
  ConfirmVoucherInput,
  UpdateIssuedVoucherStatusInput,
} from "../validations/issued-voucher.validation.js";
import type { CheckVoucherInput } from "../validations/issued-voucher.validation.js";

type IssuedVoucherWithProduct = Awaited<
  ReturnType<typeof issuedVoucherRepo.findIssuedVoucherById>
>;

function dateToIsoDate(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function assertCanViewIssuedVoucher(user: AuthUser, voucher: NonNullable<IssuedVoucherWithProduct>) {
  if (isAdminRole(user.role)) return;
  if (voucher.owner_id === user.id) return;
  if (isPartnerStaff(user.role) && voucher.voucher_products.partner_id === user.partnerId) return;
  throw new HttpError(403, "Bạn không có quyền xem voucher này");
}

function assertPartnerScope(user: AuthUser, voucher: NonNullable<IssuedVoucherWithProduct>) {
  if (isAdminRole(user.role)) return;
  if (!isPartnerStaff(user.role)) {
    throw new HttpError(403, "Bạn không có quyền truy cập voucher này");
  }
  if (user.partnerId && voucher.voucher_products.partner_id !== user.partnerId) {
    throw new HttpError(403, "Voucher không thuộc phạm vi đối tác của bạn");
  }
}

function resolveRedeemableState(voucher: NonNullable<IssuedVoucherWithProduct>) {
  const today = new Date().toISOString().slice(0, 10);

  if (voucher.status === "used") return { redeemable: false, reason: "Voucher đã được sử dụng" };
  if (voucher.status === "refunded") return { redeemable: false, reason: "Voucher đã hoàn tiền" };
  if (voucher.status === "expired" || dateToIsoDate(voucher.expired_date) < today) {
    return { redeemable: false, reason: "Voucher đã hết hạn" };
  }
  if (voucher.status !== "active") {
    return { redeemable: false, reason: "Voucher không ở trạng thái hợp lệ" };
  }
  return { redeemable: true, reason: null as string | null };
}

export async function listIssuedVouchers(user: AuthUser, query: ListIssuedVouchersQuery) {
const filter = {
    status: query.status,
    page: query.page,
    limit: query.limit,
    ownerId: user.role === "buyer" ? user.id : undefined,
    feedbackUserId: user.role === "buyer" ? user.id : undefined,
    partnerId: isPartnerStaff(user.role) ? (user.partnerId ?? undefined) : undefined,
    isTest: false,
  };

  const { rows, total } = await issuedVoucherRepo.listIssuedVouchers(filter);
  return buildPaginatedResult(rows, total, { page: query.page, limit: query.limit });
}

export async function getIssuedVoucherById(user: AuthUser, id: string) {
  const voucher = await issuedVoucherRepo.findIssuedVoucherById(id, user.role === "buyer" ? user.id : undefined);
  if (!voucher) throw new HttpError(404, "Không tìm thấy voucher đã phát hành");
  assertCanViewIssuedVoucher(user, voucher);
  return voucher;
}

export async function updateIssuedVoucherStatus(
  user: AuthUser,
  id: string,
  input: UpdateIssuedVoucherStatusInput,
) {
  if (!isAdminRole(user.role)) {
    throw new HttpError(403, "Chỉ quản trị viên được cập nhật trạng thái đặc biệt");
  }

  const voucher = await issuedVoucherRepo.findIssuedVoucherById(id);
  if (!voucher) throw new HttpError(404, "Không tìm thấy voucher đã phát hành");

  return issuedVoucherRepo.updateIssuedVoucherStatus(id, input.status as IssuedVoucherStatus);
}

export async function listUsagesForVoucher(user: AuthUser, issuedVoucherId: string) {
  const voucher = await getIssuedVoucherById(user, issuedVoucherId);
  return voucherUsageRepo.listUsagesByIssuedVoucher(voucher.id);
}

export async function listUsages(
  user: AuthUser,
  query: { page: number; limit: number },
) {
  if (!isPartnerStaff(user.role) && user.role !== "admin_security") {
    throw new HttpError(403, "Bạn không có quyền xem log xác thực");
  }

  const filter = {
    page: query.page,
    limit: query.limit,
    partnerId: isPartnerStaff(user.role) ? (user.partnerId ?? undefined) : undefined,
    branchId: user.role === "partner_store_staff" ? (user.branchId ?? undefined) : undefined,
  };

  const { rows, total } = await voucherUsageRepo.listUsages(filter);

  const items = (rows as unknown as Array<Record<string, unknown>>).map((row) => {
    const issued = (row.issued_vouchers ?? {}) as {
      voucher_code?: string;
      owners?: { full_name?: string } | null;
      voucher_products?: { name?: string } | null;
    };
    const redeemer = (row.redeemer ?? {}) as { full_name?: string } | null;
    const branch = (row.partner_branches ?? {}) as { branch_name?: string } | null;

    return {
      id: String(row.id),
      voucherCode: issued.voucher_code ?? "",
      voucherTitle: issued.voucher_products?.name ?? "Voucher",
      customerName: issued.owners?.full_name ?? "",
      branchName: branch?.branch_name ?? "",
      staffName: redeemer?.full_name ?? user.name,
      verifiedAt: row.used_at,
      status: "used",
    };
  });

  return buildPaginatedResult(items, total, query);
}

async function logVoucherCheck(user: AuthUser, voucherCode: string | null, status: "success" | "failed", reason?: string) {
  try {
    await prisma.voucherCheckLog.create({
      data: { user_id: user.id, voucher_code: voucherCode, status, reason },
    });
  } catch {
    // Log failure should not break the voucher check flow.
  }
}

export async function checkVoucher(user: AuthUser, input: CheckVoucherInput) {
  if (!isPartnerStaff(user.role) && !isAdminRole(user.role)) {
    throw new HttpError(403, "Bạn không có quyền kiểm tra voucher");
  }

  const voucher = input.qr_code_payload
    ? await issuedVoucherRepo.findIssuedVoucherByQrPayload(input.qr_code_payload)
    : input.voucher_code
      ? await issuedVoucherRepo.findIssuedVoucherByCode(input.voucher_code)
      : null;

  if (!voucher) {
    const code = input.voucher_code ?? input.qr_code_payload ?? "";
    await logVoucherCheck(user, code, "failed", "Mã không tồn tại");
    throw new HttpError(404, "Mã voucher không hợp lệ");
  }

  // Mã thử (record is_test) chỉ dành cho admin, chủ đối tác và nhân viên tạo voucher.
  // Nhân viên cửa hàng quét mã thử sẽ bị coi là mã không tồn tại (giữ luồng khách thật).
  if (voucher.is_test && user.role === "partner_store_staff") {
    throw new HttpError(404, "Mã voucher không hợp lệ");
  }

  assertPartnerScope(user, voucher);

  const today = new Date().toISOString().slice(0, 10);
  if (voucher.status === "active" && dateToIsoDate(voucher.expired_date) < today) {
    await issuedVoucherRepo.updateIssuedVoucherStatus(voucher.id, "expired");
  }

  const state = resolveRedeemableState(voucher);
  if (!state.redeemable) {
    await logVoucherCheck(user, voucher.voucher_code, "failed", state.reason!);
    throw new HttpError(400, state.reason!);
  }

  if (user.role === "partner_store_staff") {
    const eligibleBranchIds = await issuedVoucherRepo.findEligibleBranchIds(voucher.voucher_product_id);
    const userBranchId = user.branchId;

    if (!userBranchId || !eligibleBranchIds.includes(userBranchId)) {
      throw new HttpError(403, "Bạn chỉ được kiểm tra voucher tại chi nhánh của mình");
    }
  }

  const [eligibleBranchIds, eligibleBranches] = await Promise.all([
    issuedVoucherRepo.findEligibleBranchIds(voucher.voucher_product_id),
    issuedVoucherRepo.findEligibleBranches(voucher.voucher_product_id),
  ]);

  return {
    issued_voucher: voucher,
    eligible_branch_ids: eligibleBranchIds,
    eligible_branches: eligibleBranches,
    ...(voucher.is_test ? { is_test: true } : {}),
  };
}

export async function confirmVoucher(user: AuthUser, input: ConfirmVoucherInput) {
  if (user.role !== "partner_store_staff") {
    throw new HttpError(403, "Chỉ nhân viên cửa hàng được xác nhận sử dụng voucher");
  }

  const voucher = await issuedVoucherRepo.findIssuedVoucherByCode(input.voucher_code);

  if (!voucher) {
    await logVoucherCheck(user, input.voucher_code, "failed", "Mã không tồn tại");
    throw new HttpError(404, "Mã voucher không hợp lệ");
  }

  if (voucher.is_test) {
    throw new HttpError(404, "Mã voucher không hợp lệ");
  }

  assertPartnerScope(user, voucher);

  const today = new Date().toISOString().slice(0, 10);
  if (voucher.status === "active" && dateToIsoDate(voucher.expired_date) < today) {
    await issuedVoucherRepo.updateIssuedVoucherStatus(voucher.id, "expired");
    await logVoucherCheck(user, voucher.voucher_code, "failed", "Voucher đã hết hạn");
    throw new HttpError(400, "Voucher đã hết hạn");
  }

  const eligibleBranchIds = await issuedVoucherRepo.findEligibleBranchIds(voucher.voucher_product_id);
  const userBranchId = user.branchId;

  if (!userBranchId || !eligibleBranchIds.includes(userBranchId)) {
    throw new HttpError(403, "Bạn chỉ được xác nhận sử dụng voucher tại chi nhánh của mình");
  }

  const result = await prisma.$transaction(async (tx) => {
    const reVoucher = await tx.issuedVoucher.findUnique({
      where: { id: voucher.id },
    });

    if (!reVoucher || reVoucher.status !== "active") {
      await logVoucherCheck(user, voucher.voucher_code, "failed", "Voucher đã được sử dụng hoặc không còn hợp lệ");
      throw new HttpError(400, "Voucher đã được sử dụng hoặc không còn hợp lệ");
    }

    const updatedVoucher = await tx.issuedVoucher.update({
      where: { id: voucher.id },
      data: { status: "used", updated_at: new Date() },
    });

    const usage = await tx.voucherUsage.create({
      data: {
        issued_voucher_id: voucher.id,
        branch_id: userBranchId,
        redeemed_by: user.id,
        used_at: new Date(),
      },
    });

const remainingVouchers = await tx.issuedVoucher.count({
      where: {
        order_items: { order_id: voucher.order_items!.order_id },
        status: { not: "used" },
      },
    });
    if (remainingVouchers === 0) {
      const completed = await tx.order.updateMany({
        where: { id: voucher.order_items!.order_id, status: { in: ["confirmed", "pending_manual", "used"] } },
        data: { status: "completed", updated_at: new Date() },
      });
      if (completed.count > 0) {
        await tx.orderLog.create({
          data: {
            order_id: voucher.order_items!.order_id,
            user_id: user.id,
            action: "COMPLETE_ORDER",
            description: "All issued vouchers have been used",
          },
        });
      }
    }

    return { message: "Xác nhận sử dụng voucher thành công", issued_voucher: updatedVoucher, usage };
  });

  await logVoucherCheck(user, voucher.voucher_code, "success");

  return result;
}

export async function expireIssuedVouchers(now = new Date()) {
  const today = new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");
  const { count } = await issuedVoucherRepo.expireExpiredVouchers(today);
  return count;
}
