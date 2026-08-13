import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/auth.types.js";

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: AuthUser["role"];
  partnerId?: string | null;
  branchId?: string | null;
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authorization.slice("Bearer ".length);
  const secret = env.JWT_SECRET;

  if (!secret) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as unknown as AccessTokenPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      partnerId: payload.partnerId ?? null,
      branchId: payload.branchId ?? null,
    };
  } catch {
  }

  next();
}
