import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as logController from "../controllers/log.controller.js";

export const logRoutes = Router();

logRoutes.get("/authentication-logs", requireAuth, requireRole("admin_security"), asyncHandler(logController.listAuthenticationLogs));
logRoutes.get("/authentication-logs/:id", requireAuth, requireRole("admin_security"), asyncHandler(logController.getAuthenticationLog));

logRoutes.get("/admin-logs", requireAuth, requireRole("admin_security"), asyncHandler(logController.listAdminLogs));
logRoutes.get("/admin-logs/:id", requireAuth, requireRole("admin_security"), asyncHandler(logController.getAdminLog));

logRoutes.get("/order-logs", requireAuth, requireRole("admin_security"), asyncHandler(logController.listOrderLogs));
logRoutes.get("/order-logs/:id", requireAuth, requireRole("admin_security"), asyncHandler(logController.getOrderLog));

logRoutes.get("/payment-logs", requireAuth, requireRole("admin_security"), asyncHandler(logController.listPaymentLogs));
logRoutes.get("/payment-logs/:id", requireAuth, requireRole("admin_security"), asyncHandler(logController.getPaymentLog));