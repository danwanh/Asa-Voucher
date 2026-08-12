import { HttpError } from "../utils/http-error.js";
import { buildPaginatedResult } from "../utils/pagination.js";
import * as securityAlertRepo from "../repositories/security-alert.repository.js";
import { isAdminRole, type AuthUser } from "../types/auth.types.js";
import type { ListAlertsQuery } from "../validations/security.validation.js";
import { prisma } from "../config/prisma.js";

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
      data: { locked_until: lockedUntil },
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

export async function detectAnomalies() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const failedAttempts = await prisma.authenticationLog.groupBy({
    by: ["user_id"],
    where: {
      action: "LOGIN",
      status: "failed",
      occurred_at: { gte: tenMinutesAgo },
    },
    _count: { id: true },
    having: { id: { _count: { gte: 5 } } },
  });

  const createdAlerts = [];
  for (const row of failedAttempts) {
    if (!row.user_id) continue;
    const existing = await prisma.securityAlert.findFirst({
      where: {
        user_id: row.user_id,
        alert_type: "brute_force",
        status: "open",
        created_at: { gte: tenMinutesAgo },
      },
    });
    if (!existing) {
      const alert = await securityAlertRepo.createSecurityAlert({
        user_id: row.user_id,
        alert_type: "brute_force",
        detail: `${row._count.id} lần đăng nhập thất bại trong 10 phút`,
      });
      createdAlerts.push(alert);
    }
  }

  return { detected: createdAlerts.length, alerts: createdAlerts };
}
