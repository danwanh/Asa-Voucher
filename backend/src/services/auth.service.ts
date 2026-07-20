import type { Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import type { UserRole } from "../types/role.js";
import { addDays, createRefreshToken, hashPassword, hashRefreshToken, signAccessToken, verifyPassword } from "../utils/auth.js";
import { requireData, sanitizeUser, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";

const refreshCookieName = "refresh_token";

type UserRow = Record<string, unknown> & { id: string; email: string; role: UserRole; password_hash: string; is_active: boolean };

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(refreshCookieName, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: env.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(refreshCookieName, { path: "/api/v1/auth" });
}

export async function createUser(input: Record<string, unknown>, role: UserRole) {
  const passwordHash = await hashPassword(input.password as string);
  const payload = { ...input, password: undefined, password_hash: passwordHash, role };
  delete payload.password;

  try {
    const user = await prisma.user.create({ data: payload as never });
    return sanitizeUser(user as unknown as Record<string, unknown>);
  } catch (error) {
    throwDbError(error);
  }
}

async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } }) as unknown as Promise<UserRow | null>;
}

async function getPartnerId(userId: string) {
  const partner = await prisma.partner.findFirst({ where: { representative_user_id: userId }, select: { id: true } });
  return partner?.id;
}

async function persistRefreshToken(userId: string, refreshToken: string) {
  const expiresAt = addDays(new Date(), env.JWT_REFRESH_EXPIRES_IN_DAYS);
  try {
    await prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: hashRefreshToken(refreshToken),
        expires_at: expiresAt
      }
    });
  } catch (error) {
    throwDbError(error);
  }
}

export async function issueTokens(user: UserRow) {
  const partnerId = await getPartnerId(user.id);
  const accessToken = signAccessToken({
    user_id: user.id,
    email: user.email,
    role: user.role,
    partner_id: partnerId,
    branch_id: (user.partner_branches_id as string | null) ?? undefined
  });
  const refreshToken = createRefreshToken();
  await persistRefreshToken(user.id, refreshToken);
  return { accessToken, refreshToken };
}

export async function login(email: string, password: string, metadata: { ip?: string; userAgent?: string }) {
  const user = await getUserByEmail(email);
  const passwordMatches = user ? await verifyPassword(password, user.password_hash) : false;

  if (!user || !passwordMatches) {
    await writeAuthLog(user?.id, "LOGIN_FAILED", "failed", metadata);
    throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (!user.is_active) {
    await writeAuthLog(user.id, "LOGIN", "blocked", metadata);
    throw new HttpError(403, "User is inactive", "USER_INACTIVE");
  }

  const tokens = await issueTokens(user);
  await writeAuthLog(user.id, "LOGIN", "success", metadata);
  return { ...tokens, user: sanitizeUser(user) };
}

export async function refresh(refreshToken: string | undefined) {
  if (!refreshToken) {
    throw new HttpError(401, "Refresh token required", "REFRESH_TOKEN_REQUIRED");
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const token = await prisma.refreshToken.findFirst({
    where: { token_hash: tokenHash, revoked_at: null, expires_at: { gt: new Date() } },
    include: { users: true }
  });

  if (!token?.users) {
    throw new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  await prisma.refreshToken.update({ where: { id: token.id }, data: { revoked_at: new Date() } });
  const tokens = await issueTokens(token.users as unknown as UserRow);
  return { ...tokens, user: sanitizeUser(token.users as unknown as Record<string, unknown>) };
}

export async function logout(refreshToken: string | undefined, userId?: string) {
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token_hash: hashRefreshToken(refreshToken) },
      data: { revoked_at: new Date() }
    });
  }

  if (userId) {
    await writeAuthLog(userId, "LOGOUT", "success", {});
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = requireData<UserRow>(await prisma.user.findUnique({ where: { id: userId } }) as unknown as UserRow | null, "User not found");

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw new HttpError(401, "Current password is invalid", "INVALID_CURRENT_PASSWORD");
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { password_hash: await hashPassword(newPassword), updated_at: new Date() } });
  } catch (error) {
    throwDbError(error);
  }
  await writeAuthLog(userId, "CHANGE_PASSWORD", "success", {});
}

export async function writeAuthLog(userId: string | undefined, action: string, status: string, metadata: { ip?: string; userAgent?: string }) {
  await prisma.authenticationLog.create({
    data: {
      user_id: userId ?? null,
      action,
      status,
      ip_address: metadata.ip,
      user_agent: metadata.userAgent
    }
  });
}
