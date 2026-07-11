import { Router } from "express";
import { validateVoucher } from "../controllers/voucher.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { validateBody } from "../middlewares/validate.js";
import { validateVoucherCodeSchema } from "../validations/voucher.validation.js";

export const voucherRoutes = Router();

voucherRoutes.post(
  "/vouchers/validate",
  requireAuth,
  requireRole(["partner_staff", "partner_manager", "admin_security"]),
  validateBody(validateVoucherCodeSchema),
  validateVoucher
);
