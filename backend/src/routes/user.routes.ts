import { Router } from "express";
import { createUserByAdmin, deleteUser, getPartnerStaff, getUser, listPartnerStaff, listUsers, updatePartnerStaff, updateUser } from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { idParamSchema } from "../validations/common.validation.js";
import { createUserSchema, updateUserSchema, userQuerySchema } from "../validations/auth.validation.js";
import { partnerStaffQuerySchema, partnerStaffUpdateSchema } from "../validations/user.validation.js";

export const userRoutes = Router();

userRoutes.get("/users/partner-staff", requireAuth, requireRole("partner_owner"), validateQuery(partnerStaffQuerySchema), asyncHandler(listPartnerStaff));
userRoutes.get("/users/partner-staff/:id", requireAuth, requireRole("partner_owner"), validateParams(idParamSchema), asyncHandler(getPartnerStaff));
userRoutes.patch("/users/partner-staff/:id", requireAuth, requireRole("partner_owner"), validateParams(idParamSchema), validateBody(partnerStaffUpdateSchema), asyncHandler(updatePartnerStaff));

userRoutes.get("/users", requireAuth, requireRole("admin_operations"), validateQuery(userQuerySchema), asyncHandler(listUsers));
userRoutes.post("/users", requireAuth, requireRole("admin_operations"), validateBody(createUserSchema), asyncHandler(createUserByAdmin));
userRoutes.get("/users/:id", requireAuth, validateParams(idParamSchema), asyncHandler(getUser));
userRoutes.patch("/users/:id", requireAuth, validateParams(idParamSchema), validateBody(updateUserSchema), asyncHandler(updateUser));
userRoutes.delete("/users/:id", requireAuth, requireRole("admin_operations"), validateParams(idParamSchema), asyncHandler(deleteUser));
