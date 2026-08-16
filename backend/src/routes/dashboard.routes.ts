import { Router } from "express";
import { getDashboard, getStaffDashboard } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getContentDashboard } from "../controllers/dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.get(
  "/dashboard",
  requireAuth,
  requireRole("admin_operations"),
  asyncHandler(getDashboard)
);

// Dashboard cho nhân viên cửa hàng (partner_store_staff)
dashboardRoutes.get(
  "/dashboard/staff",
  requireAuth,
  requireRole("partner_store_staff"),
  asyncHandler(getStaffDashboard)
);

// Cho phần route để lấy thông tin bên dashboard
dashboardRoutes.get(
  "/dashboard/content",
  requireAuth,
  requireRole("admin_content"),
  asyncHandler(getContentDashboard)
);