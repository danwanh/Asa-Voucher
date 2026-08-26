import { HttpError } from "../utils/http-error.js";
import { buildPaginatedResult } from "../utils/pagination.js";
import * as securityAlertRepo from "../repositories/security-alert.repository.js";
import { isAdminRole, type AuthUser } from "../types/auth.types.js";
import type { ListAlertsQuery } from "../validations/security.validation.js";
import { prisma } from "../config/prisma.js";

const SCAN_WINDOW_MS = 10 * 60 * 1000;
const VN_TIMEZONE = "Asia/Ho_Chi_Minh";
const QUIET_HOUR_START = 23; 
const QUIET_HOUR_END = 6;
const MULTIPLE_DEVICE_THRESHOLD = 3;

function assertAdminSecurity(user: AuthUser) {
  if (user.role !== "admin_security") {
    throw new HttpError(403, "Chỉ admin_security được truy cập tính năng này");
  }
}

export async function listAlerts(user: AuthUser, query: ListAlertsQuery) {
  assertAdminSecurity(user);
  const { rows, total } = await securityAlertRepo.listSecurityAlerts(query);
  return buildPaginatedResult(rows, total, query);
}

export async function getAlertById(user: AuthUser, id: string) {
  assertAdminSecurity(user);
  const alert = await securityAlertRepo.findSecurityAlertById(id);
  if (!alert) throw new HttpError(404, "Không tìm thấy cảnh báo bảo mật");
  return alert;
}

export async function reviewAlert(user: AuthUser, id: string) {
  assertAdminSecurity(user);
  const alert = await securityAlertRepo.findSecurityAlertById(id);
  if (!alert) throw new HttpError(404, "Không tìm thấy cảnh báo bảo mật");
  if (alert.status === "reviewed" || alert.status === "locked") {
    throw new HttpError(409, "Cảnh báo đã được xử lý trước đó");
  }

  return securityAlertRepo.updateSecurityAlert(id, {
    status: "reviewed",
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  });
}

export async function lockAccount(user: AuthUser, id: string) {
  assertAdminSecurity(user);
  const alert = await securityAlertRepo.findSecurityAlertById(id);
  if (!alert) throw new HttpError(404, "Không tìm thấy cảnh báo bảo mật");
  if (alert.status === "locked") {
    throw new HttpError(409, "Tài khoản đã bị khóa trước đó");
  }

  const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: alert.user_id },
      data: { locked_until: lockedUntil, auth_version: { increment: 1 },},
    });

    await tx.securityAlert.update({
      where: { id },
      data: {
        status: "locked",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      },
    });

    await tx.adminLog.create({
      data: {
        admin_id: user.id,
        target_user_id: alert.user_id,
        action: "security.lock_account",
        description: `Khóa tài khoản do cảnh báo ${alert.alert_type}: ${alert.detail || "Không có chi tiết"}`,
      },
    });
  });

  return securityAlertRepo.findSecurityAlertById(id);
}

export async function unlockAccount(user: AuthUser, id: string) {
  assertAdminSecurity(user);
  const alert = await securityAlertRepo.findSecurityAlertById(id);
  if (!alert) throw new HttpError(404, "Không tìm thấy cảnh báo bảo mật");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: alert.user_id },
      data: { locked_until: null, failed_login_attempts: 0 },
    });

    await tx.securityAlert.update({
      where: { id },
      data: {
        status: "reviewed",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      },
    });

    await tx.adminLog.create({
      data: {
        admin_id: user.id,
        target_user_id: alert.user_id,
        action: "security.unlock_account",
        description: `Mở khóa tài khoản từ cảnh báo ${alert.id}`,
      },
    });
  });

  return securityAlertRepo.findSecurityAlertById(id);
}

async function hasOpenAlert(userId: string, alertType: string, since: Date) {
  const existing = await prisma.securityAlert.findFirst({
    where: {
      user_id: userId,
      alert_type: alertType,
      status: "open",
      created_at: { gte: since },
    },
  });
  return !!existing;
}

function isSuspiciousHourVN(occurredAt: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: VN_TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(occurredAt),
  );

  return hour >= QUIET_HOUR_START || hour < QUIET_HOUR_END;
}

