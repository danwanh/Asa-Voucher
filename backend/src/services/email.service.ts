import nodemailer from "nodemailer";
import { isIP } from "node:net";
import { resolve4 } from "node:dns/promises";
import { Resend } from "resend";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

function requireSmtpAuth() {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    throw new HttpError(503, "Email service is not configured", "EMAIL_SERVICE_NOT_CONFIGURED");
  }

  return { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s+/g, "") };
}

async function getTransporter() {
  const auth = requireSmtpAuth();
  const host = isIP(env.SMTP_HOST) ? env.SMTP_HOST : (await resolve4(env.SMTP_HOST))[0];
  if (!host) throw new Error(`No IPv4 address found for ${env.SMTP_HOST}`);

  return nodemailer.createTransport({
    host,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT === 587,
    auth,
    tls: { servername: env.SMTP_HOST },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000
  });
}

async function sendWithResend(to: string, subject: string, html: string) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: [to],
    subject,
    html
  });

  if (error) throw new Error(error.message);

  console.log(JSON.stringify({
    event: "email.sent",
    provider: "resend",
    to,
    messageId: data?.id
  }));
}

async function sendWithSendGrid(to: string, subject: string, html: string) {
  if (!env.SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY is not configured");

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: env.EMAIL_FROM.match(/<([^>]+)>/)?.[1]?.trim() ?? env.EMAIL_FROM.trim(), name: "Asa Voucher" },
      subject,
      content: [{ type: "text/html", value: html }]
    }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`SendGrid ${response.status}: ${details || response.statusText}`);
  }

  console.log(JSON.stringify({
    event: "email.sent",
    provider: "sendgrid",
    to,
    statusCode: response.status
  }));
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
  try {
    if (env.EMAIL_PROVIDER === "sendgrid") {
      await sendWithSendGrid(to, subject, html);
      return;
    }

    if (env.EMAIL_PROVIDER === "resend") {
      await sendWithResend(to, subject, html);
      return;
    }

    const smtpUser = requireSmtpAuth().user;
    const result = await (await getTransporter()).sendMail({
      from: mailFrom(),
      to,
      subject,
      html,
      envelope: { from: smtpUser, to }
    });
    console.log(JSON.stringify({
      event: "email.sent",
      provider: "smtp",
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
