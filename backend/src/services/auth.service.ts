import type { Response } from "express";
import { env } from "../config/env.js";
import type { UserRole } from "../types/role.js";
import { addDays, createRefreshToken, hashPassword, hashRefreshToken, signAccessToken, verifyPassword } from "../utils/auth.js";
import { db, requireData, sanitizeUser, throwDbError } from "../utils/db.js";
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

  const { data, error } = await db().from("users").insert(payload).select("*").single();
  if (error) throwDbError(error);
  return sanitizeUser(requireData<Record<string, unknown>>(data, error));
}

async function getUserByEmail(email: string) {
  const { data, error } = await db().from("users").select("*").eq("email", email).maybeSingle();
  if (error) throwDbError(error);
  return data as UserRow | null;
}

async function getPartnerId(userId: string) {
  const { data } = await db().from("partners").select("id").eq("representative_user_id", userId).maybeSingle();
  return (data?.id as string | undefined) ?? undefined;
}

async function persistRefreshToken(userId: string, refreshToken: string) {
  const expiresAt = addDays(new Date(), env.JWT_REFRESH_EXPIRES_IN_DAYS);
  const { error } = await db().from("refresh_tokens").insert({
    user_id: userId,
    token_hash: hashRefreshToken(refreshToken),
    expires_at: expiresAt.toISOString()
  });
  if (error) throwDbError(error);
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
  const { data, error } = await db()
    .from("refresh_tokens")
    .select("*, users(*)")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) throwDbError(error);
  if (!data?.users) {
    throw new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  await db().from("refresh_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", data.id);
  const tokens = await issueTokens(data.users as UserRow);
  return { ...tokens, user: sanitizeUser(data.users as Record<string, unknown>) };
}

export async function logout(refreshToken: string | undefined, userId?: string) {
  if (refreshToken) {
    await db()
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashRefreshToken(refreshToken));
  }

  if (userId) {
    await writeAuthLog(userId, "LOGOUT", "success", {});
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const { data, error } = await db().from("users").select("*").eq("id", userId).single();
  const user = requireData<UserRow>(data, error, "User not found");

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw new HttpError(401, "Current password is invalid", "INVALID_CURRENT_PASSWORD");
  }

  const { error: updateError } = await db()
    .from("users")
    .update({ password_hash: await hashPassword(newPassword), updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (updateError) throwDbError(updateError);
  await writeAuthLog(userId, "CHANGE_PASSWORD", "success", {});
}

export async function writeAuthLog(userId: string | undefined, action: string, status: string, metadata: { ip?: string; userAgent?: string }) {
  await db().from("authentication_logs").insert({
    user_id: userId ?? null,
    action,
    status,
    ip_address: metadata.ip,
    user_agent: metadata.userAgent
  });
}
