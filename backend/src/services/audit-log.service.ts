import { prisma } from "../config/prisma.js";

export type AuditAction =
  | "user_created"
  | "user_updated"
  | "user_deactivated"
  | "user_activated"
  | "partner_created"
  | "partner_updated"
  | "partner_approved"
  | "partner_rejected"
  | "partner_status_changed"
  | "branch_created"
  | "branch_updated"
  | "branch_deleted"
  | "voucher_created"
  | "voucher_updated"
  | "voucher_submitted"
  | "voucher_approved"
  | "voucher_rejected"
  | "voucher_status_changed"
  | "complaint_assigned"
  | "complaint_resolved"
  | "complaint_closed"
  | "role_assigned"
  | "role_revoked"
  | "security_lock_account"
  | "security_unlock_account"
  | "security_review_alert"
  | "admin_action";

interface AuditLogParams {
  adminId: string;
  action: AuditAction;
  description?: string;
  targetUserId?: string;
  targetPartnerId?: string;
  targetVoucherId?: string;
  targetOrderId?: string;
}

export async function writeAuditLog(params: AuditLogParams) {
  try {
    await prisma.adminLog.create({
      data: {
        admin_id: params.adminId,
        action: params.action,
        description: params.description ?? null,
        target_user_id: params.targetUserId ?? null,
        target_partner_id: params.targetPartnerId ?? null,
        target_voucher_id: params.targetVoucherId ?? null,
        target_order_id: params.targetOrderId ?? null,
      },
    });
  } catch {
    // Audit log failures should not break the main operation
  }
}
