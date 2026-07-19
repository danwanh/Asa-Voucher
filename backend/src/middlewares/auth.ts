import type { NextFunction, Request, Response } from "express";
import { db, requireData } from "../utils/db.js";
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
    const { data, error } = await db()
      .from("users")
      .select("id,email,role,is_active,partner_branches_id")
      .eq("id", payload.user_id)
      .single();
    const user = requireData<Record<string, unknown>>(data, error, "User not found");

    if (!user.is_active) {
      next(new HttpError(403, "User is inactive", "USER_INACTIVE"));
      return;
    }

    let partnerId: string | undefined;
    const { data: partner } = await db()
      .from("partners")
      .select("id")
      .eq("representative_user_id", user.id as string)
      .maybeSingle();

    if (partner?.id) {
      partnerId = partner.id as string;
    }

    if (!partnerId && user.partner_branches_id) {
      const { data: branch } = await db()
        .from("partner_branches")
        .select("partner_id")
        .eq("id", user.partner_branches_id as string)
        .maybeSingle();

      if (branch?.partner_id) {
        partnerId = branch.partner_id as string;
      }
    }

    req.user = {
      id: user.id as string,
      email: user.email as string,
      role: user.role as never,
      partnerId,
      branchId: (user.partner_branches_id as string | null) ?? undefined
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
