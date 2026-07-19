import { Router } from "express";
import { createBranch, createPartner, deleteBranch, deletePartner, getBranchController, getPartnerController, listBranches, listPartners, updateBranch, updatePartner, updatePartnerApproval, updatePartnerStatus } from "../controllers/partner.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/rbac.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { idParamSchema, partnerIdParamSchema } from "../validations/common.validation.js";
import { createBranchSchema, createPartnerSchema, partnerApprovalSchema, partnerQuerySchema, partnerStatusSchema, updateBranchSchema, updatePartnerSchema } from "../validations/partner.validation.js";

export const partnerRoutes = Router();

partnerRoutes.get("/partners", requireAuth, requireRole(["admin_account"]), validateQuery(partnerQuerySchema), asyncHandler(listPartners));
partnerRoutes.post("/partners", requireAuth, requireRole(["partner_owner", "admin_account"]), validateBody(createPartnerSchema), asyncHandler(createPartner));
partnerRoutes.get("/partners/:id", requireAuth, validateParams(idParamSchema), asyncHandler(getPartnerController));
partnerRoutes.patch("/partners/:id", requireAuth, validateParams(idParamSchema), validateBody(updatePartnerSchema), asyncHandler(updatePartner));
partnerRoutes.delete("/partners/:id", requireAuth, requireRole(["admin_account"]), validateParams(idParamSchema), asyncHandler(deletePartner));
partnerRoutes.patch("/partners/:id/approval", requireAuth, requireRole(["admin_account"]), validateParams(idParamSchema), validateBody(partnerApprovalSchema), asyncHandler(updatePartnerApproval));
partnerRoutes.patch("/partners/:id/status", requireAuth, requireRole(["admin_account"]), validateParams(idParamSchema), validateBody(partnerStatusSchema), asyncHandler(updatePartnerStatus));
partnerRoutes.get("/partners/:partnerId/branches", requireAuth, validateParams(partnerIdParamSchema), asyncHandler(listBranches));
partnerRoutes.post("/partners/:partnerId/branches", requireAuth, validateParams(partnerIdParamSchema), validateBody(createBranchSchema), asyncHandler(createBranch));
partnerRoutes.get("/branches/:id", requireAuth, validateParams(idParamSchema), asyncHandler(getBranchController));
partnerRoutes.patch("/branches/:id", requireAuth, validateParams(idParamSchema), validateBody(updateBranchSchema), asyncHandler(updateBranch));
partnerRoutes.delete("/branches/:id", requireAuth, validateParams(idParamSchema), asyncHandler(deleteBranch));
