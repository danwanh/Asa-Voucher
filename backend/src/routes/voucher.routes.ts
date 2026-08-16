import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { approveVoucherProduct, createVoucherBranch, createVoucherImage, createVoucherProduct, deleteVoucherBranch, deleteVoucherImage, deleteVoucherProduct, getPublicHomepageSummary, getPublicVoucherDetail, getVoucherProduct, listVoucherBranches, listVoucherImages, listVoucherProducts, submitVoucherProduct, updateVoucherImage, updateVoucherProduct, updateVoucherStatus } from "../controllers/voucher-product.controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { branchMappingParamSchema, idParamSchema, imageIdParamSchema } from "../validations/common.validation.js";
import { approvalSchema, createVoucherImageSchema, createVoucherProductSchema, updateVoucherImageSchema, updateVoucherProductSchema, voucherBranchSchema, voucherProductQuerySchema, voucherStatusSchema } from "../validations/voucher-product.validation.js";

export const voucherRoutes = Router();

function requireAuthForMineScope(req: Request, res: Response, next: NextFunction) {
  if (req.query.scope === "mine") {
    void requireAuth(req, res, next);
    return;
  }

  next();
}

function requireAdminForApprovalStatus(req: Request, res: Response, next: NextFunction) {
  if (req.query.approval_status) {
    void requireAuth(req, res, (authError) => {
      if (authError) return next(authError);
      requireRole("admin_content")(req, res, next);
    });
    return;
  }

  next();
}

voucherRoutes.get("/voucher-products", validateQuery(voucherProductQuerySchema), requireAuthForMineScope, requireAdminForApprovalStatus, asyncHandler(listVoucherProducts));
voucherRoutes.get("/homepage/summary", asyncHandler(getPublicHomepageSummary));
voucherRoutes.post("/voucher-products", requireAuth, requireRole("partner_owner", "partner_voucher_staff"), validateBody(createVoucherProductSchema), asyncHandler(createVoucherProduct));
voucherRoutes.get("/voucher-products/:id/detail", validateParams(idParamSchema), asyncHandler(getPublicVoucherDetail));
voucherRoutes.get("/voucher-products/:id", optionalAuth, validateParams(idParamSchema), asyncHandler(getVoucherProduct));
voucherRoutes.patch("/voucher-products/:id", requireAuth, validateParams(idParamSchema), validateBody(updateVoucherProductSchema), asyncHandler(updateVoucherProduct));
voucherRoutes.delete("/voucher-products/:id", requireAuth, validateParams(idParamSchema), asyncHandler(deleteVoucherProduct));
voucherRoutes.patch("/voucher-products/:id/submit", requireAuth, requireRole("partner_owner", "partner_voucher_staff"), validateParams(idParamSchema), asyncHandler(submitVoucherProduct));
voucherRoutes.patch("/voucher-products/:id/approval", requireAuth, requireRole("admin_content"), validateParams(idParamSchema), validateBody(approvalSchema), asyncHandler(approveVoucherProduct));
voucherRoutes.patch("/voucher-products/:id/status", requireAuth, validateParams(idParamSchema), validateBody(voucherStatusSchema), asyncHandler(updateVoucherStatus));
voucherRoutes.get("/voucher-products/:id/images", validateParams(idParamSchema), asyncHandler(listVoucherImages));
voucherRoutes.post("/voucher-products/:id/images", requireAuth, requireRole("partner_owner", "partner_voucher_staff"), validateParams(idParamSchema), validateBody(createVoucherImageSchema), asyncHandler(createVoucherImage));
voucherRoutes.patch("/voucher-product-images/:imageId", requireAuth, requireRole("partner_owner", "partner_voucher_staff"), validateParams(imageIdParamSchema), validateBody(updateVoucherImageSchema), asyncHandler(updateVoucherImage));
voucherRoutes.delete("/voucher-product-images/:imageId", requireAuth, requireRole("partner_owner", "partner_voucher_staff"), validateParams(imageIdParamSchema), asyncHandler(deleteVoucherImage));
voucherRoutes.get("/voucher-products/:id/branches", validateParams(idParamSchema), asyncHandler(listVoucherBranches));
voucherRoutes.post("/voucher-products/:id/branches", requireAuth, requireRole("partner_owner", "partner_voucher_staff"), validateParams(idParamSchema), validateBody(voucherBranchSchema), asyncHandler(createVoucherBranch));
voucherRoutes.delete("/voucher-products/:id/branches/:branchId", requireAuth, requireRole("partner_owner", "partner_voucher_staff"), validateParams(branchMappingParamSchema), asyncHandler(deleteVoucherBranch));
