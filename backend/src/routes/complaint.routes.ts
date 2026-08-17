import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as complaintController from "../controllers/complaint.controller.js";

export const complaintRoutes = Router();

complaintRoutes.get("/complaints/admins/search", requireAuth, asyncHandler(complaintController.searchAdmins));

complaintRoutes.get("/complaints", requireAuth, asyncHandler(complaintController.listComplaints));
complaintRoutes.post(
  "/complaints",
  requireAuth,
  requireRole("buyer"),
  asyncHandler(complaintController.createComplaint),
);
complaintRoutes.get("/complaints/:id", requireAuth, asyncHandler(complaintController.getComplaint));
complaintRoutes.patch("/complaints/:id", requireAuth, asyncHandler(complaintController.updateComplaint));
complaintRoutes.delete("/complaints/:id", requireAuth, asyncHandler(complaintController.closeComplaint));

complaintRoutes.patch(
  "/complaints/:id/assign",
  requireAuth,
  requireRole("admin_content", "admin_operations", "partner_owner", "partner_voucher_staff"),
  asyncHandler(complaintController.assignComplaint),
);
complaintRoutes.patch(
  "/complaints/:id/resolve",
  requireAuth,
  requireRole("admin_content", "admin_operations", "partner_owner", "partner_voucher_staff"),
  asyncHandler(complaintController.resolveComplaint),
);

complaintRoutes.get("/complaints/:id/responses", requireAuth, asyncHandler(complaintController.listComplaintResponses));
complaintRoutes.post(
  "/complaints/:id/responses",
  requireAuth,
  asyncHandler(complaintController.createComplaintResponse),
);
