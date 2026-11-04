import { Router } from "express";
import { voucherChat } from "../controllers/ai.controller.js";
import { optionalAuth } from "../middlewares/optional-auth.js";
import { rateLimitAiChat } from "../middlewares/rate-limit-ai.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { voucherChatSchema } from "../validations/ai.validation.js";

export const aiRoutes = Router();

// Public: guests can search too. optionalAuth lets logged-in users get their own rate-limit bucket.
aiRoutes.post("/ai/voucher-chat", optionalAuth, rateLimitAiChat, validateBody(voucherChatSchema), asyncHandler(voucherChat));
