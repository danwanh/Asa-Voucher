import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const rateLimitAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Quá nhiều yêu cầu, vui lòng thử lại sau",
      details: []
    }
  }
});
