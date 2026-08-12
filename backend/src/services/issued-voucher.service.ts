import { HttpError } from "../utils/http-error.js";
import { buildPaginatedResult } from "../utils/pagination.js";
import * as issuedVoucherRepo from "../repositories/issued-voucher.repository.js";
import * as voucherUsageRepo from "../repositories/voucher-usage.repository.js";
import { isAdminRole, type AuthUser } from "../types/auth.types.js";
import type {
  IssuedVoucherStatus,
  ListIssuedVouchersQuery,
} from "../types/issued-voucher.types.js";
import type {
  RedeemVoucherInput,
  UpdateIssuedVoucherStatusInput,
  ValidateVoucherInput,
} from "../validations/issued-voucher.validation.js";
import type { CheckVoucherInput } from "../validations/issued-voucher.validation.js";

type IssuedVoucherWithProduct = Awaited<
  ReturnType<typeof issuedVoucherRepo.findIssuedVoucherById>
>;

function isPartnerStaff(user: AuthUser) {
  return (
    user.role === "partner_owner" ||
    user.role === "partner_voucher_staff" ||
    user.role === "partner_store_staff"
  );
}

function assertCanViewIssuedVoucher(user: AuthUser, voucher: NonNullable<IssuedVoucherWithProduct>) {
  if (isAdminRole(user.role)) return;
  if (voucher.owner_id === user.id) return;
  if (isPartnerStaff(user) && voucher.voucher_products.partner_id === user.partnerId) return;
  throw new HttpError(403, "Bạn không có quyền xem voucher này");
}

export async function listIssuedVouchers(user: AuthUser, query: ListIssuedVouchersQuery) {
  const filter = {
    status: query.status,
    page: query.page,
    limit: query.limit,
    ownerId: user.role === "buyer" ? user.id : undefined,
    partnerId: isPartnerStaff(user) ? (user.partnerId ?? undefined) : undefined,
  };

  const { rows, total } = await issuedVoucherRepo.listIssuedVouchers(filter);
  return buildPaginatedResult(rows, total, query);
}

