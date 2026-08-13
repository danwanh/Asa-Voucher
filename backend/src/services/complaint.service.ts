import { HttpError } from "../utils/http-error.js";
import { buildPaginatedResult } from "../utils/pagination.js";
import * as complaintRepo from "../repositories/complaint.repository.js";
import * as complaintResponseRepo from "../repositories/complaint-response.repository.js";
import * as issuedVoucherRepo from "../repositories/issued-voucher.repository.js";
import { isAdminRole, isPartnerStaff, type AuthUser, type AppRole } from "../types/auth.types.js";
import type {
  AssignComplaintInput,
  CreateComplaintInput,
  CreateComplaintResponseInput,
  ResolveComplaintInput,
  UpdateComplaintInput,
} from "../validations/complaint.validation.js";
import { prisma } from "../config/prisma.js";
import { refundVnpayPayment, refundPayPalPayment, formatVnpayDate, safeParseJson, extractPaypalCaptureId } from "./payment-provider.service.js";
import { createComplaintNotifications, createAssignmentNotification, createRequestInfoNotification } from "./notification.service.js";

type ComplaintWithRelations = NonNullable<Awaited<ReturnType<typeof complaintRepo.findComplaintById>>>;

function relatedPartnerId(complaint: ComplaintWithRelations): string | undefined {
  return complaint.issued_vouchers?.voucher_products.partner_id;
}

function assertCanView(user: AuthUser, complaint: ComplaintWithRelations) {
  if (isAdminRole(user.role)) return;
  if (complaint.user_id === user.id) return;
  if (isPartnerStaff(user.role) && relatedPartnerId(complaint) === user.partnerId) return;
  throw new HttpError(403, "Bạn không có quyền xem khiếu nại này");
}

export async function listComplaints(user: AuthUser, query: { status?: string; page?: number; limit?: number }) {
  const { status, page = 1, limit = 20 } = query;
  const partnerId = isPartnerStaff(user.role) ? (user.partnerId ?? undefined) : undefined;
  const result = await complaintRepo.listComplaints({
    status: status as any,
    partnerId,
    page,
    limit,
  });
  return { items: result.rows, total: result.total, page, limit };
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
  if (!isAdminRole(user.role) && !isPartnerStaff(user.role)) {
    throw new HttpError(403, "Không có quyền gán xử lý");
  }

  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new HttpError(404, "Không tìm thấy khiếu nại");

  const updated = await complaintRepo.updateComplaint(id, {
    assigned_to: input.assigned_to,
    status: complaint.status === "open" ? "under_review" : complaint.status,
  });

  await createAssignmentNotification(id, input.assigned_to, user.id);

  return updated;
}

export async function resolveComplaint(user: AuthUser, id: string, input: ResolveComplaintInput) {
  if (!isAdminRole(user.role) && !isPartnerStaff(user.role)) {
    throw new HttpError(403, "Không có quyền xử lý khiếu nại");
  }

  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new HttpError(404, "Không tìm thấy khiếu nại");
  if (complaint.status === "resolved" || complaint.status === "closed") {
    throw new HttpError(409, "Khiếu nại đã được xử lý hoặc đóng trước đó");
  }

  const updated = await complaintRepo.updateComplaint(id, {
    status: "resolved",
    resolution_note: input.resolution_note,
    resolution_types: input.resolution_types,
    resolved_at: new Date().toISOString(),
  });

  if (input.resolution_types.includes("refund") && complaint.order_id) {
    await processRefundForComplaint(complaint.order_id, user.id, complaint.id, input.resolution_note);
  }

  const partnerId = complaint.issued_vouchers?.voucher_products?.partner_id ?? null;
  await createComplaintNotifications(
    id,
    complaint.user_id,
    partnerId,
    complaint.assigned_to,
    input.resolution_types,
    input.resolution_note
  );

  return updated;
}

async function processRefundForComplaint(
  orderId: string,
  adminId: string,
  complaintId: string,
  note?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) throw new HttpError(404, "Không tìm thấy đơn hàng để hoàn tiền");

  const successPayment = (order.payments as Array<Record<string, unknown>> ?? []).find(
    (p) => p.status === "success"
  );
  if (!successPayment) throw new HttpError(409, "Đơn hàng chưa thanh toán, không thể hoàn tiền");

  const provider = String(successPayment.method);
  const transactionRef = String(successPayment.transaction_ref || "");

  let refundResult: { refundId: string; gatewayResponse: unknown };

  // Simulated payment → simulate refund
  if (transactionRef.startsWith("SIM-")) {
    refundResult = {
      refundId: `SIM-REFUND-${Date.now()}`,
      gatewayResponse: { provider, mode: "simulated-refund", transactionRef },
    };
  } else if (provider === "paypal" && transactionRef) {
    const gatewayData = safeParseJson(successPayment.gateway_response);
    const realCaptureId = extractPaypalCaptureId(gatewayData) ?? transactionRef;
    refundResult = await refundPayPalPayment({
      captureId: realCaptureId,
      amountVnd: Number(order.total_amount),
      orderCode: String(order.order_code),
      note: note || `Refund for complaint ${complaintId}`,
    });
  } else if (provider === "vnpay" && transactionRef) {
    const gatewayData = safeParseJson(successPayment.gateway_response);
    const transactionNo = String(gatewayData.vnp_TransactionNo || "");
    if (!transactionNo) {
      throw new HttpError(422, "Thiếu vnp_TransactionNo của giao dịch gốc, không thể hoàn tiền", "VNPAY_TRANSACTION_NO_MISSING");
    }
    const transactionDate = successPayment.paid_at
      ? formatVnpayDate(new Date(successPayment.paid_at as string | Date))
      : "";
    refundResult = await refundVnpayPayment({
      transactionRef,
      transactionNo,
      transactionDate,
      amountVnd: Number(order.total_amount),
      orderCode: String(order.order_code),
      createdBy: adminId,
      reason: note || `Refund từ khiếu nại ${complaintId}`,
    });
  } else {
    throw new HttpError(422, `Không hỗ trợ hoàn tiền cho phương thức ${provider}`, "UNSUPPORTED_REFUND_PROVIDER");
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: successPayment.id as string },
      data: {
        status: "refunded",
        refund_ref: refundResult.refundId,
        refunded_at: new Date(),
        gateway_response: JSON.stringify(refundResult.gatewayResponse),
      },
    });

    await tx.paymentLog.create({
      data: {
        payment_id: successPayment.id as string,
        order_id: orderId,
        user_id: adminId,
        action: "REFUND",
        status: "refunded",
        amount: order.total_amount as never,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: "refunded" },
    });

    await tx.orderLog.create({
      data: {
        order_id: orderId,
        user_id: adminId,
        action: "REFUND_ORDER",
        description: `Hoàn tiền từ khiếu nại ${complaintId} (gateway ref: ${refundResult.refundId}): ${note || "Không có ghi chú"}`,
      },
    });

    await tx.adminLog.create({
      data: {
        admin_id: adminId,
        target_order_id: orderId,
        action: "complaint.refund",
        description: `Hoàn tiền từ khiếu nại ${complaintId} (${refundResult.refundId})`,
      },
    });
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
