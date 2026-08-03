import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const getRateLimitKey = (req: Request) =>
  `${ipKeyGenerator(req.ip ?? "")}:${req.path}`;

export const rateLimitAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: getRateLimitKey,
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

export const rateLimitRefresh = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: getRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Quá nhiều yêu cầu làm mới phiên, vui lòng thử lại sau",
      details: []
    }
  }
});
