import { Router } from "express";
import { changePasswordController, forgotPasswordController, loginController, logoutController, me, refreshController, register, registerPartnerController, resendVerificationController, resetPasswordController, verifyEmailController } from "../controllers/auth.controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.js";
import { rateLimitAuth, rateLimitRefresh } from "../middlewares/rate-limit-auth.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, partnerRegisterSchema, registerSchema, resendVerificationSchema, resetPasswordSchema, verifyEmailSchema } from "../validations/auth.validation.js";

export const authRoutes = Router();

authRoutes.post("/auth/register", rateLimitAuth, validateBody(registerSchema), asyncHandler(register));
authRoutes.post("/auth/register-partner", rateLimitAuth, validateBody(partnerRegisterSchema), asyncHandler(registerPartnerController));
authRoutes.post("/auth/login", rateLimitAuth, validateBody(loginSchema), asyncHandler(loginController));
authRoutes.post("/auth/refresh", rateLimitRefresh, asyncHandler(refreshController));
authRoutes.post("/auth/logout", optionalAuth, asyncHandler(logoutController));
authRoutes.post("/auth/verify-email", rateLimitAuth, validateBody(verifyEmailSchema), asyncHandler(verifyEmailController));
authRoutes.post("/auth/resend-verification", rateLimitAuth, validateBody(resendVerificationSchema), asyncHandler(resendVerificationController));
authRoutes.post("/auth/forgot-password", rateLimitAuth, validateBody(forgotPasswordSchema), asyncHandler(forgotPasswordController));
authRoutes.post("/auth/reset-password", rateLimitAuth, validateBody(resetPasswordSchema), asyncHandler(resetPasswordController));
authRoutes.post("/auth/change-password", requireAuth, validateBody(changePasswordSchema), asyncHandler(changePasswordController));
authRoutes.get("/auth/me", requireAuth, asyncHandler(me));
