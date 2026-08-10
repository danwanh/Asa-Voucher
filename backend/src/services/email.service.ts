import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

function getTransporter() {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    throw new HttpError(503, "Email service is not configured", "EMAIL_SERVICE_NOT_CONFIGURED");
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  await getTransporter().sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

export function buildVerificationEmail(token: string) {
  const url = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    subject: "Xác thực tài khoản Asa Voucher",
    html: `<p>Vui lòng nhấp vào liên kết để xác thực tài khoản:</p><p><a href="${url}">${url}</a></p><p>Liên kết có hiệu lực trong ${env.AUTH_TOKEN_EXPIRES_IN_MINUTES} phút.</p>`
  };
}

export function buildResetPasswordEmail(token: string) {
  const url = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    subject: "Đặt lại mật khẩu Asa Voucher",
    html: `<p>Vui lòng nhấp vào liên kết để đặt lại mật khẩu:</p><p><a href="${url}">${url}</a></p><p>Liên kết có hiệu lực trong ${env.AUTH_TOKEN_EXPIRES_IN_MINUTES} phút.</p>`
  };
}
