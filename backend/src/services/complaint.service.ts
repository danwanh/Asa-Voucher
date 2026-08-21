import crypto from "node:crypto";
import { HttpError } from "../utils/http-error.js";
import * as complaintRepo from "../repositories/complaint.repository.js";
import * as complaintResponseRepo from "../repositories/complaint-response.repository.js";
import * as issuedVoucherRepo from "../repositories/issued-voucher.repository.js";
import { isAdminRole, isPartnerStaff, type AuthUser } from "../types/auth.types.js";
import type { ComplaintStatus } from "../types/complaint.types.js";
import type {
  AssignComplaintInput,
  CreateComplaintInput,
  CreateComplaintResponseInput,
  ResolveComplaintInput,
  UpdateComplaintInput,
} from "../validations/complaint.validation.js";
import { prisma } from "../config/prisma.js";
import { refundVnpayPayment, refundPayPalPayment, formatVnpayDate, safeParseJson, extractPaypalCaptureId } from "./payment-provider.service.js";
import { generateVoucherCode } from "../utils/code.util.js";

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

export async function listComplaints(user: AuthUser, query: { status?: string; order_id?: string; page?: number; limit?: number }) {
  const { status, order_id: orderId, page = 1, limit = 20 } = query;
  const partnerId = isPartnerStaff(user.role) ? (user.partnerId ?? undefined) : undefined;
  const result = await complaintRepo.listComplaints({
    status: status as ComplaintStatus | undefined,
    userId: user.role === "buyer" ? user.id : undefined,
    partnerId,
    orderId,
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
    if (!input.issued_voucher_id && order.user_id !== user.id) {
      throw new HttpError(403, "Bạn chỉ được khiếu nại đơn hàng của mình");
    }
    if (!input.issued_voucher_id && order.status !== "confirmed" && order.status !== "completed") {
      throw new HttpError(422, "Chỉ được khiếu nại đơn hàng đã thanh toán hoặc hoàn tất");
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

  if (complaint.status === "resolved") {
    throw new HttpError(422, "Khiếu nại đã được xử lý trước đó");
  }

  return complaintRepo.updateComplaint(id, { status: "resolved" });
}

export async function assignComplaint(user: AuthUser, id: string, input: AssignComplaintInput) {
  if (!isAdminRole(user.role) && !isPartnerStaff(user.role)) {
    throw new HttpError(403, "Không có quyền gán xử lý");
  }

  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new HttpError(404, "Không tìm thấy khiếu nại");

  const updated = await complaintRepo.updateComplaint(id, {
    assigned_to: input.assigned_to,
  });

  return updated;
}

export async function resolveComplaint(user: AuthUser, id: string, input: ResolveComplaintInput) {
  if (!isAdminRole(user.role) && !isPartnerStaff(user.role)) {
    throw new HttpError(403, "Không có quyền xử lý khiếu nại");
  }

  const complaint = await complaintRepo.findComplaintById(id);
  if (!complaint) throw new HttpError(404, "Không tìm thấy khiếu nại");
  if (complaint.status === "resolved") {
    throw new HttpError(409, "Khiếu nại đã được xử lý trước đó");
  }

  const issuedVoucherId = complaint.issued_voucher_id;

  if (input.resolution_types.includes("refund") && complaint.order_id && issuedVoucherId) {
    await processRefundVoucher(complaint.order_id, user.id, complaint.id, issuedVoucherId, input.resolution_note);
  }

  if (input.resolution_types.includes("reissue") && issuedVoucherId) {
    await processReissueVoucher(user.id, complaint.id, issuedVoucherId, input.resolution_note);
  }

  const updated = await complaintRepo.updateComplaint(id, {
    status: "resolved",
    resolution_note: input.resolution_note,
    resolution_types: input.resolution_types,
    resolved_at: new Date().toISOString(),
  });

  return updated;
}

async function processRefundVoucher(
  orderId: string,
  adminId: string,
  complaintId: string,
  issuedVoucherId: string,
  note?: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true, order_items: { include: { issued_vouchers: true, voucher_products: true } } },
  });
  if (!order) throw new HttpError(404, "Không tìm thấy đơn hàng để hoàn tiền");

  const payments = (order.payments as Array<Record<string, unknown>>) ?? [];
  const successPayment = payments.find((p) => p.status === "success");
  if (!successPayment) throw new HttpError(409, "Đơn hàng chưa thanh toán, không thể hoàn tiền");

  const targetVoucher = order.order_items
    .flatMap((item) => item.issued_vouchers)
    .find((v) => v.id === issuedVoucherId);
  if (!targetVoucher) throw new HttpError(404, "Không tìm thấy voucher trong đơn hàng");
  if (targetVoucher.status === "refunded") return;

  const targetItem = order.order_items.find((item) =>
    item.issued_vouchers.some((v) => v.id === issuedVoucherId),
  );
  if (!targetItem) throw new HttpError(404, "Không tìm thấy order item chứa voucher");
  const refundAmount = Number(targetItem.unit_price);

  const provider = String(successPayment.method);
  const transactionRef = String(successPayment.transaction_ref || "");

  let refundResult: { refundId: string; gatewayResponse: unknown };

  if (transactionRef.startsWith("SIM-")) {
    refundResult = {
      refundId: `SIM-REFUND-${Date.now()}`,
      gatewayResponse: { provider, mode: "simulated-refund", transactionRef, amount: refundAmount },
    };
  } else if (provider === "paypal" && transactionRef) {
    const rawGatewayData = safeParseJson(successPayment.gateway_response);
    const gatewayData = rawGatewayData.provider_response && typeof rawGatewayData.provider_response === "object"
      ? rawGatewayData.provider_response as Record<string, unknown>
      : rawGatewayData;
    const realCaptureId = extractPaypalCaptureId(gatewayData) ?? transactionRef;
    refundResult = await refundPayPalPayment({
      captureId: realCaptureId,
      amountVnd: refundAmount,
      orderCode: String(order.order_code),
      note: note || `Refund voucher from complaint ${complaintId}`,
    });
  } else if (provider === "vnpay" && transactionRef) {
    const rawGatewayData = safeParseJson(successPayment.gateway_response);
    const gatewayData = rawGatewayData.provider_response && typeof rawGatewayData.provider_response === "object"
      ? rawGatewayData.provider_response as Record<string, unknown>
      : rawGatewayData;
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
      amountVnd: refundAmount,
      orderCode: String(order.order_code),
      createdBy: adminId,
      reason: note || `Refund voucher từ khiếu nại ${complaintId}`,
    });
  } else {
    throw new HttpError(422, `Không hỗ trợ hoàn tiền cho phương thức ${provider}`, "UNSUPPORTED_REFUND_PROVIDER");
  }

  const allVouchers = order.order_items.flatMap((item) => item.issued_vouchers);

  await prisma.$transaction(async (tx) => {
    await tx.issuedVoucher.update({
      where: { id: issuedVoucherId },
      data: { status: "refunded", updated_at: new Date() },
    });

    await tx.voucherProduct.update({
      where: { id: targetItem.voucher_product_id },
      data: { remaining_quantity: { increment: 1 } },
    });

    await tx.payment.update({
      where: { id: successPayment.id as string },
      data: {
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
        amount: refundAmount as never,
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { refund_amount: { increment: refundAmount }, updated_at: new Date() },
    });

    const updatedAllVouchers = allVouchers.map((v) =>
      v.id === issuedVoucherId ? { ...v, status: "refunded" as const } : v,
    );
    const allRefunded = updatedAllVouchers.every(
      (v) => v.status === "refunded" || v.status === "cancelled",
    );

    if (allRefunded) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "refunded", payment_status: "refunded", updated_at: new Date() },
      });
      await tx.payment.update({
        where: { id: successPayment.id as string },
        data: { status: "refunded" },
      });
    }

    await tx.orderLog.create({
      data: {
        order_id: orderId,
        user_id: adminId,
        action: "REFUND_VOUCHER",
        description: `Hoàn tiền voucher ${targetVoucher.voucher_code} từ khiếu nại ${complaintId} (gateway ref: ${refundResult.refundId}, amount: ${refundAmount}): ${note || "Không có ghi chú"}`,
      },
    });

    await tx.adminLog.create({
      data: {
        admin_id: adminId,
        target_order_id: orderId,
        action: "complaint.refund_voucher",
        description: `Hoàn tiền voucher ${targetVoucher.voucher_code} từ khiếu nại ${complaintId} (${refundResult.refundId}, ${refundAmount}đ)`,
      },
    });
  });
}

