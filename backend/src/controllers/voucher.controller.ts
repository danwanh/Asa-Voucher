import type { Request, Response } from "express";
import { writeAuditLog } from "../services/audit-log.service.js";

export async function validateVoucher(req: Request, res: Response) {
  const auditLog = await writeAuditLog("voucher_validation", {
    code: req.body.code,
    branchId: req.body.branchId
  });

  res.status(202).json({
    message: "Voucher validation endpoint scaffolded",
    auditLog
  });
}
