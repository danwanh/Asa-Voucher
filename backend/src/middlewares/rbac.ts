import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/role.js";
import { HttpError } from "../utils/http-error.js";

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.header("x-user-role") as UserRole | undefined;

    if (!role || !allowedRoles.includes(role)) {
      next(new HttpError(403, "Insufficient permissions"));
      return;
    }

    next();
  };
}