export async function getIssuedVoucherById(user: AuthUser, id: string) {
  const voucher = await issuedVoucherRepo.findIssuedVoucherById(id);
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

function resolveRedeemableState(voucher: NonNullable<IssuedVoucherWithProduct>) {
  const today = new Date().toISOString().slice(0, 10);

  if (voucher.status === "used") return { redeemable: false, reason: "Voucher đã được sử dụng" };
  if (voucher.status === "refunded") return { redeemable: false, reason: "Voucher đã hoàn tiền" };
  if (voucher.status === "expired" || voucher.expired_date < today) {
    return { redeemable: false, reason: "Voucher đã hết hạn" };
  }
  if (voucher.status !== "active") {
    return { redeemable: false, reason: "Voucher không ở trạng thái hợp lệ" };
  }
  return { redeemable: true, reason: null as string | null };
}

export async function validateVoucher(user: AuthUser, input: ValidateVoucherInput) {
  if (!isPartnerStaff(user) && !isAdminRole(user.role)) {
    throw new HttpError(403, "Bạn không có quyền kiểm tra voucher");
  }

  const voucher = input.voucher_code
    ? await issuedVoucherRepo.findIssuedVoucherByCode(input.voucher_code)
    : await issuedVoucherRepo.findIssuedVoucherByQrPayload(input.qr_code_payload as string);

  if (!voucher) throw new HttpError(404, "Không tìm thấy voucher với mã đã cung cấp");

  // RB-09: đối tác chỉ được xác thực voucher thuộc phạm vi của mình
  if (isPartnerStaff(user) && voucher.voucher_products.partner_id !== user.partnerId) {
    throw new HttpError(403, "Voucher không thuộc phạm vi đối tác của bạn");
  }

  const state = resolveRedeemableState(voucher);
  const eligibleBranchIds = await issuedVoucherRepo.findEligibleBranchIds(voucher.voucher_product_id);

  return {
    issued_voucher: voucher,
    redeemable: state.redeemable,
    reason: state.reason,
    eligible_branch_ids: eligibleBranchIds,
  };
}

export async function redeemVoucher(user: AuthUser, issuedVoucherId: string, input: RedeemVoucherInput) {
  if (user.role !== "partner_store_staff") {
    throw new HttpError(403, "Chỉ nhân viên cửa hàng được xác nhận sử dụng voucher");
  }

  const voucher = await issuedVoucherRepo.findIssuedVoucherById(issuedVoucherId);
  if (!voucher) throw new HttpError(404, "Không tìm thấy voucher đã phát hành");

  // RB-09: đối tác chỉ xác thực voucher thuộc phạm vi chi nhánh/chương trình của mình
  if (voucher.voucher_products.partner_id !== user.partnerId) {
    throw new HttpError(403, "Voucher không thuộc phạm vi đối tác của bạn");
  }

  // store_staff chỉ redeem tại đúng chi nhánh được phân công
  if (user.role === "partner_store_staff" && user.branchId !== input.branch_id) {
    throw new HttpError(403, "Bạn chỉ được xác nhận voucher tại chi nhánh của mình");
  }

  const eligibleBranchIds = await issuedVoucherRepo.findEligibleBranchIds(voucher.voucher_product_id);
  if (!eligibleBranchIds.includes(input.branch_id)) {
    throw new HttpError(403, "Chi nhánh này không nằm trong phạm vi áp dụng của voucher");
  }

  const state = resolveRedeemableState(voucher);
  if (!state.redeemable) {
    // RB-07 / RB-08: đã dùng, hết hạn, bị hủy/khóa thì không được redeem
    const status = voucher.status === "used" ? 409 : 422;
    throw new HttpError(status, state.reason ?? "Voucher không hợp lệ để sử dụng");
  }

  const usage = await voucherUsageRepo.createVoucherUsage({
    issued_voucher_id: voucher.id,
    branch_id: input.branch_id,
    redeemed_by: user.id,
    redemption_code: input.redemption_code,
    note: input.note,
  });

  const updatedVoucher = await issuedVoucherRepo.updateIssuedVoucherStatus(voucher.id, "used");

  return { issued_voucher: updatedVoucher, usage };
}

export async function listUsagesForVoucher(user: AuthUser, issuedVoucherId: string) {
  const voucher = await getIssuedVoucherById(user, issuedVoucherId);
  return voucherUsageRepo.listUsagesByIssuedVoucher(voucher.id);
}

export async function listUsages(
  user: AuthUser,
  query: { page: number; limit: number },
) {
  if (!isPartnerStaff(user) && user.role !== "admin_security") {
    throw new HttpError(403, "Bạn không có quyền xem log xác thực");
  }

  const filter = {
    page: query.page,
    limit: query.limit,
    partnerId: isPartnerStaff(user) ? (user.partnerId ?? undefined) : undefined,
    branchId: user.role === "partner_store_staff" ? (user.branchId ?? undefined) : undefined,
  };

  const { rows, total } = await voucherUsageRepo.listUsages(filter);
  return buildPaginatedResult(rows, total, query);
}

// Hàm cho phần kiểm tra voucher
export async function checkVoucher(user: AuthUser, input: CheckVoucherInput) {
  // Query voucher theo mã hoặc qr_payload
  const voucher = input.qr_code_payload ? await issuedVoucherRepo.findIssuedVoucherByQrPayload(input.qr_code_payload) : await issuedVoucherRepo.findIssuedVoucherByCode(input.voucher_code);

  // Kiểm tra có tìm thấy
  if (!voucher) {
    throw new HttpError(404, "Mã voucher không hợp lệ.");
  }

  // Check RB-09: đối tác chỉ xác thực voucher thuộc phạm vi chi nhánh/chương trình của mình
  if (voucher && voucher.voucher_products.partner_id !== user.partnerId) {
    throw new HttpError(403, "Voucher không thuộc phạm vi đối tác của bạn");
  }

  // Check status của voucher
  if (voucher.status === "used") {
    throw new HttpError(400, "Voucher đã được sử dụng");
  }

  if (voucher.status === "refunded") {
    throw new HttpError(400, "Voucher đã hoàn tiền");
  }

  // So sánh để đánh giá trạng thái hết hạn
  const isExpired = voucher.status === "expired" || (voucher.expired_date && new Date (voucher.expired_date) < new Date());

  if (isExpired) {
    throw new HttpError(400, "Voucher đã hết hạn");
  }

  // Nếu ở trạng thái khác ngoài còn hạn (active) thì báo lỗi khác
  if (voucher.status !== "active") {
    throw new HttpError(400, "Voucher không ở trạng thái hợp lệ");
  }

  // Check branch eligibility (RB-09)
  const eligibleBranchIds = await issuedVoucherRepo.findEligibleBranchIds(voucher.voucher_product_id);

  const userBranchId = user.branchId;

  if (!userBranchId || !eligibleBranchIds.includes(userBranchId)) {
    throw new HttpError(403, "Bạn chỉ được kiểm tra voucher tại chi nhánh của mình.");
  }

  return {issued_voucher: voucher, eligible_branch_ids: eligibleBranchIds}
}