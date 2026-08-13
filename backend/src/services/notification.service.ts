import nodemailer from "nodemailer";

/**
 * FC-ADC-APPROVE: Notification Service
 * Gửi email thông báo cho partner khi voucher được duyệt/từ chối
 * Dùng Gmail SMTP (App Password)
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
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
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

// --- Voucher Approval Notifications ---

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
        <p>Vui lòng chỉnh sửa voucher và gửi lại để duyệt.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px;">Email này được gửi tự động từ hệ thống Asa-Voucher.</p>
      </div>
    `,
  });
}
