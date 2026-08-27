import nodemailer from "nodemailer";
import { setDefaultResultOrder } from "node:dns";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

setDefaultResultOrder("ipv4first");

function requireSmtpAuth() {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    throw new HttpError(503, "Email service is not configured", "EMAIL_SERVICE_NOT_CONFIGURED");
  }

  return { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s+/g, "") };
}

function getTransporter() {
  const auth = requireSmtpAuth();

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT === 587,
    auth,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000
  });
}

function mailFrom() {
  const smtpUser = env.SMTP_USER;
  if (!smtpUser) return env.EMAIL_FROM;

  const configuredAddress = env.EMAIL_FROM.match(/<([^>]+)>/)?.[1]?.trim() ?? env.EMAIL_FROM.trim();
  if (configuredAddress.toLowerCase() === smtpUser.toLowerCase()) {
    return env.EMAIL_FROM;
  }

  const displayName = env.EMAIL_FROM.match(/^(.*?)\s*</)?.[1]?.trim() || "Asa Voucher";
  return `${displayName} <${smtpUser}>`;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const smtpUser = requireSmtpAuth().user;

  try {
    const result = await getTransporter().sendMail({
      from: mailFrom(),
      to,
      subject,
      html,
      envelope: { from: smtpUser, to }
    });
    console.log(JSON.stringify({
      event: "email.sent",
      to,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response
    }));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.error(JSON.stringify({
      event: "email.send_failed",
      to,
      message: error instanceof Error ? error.message : "Unknown email error"
    }));
    throw new HttpError(503, "Không gửi được email. Vui lòng thử lại sau.", "EMAIL_SEND_FAILED");
  }
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