async function processReissueVoucher(
  adminId: string,
  complaintId: string,
  issuedVoucherId: string,
  note?: string,
) {
  const oldVoucher = await prisma.issuedVoucher.findUnique({
    where: { id: issuedVoucherId },
    include: {
      voucher_products: { select: { id: true, validity_days: true } },
      order_items: { select: { order_id: true } },
    },
  });
  if (!oldVoucher) throw new HttpError(404, "Không tìm thấy voucher cần cấp lại");

  const validityDays = oldVoucher.voucher_products.validity_days;
  const newExpiredDate = new Date(Date.now() + validityDays * 86400000);
  const newCode = generateVoucherCode();
  const newQrPayload = crypto.randomUUID();

  const isActive = oldVoucher.status === "active";
  const orderId = oldVoucher.order_items?.order_id ?? "";

  await prisma.$transaction(async (tx) => {
    if (isActive) {
      await tx.issuedVoucher.update({
        where: { id: issuedVoucherId },
        data: { status: "cancelled", updated_at: new Date() },
      });
      await tx.voucherProduct.update({
        where: { id: oldVoucher.voucher_product_id },
        data: { remaining_quantity: { increment: 1 } },
      });
    }

    await tx.issuedVoucher.create({
      data: {
        voucher_code: newCode,
        qr_code_payload: newQrPayload,
        voucher_product_id: oldVoucher.voucher_product_id,
        owner_id: oldVoucher.owner_id,
        issued_date: new Date(),
        expired_date: newExpiredDate,
        status: "active",
      },
    });

    if (!isActive) {
      await tx.voucherProduct.update({
        where: { id: oldVoucher.voucher_product_id },
        data: { remaining_quantity: { decrement: 1 } },
      });
    }

    if (orderId) {
      await tx.orderLog.create({
        data: {
          order_id: orderId,
          user_id: adminId,
          action: "REISSUE_VOUCHER",
          description: `Cấp lại voucher ${oldVoucher.voucher_code} → ${newCode} từ khiếu nại ${complaintId}. Voucher cũ status: ${oldVoucher.status}: ${note || "Không có ghi chú"}`,
        },
      });

      await tx.adminLog.create({
        data: {
          admin_id: adminId,
          target_order_id: orderId,
          action: "complaint.reissue_voucher",
          description: `Cấp lại voucher ${oldVoucher.voucher_code} → ${newCode} từ khiếu nại ${complaintId} (voucher cũ: ${oldVoucher.status})`,
        },
      });
    }
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
