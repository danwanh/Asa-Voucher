import type { Request, Response } from "express";
import { sendSuccess } from "../utils/response.js";
import { HttpError } from "../utils/http-error.js";
import * as securityAlertService from "../services/security-alert.service.js";
import { listAlertsQuerySchema, idParamSchema } from "../validations/security.validation.js";

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}

export async function listAlerts(req: Request, res: Response) {
  const query = listAlertsQuerySchema.parse(req.query);
  const result = await securityAlertService.listAlerts(requireUser(req), query);
  sendSuccess(res, result);
}

export async function getAlert(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const alert = await securityAlertService.getAlertById(requireUser(req), id);
  sendSuccess(res, alert);
}

export async function reviewAlert(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const alert = await securityAlertService.reviewAlert(requireUser(req), id);
  sendSuccess(res, alert, "Đã đánh dấu cảnh báo là đã xem");
}

export async function lockAccount(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const alert = await securityAlertService.lockAccount(requireUser(req), id);
  sendSuccess(res, alert, "Đã khóa tài khoản thành công");
}

export async function unlockAccount(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const alert = await securityAlertService.unlockAccount(requireUser(req), id);
  sendSuccess(res, alert, "Đã mở khóa tài khoản thành công");
}

export async function detectAnomalies(req: Request, res: Response) {
  const result = await securityAlertService.detectAnomalies();
  sendSuccess(res, result, "Phát hiện hoàn tất");
}
