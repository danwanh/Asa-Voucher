import { HttpError } from "../utils/http-error.js";
import { buildPaginatedResult } from "../utils/pagination.js";
import * as logRepo from "../repositories/log.repository.js";
import type { AuthUser } from "../types/auth.types.js";
import type {
  AdminLogQuery,
  AuthenticationLogQuery,
  OrderLogQuery,
  PaymentLogQuery,
} from "../validations/log.validation.js";

function assertAdminSecurity(user: AuthUser) {
  if (user.role !== "admin_security") {
    throw new HttpError(403, "Chỉ admin_security được xem nhật ký hệ thống");
  }
}

export async function listAuthenticationLogs(user: AuthUser, query: AuthenticationLogQuery) {
  assertAdminSecurity(user);
  const { rows, total } = await logRepo.listAuthenticationLogs(query);
  return buildPaginatedResult(rows, total, query);
}

export async function getAuthenticationLog(user: AuthUser, id: string) {
  assertAdminSecurity(user);
  const log = await logRepo.findAuthenticationLogById(id);
  if (!log) throw new HttpError(404, "Không tìm thấy log xác thực");
  return log;
}

export async function listAdminLogs(user: AuthUser, query: AdminLogQuery) {
  assertAdminSecurity(user);
  const { rows, total } = await logRepo.listAdminLogs(query);
  return buildPaginatedResult(rows, total, query);
}

export async function getAdminLog(user: AuthUser, id: string) {
  assertAdminSecurity(user);
  const log = await logRepo.findAdminLogById(id);
  if (!log) throw new HttpError(404, "Không tìm thấy log quản trị");
  return log;
}

export async function listOrderLogs(user: AuthUser, query: OrderLogQuery) {
  assertAdminSecurity(user);
  const { rows, total } = await logRepo.listOrderLogs(query);
  return buildPaginatedResult(rows, total, query);
}

export async function getOrderLog(user: AuthUser, id: string) {
  assertAdminSecurity(user);
  const log = await logRepo.findOrderLogById(id);
  if (!log) throw new HttpError(404, "Không tìm thấy log đơn hàng");
  return log;
}

export async function listPaymentLogs(user: AuthUser, query: PaymentLogQuery) {
  assertAdminSecurity(user);
  const { rows, total } = await logRepo.listPaymentLogs(query);
  return buildPaginatedResult(rows, total, query);
}

export async function getPaymentLog(user: AuthUser, id: string) {
  assertAdminSecurity(user);
  const log = await logRepo.findPaymentLogById(id);
  if (!log) throw new HttpError(404, "Không tìm thấy log thanh toán");
  return log;
}
