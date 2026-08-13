import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as issuedVoucherController from "../controllers/issued-voucher.controller.js";

export const issuedVoucherRoutes = Router();

issuedVoucherRoutes.use(requireAuth);

issuedVoucherRoutes.get("/issued-vouchers", asyncHandler(issuedVoucherController.listIssuedVouchers));
issuedVoucherRoutes.get("/issued-vouchers/:id", asyncHandler(issuedVoucherController.getIssuedVoucher));
issuedVoucherRoutes.patch(
  "/issued-vouchers/:id/status",
  requireRole("admin_content", "admin_operations"),
  asyncHandler(issuedVoucherController.updateIssuedVoucherStatus),
);

issuedVoucherRoutes.post(
  "/issued-vouchers/check",
  requireRole("partner_owner", "partner_voucher_staff", "partner_store_staff", "admin_content", "admin_operations"),
  asyncHandler(issuedVoucherController.checkVoucher),
);

issuedVoucherRoutes.post(
  "/issued-vouchers/confirm",
  requireRole("partner_store_staff"),
  asyncHandler(issuedVoucherController.confirmVoucher),
);

issuedVoucherRoutes.get(
  "/issued-vouchers/:id/usages",
  asyncHandler(issuedVoucherController.listUsagesForVoucher),
);
issuedVoucherRoutes.get(
  "/voucher-usages",
  requireRole("partner_owner", "partner_voucher_staff", "partner_store_staff", "admin_security"),
  asyncHandler(issuedVoucherController.listVoucherUsages),
);