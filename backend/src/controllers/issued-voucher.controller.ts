import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../utils/response.js";
import { HttpError } from "../utils/http-error.js";
import * as issuedVoucherService from "../services/issued-voucher.service.js";
import {
  listIssuedVouchersQuerySchema,
  listVoucherUsagesQuerySchema,
  updateIssuedVoucherStatusSchema,
  checkVoucherSchema,
  confirmVoucherSchema,
} from "../validations/issued-voucher.validation.js";

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}

export async function listIssuedVouchers(req: Request, res: Response) {
  const query = listIssuedVouchersQuerySchema.parse(req.query);
  const result = await issuedVoucherService.listIssuedVouchers(requireUser(req), query);
  sendSuccess(res, result);
}

export async function getIssuedVoucher(req: Request, res: Response) {
  const voucher = await issuedVoucherService.getIssuedVoucherById(requireUser(req), req.params.id);
  sendSuccess(res, voucher);
}

export async function updateIssuedVoucherStatus(req: Request, res: Response) {
  const input = updateIssuedVoucherStatusSchema.parse(req.body);
  const voucher = await issuedVoucherService.updateIssuedVoucherStatus(
    requireUser(req),
    req.params.id,
    input,
  );
  sendSuccess(res, voucher, "Cập nhật trạng thái voucher thành công");
}

export async function listUsagesForVoucher(req: Request, res: Response) {
  const usages = await issuedVoucherService.listUsagesForVoucher(requireUser(req), req.params.id);
  sendSuccess(res, usages);
}

export async function listVoucherUsages(req: Request, res: Response) {
  const query = listVoucherUsagesQuerySchema.parse(req.query);
  const result = await issuedVoucherService.listUsages(requireUser(req), query);
  sendSuccess(res, result);
}

export async function checkVoucher(req: Request, res: Response) {
  const input = checkVoucherSchema.parse(req.body);
  const result = await issuedVoucherService.checkVoucher(requireUser(req), input);
  sendSuccess(res, result);
}

export async function confirmVoucher(req: Request, res: Response) {
  const input = confirmVoucherSchema.parse(req.body);
  const result = await issuedVoucherService.confirmVoucher(requireUser(req), input);
  sendSuccess(res, result, result.message);
}