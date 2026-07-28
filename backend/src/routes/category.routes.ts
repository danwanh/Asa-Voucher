import { Router } from "express";
import { createCategory, deleteCategory, getCategory, listCategories, updateCategory } from "../controllers/category.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createCategorySchema, updateCategorySchema } from "../validations/category.validation.js";
import { idParamSchema } from "../validations/common.validation.js";

export const categoryRoutes = Router();

categoryRoutes.get("/categories", asyncHandler(listCategories));
categoryRoutes.post("/categories", requireAuth, requireRole(["admin_content"]), validateBody(createCategorySchema), asyncHandler(createCategory));
categoryRoutes.get("/categories/:id", validateParams(idParamSchema), asyncHandler(getCategory));
categoryRoutes.patch("/categories/:id", requireAuth, requireRole(["admin_content"]), validateParams(idParamSchema), validateBody(updateCategorySchema), asyncHandler(updateCategory));
categoryRoutes.delete("/categories/:id", requireAuth, requireRole(["admin_content"]), validateParams(idParamSchema), asyncHandler(deleteCategory));
