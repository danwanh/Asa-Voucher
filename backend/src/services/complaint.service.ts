import { HttpError } from "../utils/http-error.js";
import { buildPaginatedResult } from "../utils/pagination.js";
import * as complaintRepo from "../repositories/complaint.repository.js";
import * as complaintResponseRepo from "../repositories/complaint-response.repository.js";
import * as issuedVoucherRepo from "../repositories/issued-voucher.repository.js";
import { isAdminRole, type AuthUser, type AppRole } from "../types/auth.types.js";
import type {
  AssignComplaintInput,
  CreateComplaintInput,
  CreateComplaintResponseInput,
  ResolveComplaintInput,
  UpdateComplaintInput,
} from "../validations/complaint.validation.js";

type ComplaintWithRelations = NonNullable<Awaited<ReturnType<typeof complaintRepo.findComplaintById>>>;

function isPartnerStaff(role: AppRole) {
  return role === "partner_owner" || role === "partner_voucher_staff" || role === "partner_store_staff";
}

function relatedPartnerId(complaint: ComplaintWithRelations): string | undefined {
  return complaint.issued_vouchers?.voucher_products.partner_id;
}

function assertCanView(user: AuthUser, complaint: ComplaintWithRelations) {
  if (isAdminRole(user.role)) return;
  if (complaint.user_id === user.id) return;
  if (isPartnerStaff(user.role) && relatedPartnerId(complaint) === user.partnerId) return;
  throw new HttpError(403, "Bạn không có quyền xem khiếu nại này");
}

export async function listComplaints(user: AuthUser, query: { status?: string; page: number; limit: number }) {
  const filter = {
    status: query.status as ComplaintWithRelations["status"] | undefined,
    page: query.page,
    limit: query.limit,
    userId: user.role === "buyer" ? user.id : undefined,
    partnerId: isPartnerStaff(user.role) ? (user.partnerId ?? undefined) : undefined,
  };

  const { rows, total } = await complaintRepo.listComplaints(filter);
  return buildPaginatedResult(rows, total, query);
}

export async function getComplaintById(user: AuthUser, id: string) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new HttpError(404, "Không tìm thấy khiếu nại");
  assertCanView(user, complaint);
  return complaint;
}

export async function createComplaint(user: AuthUser, input: CreateComplaintInput) {
  if (user.role !== "buyer") throw new HttpError(403, "Chỉ khách hàng được tạo khiếu nại");

  if (input.order_id) {
    const order = await complaintRepo.findOrderOwner(input.order_id);
    if (!order) throw new HttpError(404, "Không tìm thấy đơn hàng");
    if (!input.issued_voucher_id && order.user_id !== user.id && order.recipient_id !== user.id) {
      throw new HttpError(403, "Bạn chỉ được khiếu nại đơn hàng của mình");
    }
    if (!input.issued_voucher_id && await complaintRepo.findOrderLevelComplaint(user.id, input.order_id)) {
      throw new HttpError(409, "Đơn hàng này đã có khiếu nại");
    }
  }

  if (input.issued_voucher_id) {
    const voucher = await issuedVoucherRepo.findIssuedVoucherById(input.issued_voucher_id);
    if (!voucher) throw new HttpError(404, "Không tìm thấy voucher đã mua");
    if (voucher.owner_id !== user.id) throw new HttpError(403, "Bạn chỉ được khiếu nại voucher của mình");
    if (input.order_id && voucher.order_items?.order_id !== input.order_id) {
      throw new HttpError(422, "Voucher không thuộc đơn hàng đã chọn");
    }

    const order = voucher.order_items?.orders;
    const isPaid = order?.status === "confirmed" || order?.status === "completed";
    if (!isPaid && voucher.status !== "used") {
      throw new HttpError(422, "Chỉ được khiếu nại voucher đã thanh toán hoặc đã sử dụng");
    }

    const existing = await complaintRepo.findComplaintByIssuedVoucherId(user.id, input.issued_voucher_id);
    if (existing) throw new HttpError(409, "Voucher này đã có khiếu nại");
  }

  return complaintRepo.createComplaint(user.id, input);
}

export async function updateComplaint(user: AuthUser, id: string, input: UpdateComplaintInput) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new HttpError(404, "Không tìm thấy khiếu nại");

  const isOwner = complaint.user_id === user.id;
  const isAdmin = isAdminRole(user.role);

  if (!isOwner && !isAdmin) throw new HttpError(403, "Bạn không có quyền cập nhật khiếu nại này");
  if (isOwner && !isAdmin) throw new HttpError(403, "Khiếu nại đã gửi không thể chỉnh sửa");

  return complaintRepo.updateComplaint(id, input);
}

export async function closeComplaint(user: AuthUser, id: string) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new HttpError(404, "Không tìm thấy khiếu nại");

  const isOwner = complaint.user_id === user.id;
  const isAdmin = isAdminRole(user.role);
  if (!isOwner && !isAdmin) throw new HttpError(403, "Bạn không có quyền đóng khiếu nại này");

  if (isOwner && !isAdmin && complaint.status !== "open") {
    throw new HttpError(422, "Chỉ được đóng khiếu nại khi đang ở trạng thái open");
  }

  return complaintRepo.updateComplaint(id, { status: "closed" });
}

export async function assignComplaint(user: AuthUser, id: string, input: AssignComplaintInput) {
  if (!isAdminRole(user.role)) throw new HttpError(403, "Chỉ quản trị viên được gán xử lý");

  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new HttpError(404, "Không tìm thấy khiếu nại");

  return complaintRepo.updateComplaint(id, {
    assigned_to: input.assigned_to,
    status: complaint.status === "open" ? "under_review" : complaint.status,
  });
}

export async function resolveComplaint(user: AuthUser, id: string, input: ResolveComplaintInput) {
  if (!isAdminRole(user.role)) throw new HttpError(403, "Chỉ quản trị viên được xử lý khiếu nại");

  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new HttpError(404, "Không tìm thấy khiếu nại");
  if (complaint.status === "resolved" || complaint.status === "closed") {
    throw new HttpError(409, "Khiếu nại đã được xử lý hoặc đóng trước đó");
  }

  return complaintRepo.updateComplaint(id, {
    status: "resolved",
    resolution_note: input.resolution_note,
    resolution_type: input.resolution_type,
    resolved_at: new Date().toISOString(),
  });
}

export async function listComplaintResponses(user: AuthUser, id: string) {
  const complaint = await getComplaintById(user, id);
  return complaintResponseRepo.listResponsesByComplaint(complaint.id);
}

export async function createComplaintResponse(
  user: AuthUser,
  id: string,
  input: CreateComplaintResponseInput,
) {
  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new HttpError(404, "Không tìm thấy khiếu nại");
  assertCanView(user, complaint);

  const responderRole: "admin" | "partner" | "user" = isAdminRole(user.role)
    ? "admin"
    : isPartnerStaff(user.role)
      ? "partner"
      : "user";

  return complaintResponseRepo.createComplaintResponse(complaint.id, user.id, responderRole, input.content);
}
