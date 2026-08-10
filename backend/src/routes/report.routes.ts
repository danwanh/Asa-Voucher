import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as reportController from "../controllers/report.controller.js";

export const reportRoutes = Router();

reportRoutes.use(requireAuth);
reportRoutes.use(requireRole("partner_owner", "partner_voucher_staff", "admin_content", "admin_operations", "admin_security"));

reportRoutes.get("/reports/revenue", asyncHandler(reportController.getRevenueReport));
reportRoutes.get("/reports/orders", asyncHandler(reportController.getOrderReport));
reportRoutes.get("/reports/vouchers", asyncHandler(reportController.getVoucherReport));
reportRoutes.get(
  "/reports/partners",
  requireRole("admin_content", "admin_operations", "admin_security"),
  asyncHandler(reportController.getPartnerReport),
);
