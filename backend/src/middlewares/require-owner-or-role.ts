import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http-error.js";
import type { AppRole } from "../types/auth.types.js";

export function requireOwnerOrRole(
  checkOwner: (req: Request) => boolean,
  ...roles: AppRole[]
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new HttpError(401, "Authentication required"));
      return;
    }

    if (checkOwner(req)) {
      next();
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "Bạn không có quyền thực hiện thao tác này"));
      return;
    }

    next();
  };
}
