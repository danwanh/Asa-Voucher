import { Router } from "express";
import { changePasswordController, forgotPassword, loginController, logoutController, me, refreshController, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { rateLimitAuth } from "../middlewares/rate-limit-auth.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema } from "../validations/auth.validation.js";

export const authRoutes = Router();

authRoutes.post("/auth/register", rateLimitAuth, validateBody(registerSchema), asyncHandler(register));
authRoutes.post("/auth/login", rateLimitAuth, validateBody(loginSchema), asyncHandler(loginController));
authRoutes.post("/auth/refresh", rateLimitAuth, asyncHandler(refreshController));
authRoutes.post("/auth/logout", asyncHandler(logoutController));
authRoutes.post("/auth/forgot-password", rateLimitAuth, validateBody(forgotPasswordSchema), asyncHandler(forgotPassword));
authRoutes.post("/auth/change-password", requireAuth, validateBody(changePasswordSchema), asyncHandler(changePasswordController));
authRoutes.get("/auth/me", requireAuth, asyncHandler(me));
