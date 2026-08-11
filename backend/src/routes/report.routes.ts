import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as reportController from "../controllers/report.controller.js";

export const reportRoutes = Router();

const reportViewerRoles = ["partner_owner", "partner_voucher_staff", "admin_content", "admin_operations", "admin_security"] as const;

reportRoutes.get("/reports/revenue", requireAuth, requireRole(...reportViewerRoles), asyncHandler(reportController.getRevenueReport));
reportRoutes.get("/reports/orders", requireAuth, requireRole(...reportViewerRoles), asyncHandler(reportController.getOrderReport));
reportRoutes.get("/reports/vouchers", requireAuth, requireRole(...reportViewerRoles), asyncHandler(reportController.getVoucherReport));
reportRoutes.get(
  "/reports/partners",
  requireAuth,
  requireRole("admin_content", "admin_operations", "admin_security"),
  asyncHandler(reportController.getPartnerReport),
);