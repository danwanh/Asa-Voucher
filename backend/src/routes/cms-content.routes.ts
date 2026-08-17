import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as cmsContentController from "../controllers/cms-content.controller.js";

export const cmsContentRoutes = Router ();

// Phần public
// LƯU Ý: /cms-contents/public phải khai báo TRƯỚC /cms-contents/:id
cmsContentRoutes.get(
    "/cms-contents/public",
    asyncHandler(cmsContentController.listPublicCmsContents)
);

cmsContentRoutes.get(
    "/cms-contents",
    asyncHandler(cmsContentController.listCmsContents)
);

cmsContentRoutes.get(
    "/cms-contents/:id",
    asyncHandler(cmsContentController.getCmsContent)
);

// Dành cho admin: tạo, sửa, toggle status, xóa
cmsContentRoutes.post(
    "/cms-contents",
    requireAuth,
    requireRole("admin_content"),
    asyncHandler(cmsContentController.createCmsContent)
);

cmsContentRoutes.post(
    "/cms-contents/media/signature",
    requireAuth,
    requireRole("admin_content"),
    asyncHandler(cmsContentController.createMediaSignature)
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

cmsContentRoutes.delete(
    "/cms-contents/:id",
    requireAuth,
    requireRole("admin_content"),
    asyncHandler(cmsContentController.deleteCmsContent)
);