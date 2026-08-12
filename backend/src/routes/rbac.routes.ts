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

rbacRoutes.use(requireAuth);

rbacRoutes.get(
  "/roles",
  requireRole("admin_security"),
  asyncHandler(rbacController.listRoles),
);

rbacRoutes.get(
  "/roles/:id",
  requireRole("admin_security"),
  asyncHandler(rbacController.getRole),
);

rbacRoutes.post(
  "/roles",
  requireRole("admin_security"),
  validateBody(createRoleSchema),
  asyncHandler(rbacController.createRole),
);

rbacRoutes.patch(
  "/roles/:id",
  requireRole("admin_security"),
  validateBody(updateRoleSchema),
  asyncHandler(rbacController.updateRole),
);

rbacRoutes.delete(
  "/roles/:id",
  requireRole("admin_security"),
  asyncHandler(rbacController.deleteRole),
);

rbacRoutes.get(
  "/permissions",
  requireRole("admin_security"),
  asyncHandler(rbacController.listPermissions),
);

rbacRoutes.put(
  "/roles/:id/permissions",
  requireRole("admin_security"),
  validateBody(updatePermissionsSchema),
  asyncHandler(rbacController.updateRolePermissions),
);
