import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller.js";
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

// Cho phần route để lấy thông tin bên dashboard
dashboardRoutes.get(
  "/dashboard/content",
  requireAuth,
  requireRole("admin_content"),
  asyncHandler(getContentDashboard)
);