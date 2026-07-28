import { Router } from "express";
import { createUserByAdmin, deleteUser, getUser, listUsers, updateUser } from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { idParamSchema } from "../validations/common.validation.js";
import { createUserSchema, updateUserSchema, userQuerySchema } from "../validations/auth.validation.js";

export const userRoutes = Router();

userRoutes.get("/users", requireAuth, requireRole(["admin_account"]), validateQuery(userQuerySchema), asyncHandler(listUsers));
userRoutes.post("/users", requireAuth, requireRole(["admin_account"]), validateBody(createUserSchema), asyncHandler(createUserByAdmin));
userRoutes.get("/users/:id", requireAuth, validateParams(idParamSchema), asyncHandler(getUser));
userRoutes.patch("/users/:id", requireAuth, validateParams(idParamSchema), validateBody(updateUserSchema), asyncHandler(updateUser));
userRoutes.delete("/users/:id", requireAuth, requireRole(["admin_account"]), validateParams(idParamSchema), asyncHandler(deleteUser));
