import { prisma } from "../config/prisma.js";
import nodemailer from "nodemailer";

// ─── In-app Notification (Complaint) ────────────────────────────────────────

type NotificationType = "complaint_resolved" | "complaint_assigned" | "complaint_request_info" | "refund_completed" | "reissue_completed" | "partner_penalized" | "verify" | "verify_failed";

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

export async function listNotifications(userId: string, opts: { page: number; limit: number }) {
  const skip = (opts.page - 1) * opts.limit;

  const [rows, total, unread_count] = await Promise.all([
    prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      skip,
      take: opts.limit,
    }),
    prisma.notification.count({ where: { user_id: userId } }),
    prisma.notification.count({ where: { user_id: userId, is_read: false } }),
  ]);

  return { rows, total, unread_count };
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, user_id: userId },
    data: { is_read: true },
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

// ─── Email Notification (Voucher Approval) ──────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[Notification] SMTP not configured, skipping email");
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export async function notifyVoucherApproved(params: {
  partnerEmail: string;
  partnerName: string;
  voucherName: string;
}): Promise<void> {
  const { partnerEmail, partnerName, voucherName } = params;

  await sendEmail({
    to: partnerEmail,
    subject: `[Asa-Voucher] Voucher "${voucherName}" đã được duyệt`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #81B29A;">Voucher đã được duyệt</h2>
        <p>Xin chào <strong>${partnerName}</strong>,</p>
        <p>Voucher <strong>"${voucherName}"</strong> của bạn đã được <span style="color: #81B29A; font-weight: bold;">DUYỆT</span> bởi quản trị viên.</p>
        <p>Voucher hiện đã có thể hiển thị và bán trên hệ thống.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px;">Email này được gửi tự động từ hệ thống Asa-Voucher.</p>
      </div>
    `,
  });
}

export async function notifyVoucherRejected(params: {
  partnerEmail: string;
  partnerName: string;
  voucherName: string;
  rejectReason: string;
}): Promise<void> {
  const { partnerEmail, partnerName, voucherName, rejectReason } = params;

  await sendEmail({
    to: partnerEmail,
    subject: `[Asa-Voucher] Voucher "${voucherName}" đã bị từ chối`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E07A5F;">Voucher đã bị từ chối</h2>
        <p>Xin chào <strong>${partnerName}</strong>,</p>
        <p>Voucher <strong>"${voucherName}"</strong> của bạn đã bị <span style="color: #E07A5F; font-weight: bold;">TỪ CHỐI</span> bởi quản trị viên.</p>
        <div style="background: #FFF3F0; border-left: 4px solid #E07A5F; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <strong>Lý do từ chối:</strong><br />
          ${rejectReason}
        </div>
        <p>Voucher này đã bị từ chối và không thể chỉnh sửa hoặc gửi duyệt lại.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px;">Email này được gửi tự động từ hệ thống Asa-Voucher.</p>
      </div>
    `,
  });
}
