import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as rbacController from "../controllers/rbac.controller.js";
import {
  createRoleSchema,
  updateRoleSchema,
  updatePermissionsSchema,
} from "../validations/rbac.validation.js";

export const rbacRoutes = Router();

rbacRoutes.get(
  "/roles",
  requireAuth,
  requireRole("admin_security"),
  asyncHandler(rbacController.listRoles),
);

rbacRoutes.get(
  "/roles/:id",
  requireAuth,
  requireRole("admin_security"),
  asyncHandler(rbacController.getRole),
);

rbacRoutes.post(
  "/roles",
  requireAuth,
  requireRole("admin_security"),
  validateBody(createRoleSchema),
  asyncHandler(rbacController.createRole),
);

rbacRoutes.patch(
  "/roles/:id",
  requireAuth,
  requireRole("admin_security"),
  validateBody(updateRoleSchema),
  asyncHandler(rbacController.updateRole),
);

rbacRoutes.delete(
  "/roles/:id",
  requireAuth,
  requireRole("admin_security"),
  asyncHandler(rbacController.deleteRole),
);

rbacRoutes.get(
  "/permissions",
  requireAuth,
  requireRole("admin_security"),
  asyncHandler(rbacController.listPermissions),
);

rbacRoutes.put(
  "/roles/:id/permissions",
  requireAuth,
  requireRole("admin_security"),
  validateBody(updatePermissionsSchema),
  asyncHandler(rbacController.updateRolePermissions),
);
