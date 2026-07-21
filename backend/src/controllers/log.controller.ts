import type { Request, Response } from "express";
import { sendSuccess } from "../utils/response.js";
import { HttpError } from "../utils/http-error.js";
import * as logService from "../services/log.service.js";
import {
  adminLogQuerySchema,
  authenticationLogQuerySchema,
  orderLogQuerySchema,
  paymentLogQuerySchema,
} from "../validations/log.validation.js";

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}

export async function listAuthenticationLogs(req: Request, res: Response) {
  const query = authenticationLogQuerySchema.parse(req.query);
  const result = await logService.listAuthenticationLogs(requireUser(req), query);
  sendSuccess(res, result);
}

export async function getAuthenticationLog(req: Request, res: Response) {
  const log = await logService.getAuthenticationLog(requireUser(req), req.params.id);
  sendSuccess(res, log);
}

export async function listAdminLogs(req: Request, res: Response) {
  const query = adminLogQuerySchema.parse(req.query);
  const result = await logService.listAdminLogs(requireUser(req), query);
  sendSuccess(res, result);
}

export async function getAdminLog(req: Request, res: Response) {
  const log = await logService.getAdminLog(requireUser(req), req.params.id);
  sendSuccess(res, log);
}

export async function listOrderLogs(req: Request, res: Response) {
  const query = orderLogQuerySchema.parse(req.query);
  const result = await logService.listOrderLogs(requireUser(req), query);
  sendSuccess(res, result);
}

export async function getOrderLog(req: Request, res: Response) {
  const log = await logService.getOrderLog(requireUser(req), req.params.id);
  sendSuccess(res, log);
}

export async function listPaymentLogs(req: Request, res: Response) {
  const query = paymentLogQuerySchema.parse(req.query);
  const result = await logService.listPaymentLogs(requireUser(req), query);
  sendSuccess(res, result);
}

export async function getPaymentLog(req: Request, res: Response) {
  const log = await logService.getPaymentLog(requireUser(req), req.params.id);
  sendSuccess(res, log);
}
