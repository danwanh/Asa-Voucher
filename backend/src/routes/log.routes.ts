import { Router, type RequestHandler } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as logController from "../controllers/log.controller.js";

export const logRoutes = Router();

const securityOnly: RequestHandler[] = [requireAuth, requireRole("admin_security")];

logRoutes.get("/authentication-logs", ...securityOnly, asyncHandler(logController.listAuthenticationLogs));
logRoutes.get("/authentication-logs/:id", ...securityOnly, asyncHandler(logController.getAuthenticationLog));

logRoutes.get("/admin-logs", ...securityOnly, asyncHandler(logController.listAdminLogs));
logRoutes.get("/admin-logs/:id", ...securityOnly, asyncHandler(logController.getAdminLog));

logRoutes.get("/order-logs", ...securityOnly, asyncHandler(logController.listOrderLogs));
logRoutes.get("/order-logs/:id", ...securityOnly, asyncHandler(logController.getOrderLog));

logRoutes.get("/payment-logs", ...securityOnly, asyncHandler(logController.listPaymentLogs));
logRoutes.get("/payment-logs/:id", ...securityOnly, asyncHandler(logController.getPaymentLog));
