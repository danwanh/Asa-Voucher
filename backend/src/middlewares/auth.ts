import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http-error.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  next();
}
