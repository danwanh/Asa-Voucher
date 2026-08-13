import { prisma } from "../config/prisma.js";

type NotificationType = "complaint_resolved" | "complaint_assigned" | "complaint_request_info" | "refund_completed" | "reissue_completed" | "partner_penalized";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  content?: string;
  refType?: string;
  refId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      user_id: input.userId,
      type: input.type,
      title: input.title,
      content: input.content ?? null,
      ref_type: input.refType ?? null,
      ref_id: input.refId ?? null,
    },
  });
}

export async function createComplaintNotifications(
  complaintId: string,
  customerId: string,
  partnerId: string | null,
  assignedTo: string | null,
  resolutionTypes: string[],
  resolutionNote: string
) {
  const notifications: CreateNotificationInput[] = [];

  for (const type of resolutionTypes) {
    if (type === "refund") {
      notifications.push({
        userId: customerId,
        type: "refund_completed",
        title: "Hoàn tiền khiếu nại thành công",
        content: `Khiếu nại ${complaintId.slice(0, 8)}... đã được xử lý. Hoàn tiền đã được thực hiện.`,
        refType: "complaint",
        refId: complaintId,
      });
    }
    if (type === "reissue") {
      notifications.push({
        userId: customerId,
        type: "reissue_completed",
        title: "Cấp lại voucher thành công",
        content: `Khiếu nại ${complaintId.slice(0, 8)}... đã được xử lý. Voucher mới đã được cấp.`,
        refType: "complaint",
        refId: complaintId,
      });
    }
    if (type === "partner_penalized" && partnerId) {
      const partner = await prisma.partner.findUnique({ where: { id: partnerId }, select: { representative_user_id: true } });
      if (partner) {
        notifications.push({
          userId: partner.representative_user_id,
          type: "partner_penalized",
          title: "Thông báo phạt đối tác",
          content: `Đối tác đã bị phạt do khiếu nại ${complaintId.slice(0, 8)}...: ${resolutionNote}`,
          refType: "complaint",
          refId: complaintId,
        });
      }
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({
      data: notifications.map((n) => ({
        user_id: n.userId,
        type: n.type,
        title: n.title,
        content: n.content ?? null,
        ref_type: n.refType ?? null,
        ref_id: n.refId ?? null,
      })),
    });
  }
}

export async function createAssignmentNotification(
  complaintId: string,
  assignedTo: string,
  assignedBy: string
) {
  await createNotification({
    userId: assignedTo,
    type: "complaint_assigned",
    title: "Khiếu nại được chuyển xử lý",
    content: `Khiếu nại ${complaintId.slice(0, 8)}... đã được chuyển cho bạn xử lý.`,
    refType: "complaint",
    refId: complaintId,
  });
}

export async function createRequestInfoNotification(
  complaintId: string,
  customerId: string,
  note: string
) {
  await createNotification({
    userId: customerId,
    type: "complaint_request_info",
    title: "Yêu cầu bổ sung thông tin",
    content: `Khiếu nại ${complaintId.slice(0, 8)}... cần bổ sung thông tin: ${note}`,
    refType: "complaint",
    refId: complaintId,
  });
}
