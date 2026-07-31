import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { requireData } from "../utils/db.js";
import { verifyAccessToken } from "../utils/auth.js";
import { HttpError } from "../utils/http-error.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  try {
    const payload = verifyAccessToken(authorization.slice("Bearer ".length));
    const user = requireData(
      await prisma.user.findUnique({
        where: { id: payload.user_id },
        select: { id: true, email: true, full_name: true, role: true, is_active: true, partner_branches_id: true }
      }),
      "User not found"
    );

    if (!user.is_active) {
      next(new HttpError(403, "User is inactive", "USER_INACTIVE"));
      return;
    }

    let partnerId: string | undefined;
    const partner = await prisma.partner.findFirst({
      where: { representative_user_id: user.id },
      select: { id: true }
    });

    if (partner?.id) {
      partnerId = partner.id;
    }

    if (!partnerId && user.partner_branches_id) {
      const branch = await prisma.partnerBranch.findUnique({
        where: { id: user.partner_branches_id },
        select: { partner_id: true }
      });

      if (branch?.partner_id) {
        partnerId = branch.partner_id;
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role as never,
      partnerId,
      branchId: user.partner_branches_id ?? undefined
    };

    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid access token", "INVALID_TOKEN"));
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    next();
    return;
  }

  await requireAuth(req, _res, next);
}
