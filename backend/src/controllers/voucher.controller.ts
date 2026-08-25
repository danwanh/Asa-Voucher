import type { Request, Response } from "express";
import { writeAuditLog } from "../services/audit-log.service.js";

export async function validateVoucher(req: Request, res: Response) {
  const auditLog = await writeAuditLog({
    adminId: (req as unknown as { user?: { id: string } }).user?.id ?? "system",
    action: "admin_action",
    description: JSON.stringify({ code: req.body.code, branchId: req.body.branchId }),
  });

  res.status(202).json({
    message: "Voucher validation endpoint scaffolded",
    auditLog
  });
}
