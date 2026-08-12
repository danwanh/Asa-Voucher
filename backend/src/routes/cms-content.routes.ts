import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as cmsContentController from "../controllers/cms-content.controller.js";

export const cmsContentRoutes = Router ();

// Phần public
cmsContentRoutes.get(
    "/cms-contents", 
    asyncHandler(cmsContentController.listCmsContents)
);

// Dành cho admin: tạo, sửa, toggle status
cmsContentRoutes.post(
    "/cms-contents",
    requireAuth,
    requireRole("admin_content"),
    asyncHandler(cmsContentController.createCmsContent)
);

cmsContentRoutes.patch(
    "/cms-contents/:id",
    requireAuth,
    requireRole("admin_content"),
    asyncHandler(cmsContentController.updateCmsContent)
);

cmsContentRoutes.patch(
    "/cms-contents/:id/toggle-status",
    requireAuth,
    requireRole("admin_content"),
    asyncHandler(cmsContentController.toggleCmsContentStatus)
);