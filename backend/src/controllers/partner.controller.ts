import type { Request, Response } from "express";
import * as partnerService from "../services/partner.service.js";
import { created, noContent, ok } from "../utils/response.js";
import { writeAuditLog } from "../services/audit-log.service.js";

export async function listPartners(req: Request, res: Response) {
  ok(res, await partnerService.listPartners(req.query as Record<string, string | number>));
}

export async function createPartner(req: Request, res: Response) {
  created(res, await partnerService.createPartner(req.user!, req.body), "Partner created");
}

export async function getPartnerController(req: Request, res: Response) {
  ok(res, await partnerService.getPartnerById(req.user!, req.params.id));
}

export async function updatePartner(req: Request, res: Response) {
  ok(res, await partnerService.updatePartner(req.user!, req.params.id, req.body), "Partner updated");
}

export async function deletePartner(req: Request, res: Response) {
  await partnerService.deletePartner(req.params.id);
  noContent(res);
}

export async function updatePartnerApproval(req: Request, res: Response) {
  const result = await partnerService.updatePartnerApproval(req.user!.id, req.params.id, req.body.approval_status);
  await writeAuditLog({
    adminId: req.user!.id,
    action: req.body.approval_status === "approved" ? "partner_approved" : "partner_rejected",
    description: `${req.body.approval_status === "approved" ? "Duyệt" : "Từ chối"} đối tác`,
    targetPartnerId: req.params.id,
  });
  ok(res, result, "Partner approval updated");
}

export async function updatePartnerStatus(req: Request, res: Response) {
  const result = await partnerService.updatePartnerStatus(req.params.id, req.body.status);
  await writeAuditLog({
    adminId: req.user!.id,
    action: "partner_status_changed",
    description: `Thay đổi trạng thái đối tác thành "${req.body.status}"`,
    targetPartnerId: req.params.id,
  });
  ok(res, result, "Partner status updated");
}

export async function listBranches(req: Request, res: Response) {
  ok(res, await partnerService.listBranches(req.user!, req.params.partnerId));
}

export async function createBranch(req: Request, res: Response) {
  created(res, await partnerService.createBranch(req.user!, req.params.partnerId, req.body), "Branch created");
}

export async function getBranchController(req: Request, res: Response) {
  ok(res, await partnerService.getBranchById(req.user!, req.params.id));
}

export async function updateBranch(req: Request, res: Response) {
  ok(res, await partnerService.updateBranch(req.user!, req.params.id, req.body), "Branch updated");
}

export async function deleteBranch(req: Request, res: Response) {
  await partnerService.deleteBranch(req.user!, req.params.id);
  noContent(res);
}