async function detectBruteForce(windowStart: Date) {
  const failedAttempts = await prisma.authenticationLog.groupBy({
    by: ["user_id"],
    where: {
      action: "LOGIN",
      status: "failed",
      occurred_at: { gte: windowStart },
    },
    _count: { id: true },
    having: { id: { _count: { gte: 5 } } },
  });

  const createdAlerts = [];
  for (const row of failedAttempts) {
    if (!row.user_id) continue;
    if (await hasOpenAlert(row.user_id, "brute_force", windowStart)) continue;

    const alert = await securityAlertRepo.createSecurityAlert({
      user_id: row.user_id,
      alert_type: "brute_force",
      detail: `${row._count.id} lần đăng nhập thất bại trong 10 phút`,
    });
    createdAlerts.push(alert);
  }
  return createdAlerts;
}

async function detectUnusualIp(windowStart: Date) {
  const recentLogins = await prisma.authenticationLog.findMany({
    where: {
      action: "LOGIN",
      status: "success",
      occurred_at: { gte: windowStart },
      ip_address: { not: null },
    },
  });

  const createdAlerts = [];
  for (const login of recentLogins) {
    if (!login.user_id || !login.ip_address) continue;

    const priorSameIp = await prisma.authenticationLog.findFirst({
      where: {
        user_id: login.user_id,
        action: "LOGIN",
        status: "success",
        ip_address: login.ip_address,
        occurred_at: { lt: login.occurred_at },
      },
    });
    if (priorSameIp) continue;

    const anyPriorLogin = await prisma.authenticationLog.findFirst({
      where: {
        user_id: login.user_id,
        action: "LOGIN",
        status: "success",
        occurred_at: { lt: login.occurred_at },
      },
    });
    if (!anyPriorLogin) continue;

    if (await hasOpenAlert(login.user_id, "unusual_ip", windowStart)) continue;

    const alert = await securityAlertRepo.createSecurityAlert({
      user_id: login.user_id,
      alert_type: "unusual_ip",
      detail: `Đăng nhập từ IP chưa từng dùng trước đó: ${login.ip_address}`,
      ip_address: login.ip_address,
    });
    createdAlerts.push(alert);
  }
  return createdAlerts;
}

async function detectMultipleDevice() {
  const now = new Date();
  const activeSessions = await prisma.refreshToken.groupBy({
    by: ["user_id"],
    where: {
      revoked_at: null,
      expires_at: { gt: now },
    },
    _count: { id: true },
    having: { id: { _count: { gte: MULTIPLE_DEVICE_THRESHOLD } } },
  });

  const createdAlerts = [];
  for (const row of activeSessions) {
    if (!row.user_id) continue;
    const existing = await prisma.securityAlert.findFirst({
      where: { user_id: row.user_id, alert_type: "multiple_device", status: "open" },
    });
    if (existing) continue;

    const alert = await securityAlertRepo.createSecurityAlert({
      user_id: row.user_id,
      alert_type: "multiple_device",
      detail: `${row._count.id} phiên đăng nhập đang hoạt động cùng lúc`,
    });
    createdAlerts.push(alert);
  }
  return createdAlerts;
}

async function detectSuspiciousTime(windowStart: Date) {
  const recentLogins = await prisma.authenticationLog.findMany({
    where: {
      action: "LOGIN",
      status: "success",
      occurred_at: { gte: windowStart },
    },
  });

  const createdAlerts = [];
  for (const login of recentLogins) {
    if (!login.user_id) continue;
    if (!isSuspiciousHourVN(login.occurred_at)) continue;
    if (await hasOpenAlert(login.user_id, "suspicious_time", windowStart)) continue;

    const timeLabel = login.occurred_at.toLocaleString("vi-VN", { timeZone: VN_TIMEZONE });
    const alert = await securityAlertRepo.createSecurityAlert({
      user_id: login.user_id,
      alert_type: "suspicious_time",
      detail: `Đăng nhập lúc ${timeLabel} (ngoài khung giờ ${QUIET_HOUR_END}h-${QUIET_HOUR_START}h)`,
      ip_address: login.ip_address ?? undefined,
    });
    createdAlerts.push(alert);
  }
  return createdAlerts;
}

export async function detectAnomalies() {
  const windowStart = new Date(Date.now() - SCAN_WINDOW_MS);

  const [bruteForce, unusualIp, multipleDevice, suspiciousTime] = await Promise.all([
    detectBruteForce(windowStart),
    detectUnusualIp(windowStart),
    detectMultipleDevice(),
    detectSuspiciousTime(windowStart),
  ]);

  const allAlerts = [...bruteForce, ...unusualIp, ...multipleDevice, ...suspiciousTime];
  return { detected: allAlerts.length, alerts: allAlerts };
}