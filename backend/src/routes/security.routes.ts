import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as securityAlertController from "../controllers/security-alert.controller.js";

export const securityRoutes = Router();

securityRoutes.get("/security-alerts", requireAuth, requireRole("admin_security"), asyncHandler(securityAlertController.listAlerts));
securityRoutes.get("/security-alerts/:id", requireAuth, requireRole("admin_security"), asyncHandler(securityAlertController.getAlert));
securityRoutes.patch("/security-alerts/:id/review", requireAuth, requireRole("admin_security"), asyncHandler(securityAlertController.reviewAlert));
securityRoutes.post("/security-alerts/:id/lock", requireAuth, requireRole("admin_security"), asyncHandler(securityAlertController.lockAccount));
securityRoutes.post("/security-alerts/:id/unlock", requireAuth, requireRole("admin_security"), asyncHandler(securityAlertController.unlockAccount));
securityRoutes.post("/security-alerts/detect", requireAuth, requireRole("admin_security"), asyncHandler(securityAlertController.detectAnomalies));
