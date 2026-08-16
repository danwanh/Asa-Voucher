import type { Request, Response } from "express";
import * as voucherProductService from "../services/voucher-product.service.js";
import { created, noContent, ok } from "../utils/response.js";
import { writeAuditLog } from "../services/audit-log.service.js";

export async function listVoucherProducts(req: Request, res: Response) {
  ok(res, await voucherProductService.listVoucherProducts(req.user, req.query as Record<string, string | number>));
}

export async function createVoucherProduct(req: Request, res: Response) {
  created(res, await voucherProductService.createVoucherProduct(req.user!, req.body), "Voucher product created");
}

export async function getVoucherProduct(req: Request, res: Response) {
  ok(res, await voucherProductService.getVoucherProduct(req.user, req.params.id));
}

export async function getPublicVoucherDetail(req: Request, res: Response) {
  ok(res, await voucherProductService.getPublicVoucherDetail(req.params.id));
}

export async function getPublicHomepageSummary(_req: Request, res: Response) {
  ok(res, await voucherProductService.getPublicHomepageSummary());
}

export async function updateVoucherProduct(req: Request, res: Response) {
  ok(res, await voucherProductService.updateVoucherProduct(req.user!, req.params.id, req.body), "Voucher product updated");
}

export async function deleteVoucherProduct(req: Request, res: Response) {
  await voucherProductService.deleteVoucherProduct(req.user!, req.params.id);
  noContent(res);
}

export async function submitVoucherProduct(req: Request, res: Response) {
  ok(res, await voucherProductService.submitVoucherProduct(req.user!, req.params.id), "Voucher submitted");
}

// Sửa hàm approveVoucherProduct phù hợp với admin
export async function approveVoucherProduct(req: Request, res: Response) {
  const result = await voucherProductService.approveVoucherProduct(
    req.user!.id,
    req.params.id,
    { approval_status: req.body.approval_status, reject_reason: req.body.reject_reason }
  );
  ok(res, result, req.body.approval_status === "approved" ? "Duyệt voucher thành công" : "Từ chối voucher thành công");
}

export async function updateVoucherStatus(req: Request, res: Response) {
  const result = await voucherProductService.updateVoucherStatus(req.user!, req.params.id, req.body.status);
  await writeAuditLog({
    adminId: req.user!.id,
    action: "voucher_status_changed",
    description: `Thay đổi trạng thái voucher thành "${req.body.status}"`,
    targetVoucherId: req.params.id,
  });
  ok(res, result, "Voucher status updated");
}

export async function listVoucherImages(req: Request, res: Response) {
  ok(res, await voucherProductService.listVoucherImages(req.params.id));
}

export async function createVoucherImage(req: Request, res: Response) {
  created(res, await voucherProductService.createVoucherImage(req.user!, req.params.id, req.body), "Image created");
}

export async function updateVoucherImage(req: Request, res: Response) {
  ok(res, await voucherProductService.updateVoucherImage(req.user!, req.params.imageId, req.body), "Image updated");
}

export async function deleteVoucherImage(req: Request, res: Response) {
  await voucherProductService.deleteVoucherImage(req.user!, req.params.imageId);
  noContent(res);
}

export async function listVoucherBranches(req: Request, res: Response) {
  ok(res, await voucherProductService.listVoucherBranches(req.params.id));
}

export async function createVoucherBranch(req: Request, res: Response) {
  created(res, await voucherProductService.createVoucherBranch(req.user!, req.params.id, req.body.branch_id), "Voucher branch assigned");
}

export async function deleteVoucherBranch(req: Request, res: Response) {
  await voucherProductService.deleteVoucherBranch(req.user!, req.params.id, req.params.branchId);
  noContent(res);
}
