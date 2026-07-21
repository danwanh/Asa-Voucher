import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../utils/response.js";
import { HttpError } from "../utils/http-error.js";
import * as complaintService from "../services/complaint.service.js";
import {
  assignComplaintSchema,
  createComplaintResponseSchema,
  createComplaintSchema,
  listComplaintsQuerySchema,
  resolveComplaintSchema,
  updateComplaintSchema,
} from "../validations/complaint.validation.js";

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}

export async function listComplaints(req: Request, res: Response) {
  const query = listComplaintsQuerySchema.parse(req.query);
  const result = await complaintService.listComplaints(requireUser(req), query);
  sendSuccess(res, result);
}

export async function createComplaint(req: Request, res: Response) {
  const input = createComplaintSchema.parse(req.body);
  const complaint = await complaintService.createComplaint(requireUser(req), input);
  sendCreated(res, complaint, "Tạo khiếu nại thành công");
}

export async function getComplaint(req: Request, res: Response) {
  const complaint = await complaintService.getComplaintById(requireUser(req), req.params.id);
  sendSuccess(res, complaint);
}

export async function updateComplaint(req: Request, res: Response) {
  const input = updateComplaintSchema.parse(req.body);
  const complaint = await complaintService.updateComplaint(requireUser(req), req.params.id, input);
  sendSuccess(res, complaint, "Cập nhật khiếu nại thành công");
}

export async function closeComplaint(req: Request, res: Response) {
  const complaint = await complaintService.closeComplaint(requireUser(req), req.params.id);
  sendSuccess(res, complaint, "Đã đóng khiếu nại");
}

export async function assignComplaint(req: Request, res: Response) {
  const input = assignComplaintSchema.parse(req.body);
  const complaint = await complaintService.assignComplaint(requireUser(req), req.params.id, input);
  sendSuccess(res, complaint, "Đã gán người xử lý");
}

export async function resolveComplaint(req: Request, res: Response) {
  const input = resolveComplaintSchema.parse(req.body);
  const complaint = await complaintService.resolveComplaint(requireUser(req), req.params.id, input);
  sendSuccess(res, complaint, "Đã hoàn tất xử lý khiếu nại");
}

export async function listComplaintResponses(req: Request, res: Response) {
  const responses = await complaintService.listComplaintResponses(requireUser(req), req.params.id);
  sendSuccess(res, responses);
}

export async function createComplaintResponse(req: Request, res: Response) {
  const input = createComplaintResponseSchema.parse(req.body);
  const response = await complaintService.createComplaintResponse(requireUser(req), req.params.id, input);
  sendCreated(res, response, "Đã thêm phản hồi");
}
