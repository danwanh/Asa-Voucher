import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

// Protects the (free-tier) AI quota: limit per logged-in user, fall back to IP for guests.
function createAiRateLimit(max: number, windowMinutes: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Bạn đã dùng AI quá nhiều lần, vui lòng thử lại sau ít phút",
        details: []
      }
    }
  });
}

export const rateLimitAi = createAiRateLimit(10, 10);
export const rateLimitAiChat = createAiRateLimit(20, 10);
