import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as complaintController from "../controllers/complaint.controller.js";

export const complaintRoutes = Router();

complaintRoutes.use(requireAuth);

complaintRoutes.get("/complaints/admins/search", asyncHandler(complaintController.searchAdmins));

complaintRoutes.get("/complaints", asyncHandler(complaintController.listComplaints));
complaintRoutes.post(
  "/complaints",
  requireRole("buyer"),
  asyncHandler(complaintController.createComplaint),
);
complaintRoutes.get("/complaints/:id", asyncHandler(complaintController.getComplaint));
complaintRoutes.patch("/complaints/:id", asyncHandler(complaintController.updateComplaint));
complaintRoutes.delete("/complaints/:id", asyncHandler(complaintController.closeComplaint));

complaintRoutes.patch(
  "/complaints/:id/assign",
  requireRole("admin_content", "admin_operations", "partner_owner", "partner_voucher_staff"),
  asyncHandler(complaintController.assignComplaint),
);
complaintRoutes.patch(
  "/complaints/:id/resolve",
  requireRole("admin_content", "admin_operations", "partner_owner", "partner_voucher_staff"),
  asyncHandler(complaintController.resolveComplaint),
);

complaintRoutes.get("/complaints/:id/responses", asyncHandler(complaintController.listComplaintResponses));
complaintRoutes.post(
  "/complaints/:id/responses",
  asyncHandler(complaintController.createComplaintResponse),
);
