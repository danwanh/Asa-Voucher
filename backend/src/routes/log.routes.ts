import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as logController from "../controllers/log.controller.js";

export const logRoutes = Router();

logRoutes.use(requireAuth, requireRole("admin_security"));

logRoutes.get("/authentication-logs", asyncHandler(logController.listAuthenticationLogs));
logRoutes.get("/authentication-logs/:id", asyncHandler(logController.getAuthenticationLog));

logRoutes.get("/admin-logs", asyncHandler(logController.listAdminLogs));
logRoutes.get("/admin-logs/:id", asyncHandler(logController.getAdminLog));

logRoutes.get("/order-logs", asyncHandler(logController.listOrderLogs));
logRoutes.get("/order-logs/:id", asyncHandler(logController.getOrderLog));

logRoutes.get("/payment-logs", asyncHandler(logController.listPaymentLogs));
logRoutes.get("/payment-logs/:id", asyncHandler(logController.getPaymentLog));
