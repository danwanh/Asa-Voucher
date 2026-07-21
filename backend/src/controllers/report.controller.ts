import type { Request, Response } from "express";
import { sendSuccess } from "../utils/response.js";
import { HttpError } from "../utils/http-error.js";
import * as reportService from "../services/report.service.js";
import { reportQuerySchema } from "../validations/report.validation.js";

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}

export async function getRevenueReport(req: Request, res: Response) {
  const query = reportQuerySchema.parse(req.query);
  const result = await reportService.getRevenueReport(requireUser(req), query);
  sendSuccess(res, result);
}

export async function getOrderReport(req: Request, res: Response) {
  const query = reportQuerySchema.parse(req.query);
  const result = await reportService.getOrderReport(requireUser(req), query);
  sendSuccess(res, result);
}

export async function getVoucherReport(req: Request, res: Response) {
  const query = reportQuerySchema.parse(req.query);
  const result = await reportService.getVoucherReport(requireUser(req), query);
  sendSuccess(res, result);
}

export async function getPartnerReport(req: Request, res: Response) {
  const query = reportQuerySchema.parse(req.query);
  const result = await reportService.getPartnerReport(requireUser(req), query);
  sendSuccess(res, result);
}
