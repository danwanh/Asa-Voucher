import type { Request, Response } from "express";
import * as partnerService from "../services/partner.service.js";
import { created, noContent, ok } from "../utils/response.js";
import { writeAuditLog } from "../services/audit-log.service.js";
import { sendEmail } from "../services/email.service.js";
import { prisma } from "../config/prisma.js";

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
  await writeAuditLog({
    adminId: req.user!.id,
    action: "partner_closed",
    description: "Đóng đối tác",
    targetPartnerId: req.params.id,
  });
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

  // Send notification email to partner
  try {
    const partner = await prisma.partner.findUnique({
      where: { id: req.params.id },
      select: { business_name: true, representative_user: { select: { email: true, full_name: true } } },
    });
    if (partner?.representative_user?.email) {
      const isApproved = req.body.approval_status === "approved";
      const subject = isApproved ? "Đối tác đã được duyệt - Asa Voucher" : "Đối tác bị từ chối - Asa Voucher";
      const html = isApproved
        ? `<p>Xin chào ${partner.representative_user.full_name},</p><p>Chúc mừng! Đối tác <strong>${partner.business_name}</strong> của bạn đã được duyệt bởi quản trị viên.</p><p>Bạn có thể bắt đầu đăng voucher ngay bây giờ.</p><p>Trân trọng,<br/>Đội ngũ Asa Voucher</p>`
        : `<p>Xin chào ${partner.representative_user.full_name},</p><p>Đối tác <strong>${partner.business_name}</strong> của bạn đã bị từ chối bởi quản trị viên.</p><p>Vui lòng liên hệ quản trị viên để biết thêm chi tiết.</p><p>Trân trọng,<br/>Đội ngũ Asa Voucher</p>`;
      await sendEmail(partner.representative_user.email, subject, html);
    }
  } catch {
    // Email notification failure should not break the main operation
  }

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

  // Send notification email to partner
  try {
    const partner = await prisma.partner.findUnique({
      where: { id: req.params.id },
      select: { business_name: true, representative_user: { select: { email: true, full_name: true } } },
    });
    if (partner?.representative_user?.email) {
      const status = req.body.status;
      const statusLabels: Record<string, string> = {
        active: "kích hoạt lại",
        suspended: "đình chỉ",
        closed: "đóng",
      };
      const subject = `Thông báo thay đổi trạng thái đối tác - Asa Voucher`;
      const html = `<p>Xin chào ${partner.representative_user.full_name},</p><p>Đối tác <strong>${partner.business_name}</strong> đã được <strong>${statusLabels[status] || status}</strong> bởi quản trị viên.</p><p>Vui lòng liên hệ quản trị viên nếu bạn có thắc mắc.</p><p>Trân trọng,<br/>Đội ngũ Asa Voucher</p>`;
      await sendEmail(partner.representative_user.email, subject, html);
    }
  } catch {
    // Email notification failure should not break the main operation
  }

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
  const branch = await partnerService.getBranchById(req.user!, req.params.id);
  ok(res, await partnerService.updateBranch(req.user!, req.params.id, req.body), "Branch updated");
  await writeAuditLog({
    adminId: req.user!.id,
    action: "branch_updated",
    description: "Cập nhật chi nhánh",
    targetPartnerId: (branch as Record<string, unknown>).partner_id as string,
  });
}

export async function deleteBranch(req: Request, res: Response) {
  const branch = await partnerService.getBranchById(req.user!, req.params.id);
  await partnerService.deleteBranch(req.user!, req.params.id);
  await writeAuditLog({
    adminId: req.user!.id,
    action: "branch_deleted",
    description: "Ngưng hoạt động chi nhánh",
    targetPartnerId: (branch as Record<string, unknown>).partner_id as string,
  });
  noContent(res);
}
