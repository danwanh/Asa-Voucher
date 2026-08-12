import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as securityAlertController from "../controllers/security-alert.controller.js";

export const securityRoutes = Router();

securityRoutes.use(requireAuth);
securityRoutes.use(requireRole("admin_security"));

securityRoutes.get("/security-alerts", asyncHandler(securityAlertController.listAlerts));
securityRoutes.get("/security-alerts/:id", asyncHandler(securityAlertController.getAlert));
securityRoutes.patch("/security-alerts/:id/review", asyncHandler(securityAlertController.reviewAlert));
securityRoutes.post("/security-alerts/:id/lock", asyncHandler(securityAlertController.lockAccount));
securityRoutes.post("/security-alerts/:id/unlock", asyncHandler(securityAlertController.unlockAccount));
securityRoutes.post("/security-alerts/detect", asyncHandler(securityAlertController.detectAnomalies));
