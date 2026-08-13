import type { Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { buildResetPasswordEmail, buildVerificationEmail, sendEmail } from "./email.service.js";
import type { UserRole } from "../types/auth.types.js";
import { addDays, createOpaqueToken, createRefreshToken, hashOpaqueToken, hashPassword, hashRefreshToken, signAccessToken, verifyPassword } from "../utils/auth.js";
import { requireData, sanitizeUser, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";

const refreshCookieName = "refresh_token";
const verificationTokenType = "EMAIL_VERIFICATION";
const resetTokenType = "PASSWORD_RESET";
const lockDurationMs = 15 * 60 * 1000;
const resendCooldownMs = 60 * 1000;

type UserRow = Record<string, unknown> & {
  id: string;
  email: string;
  role: UserRole;
  password_hash: string;
  is_active: boolean;
  is_verified: boolean;
  failed_login_attempts?: number;
  locked_until?: Date | null;
  auth_version?: number;
  partner_branches_id?: string | null;
};

function normalizeIdentifier(identifier: string) {
  const value = identifier.trim();
  return value.includes("@") ? value.toLowerCase() : value.replace(/[\s()-]/g, "");
}

function tokenExpiresAt() {
  return new Date(Date.now() + env.AUTH_TOKEN_EXPIRES_IN_MINUTES * 60 * 1000);
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(refreshCookieName, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: env.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(refreshCookieName, { path: "/api" });
}

export async function createUser(input: Record<string, unknown>, role: UserRole, verified = false) {
  const passwordHash = await hashPassword(input.password as string);
  const profile = { ...input };
  delete profile.password;
  delete profile.confirm_password;
  const normalizedProfile = {
    ...profile,
    phone: typeof profile.phone === "string" ? normalizeIdentifier(profile.phone) : profile.phone,
    password_hash: passwordHash,
    role,
    is_active: verified,
    is_verified: verified
  };

  try {
    const user = await prisma.user.create({ data: normalizedProfile as never });
    return sanitizeUser(user as unknown as Record<string, unknown>);
  } catch (error) {
    throwDbError(error);
  }
}

async function getUserByIdentifier(identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  return prisma.user.findFirst({
    where: { OR: [{ email: normalized }, { phone: normalized }] }
  }) as unknown as Promise<UserRow | null>;
}

async function getPartnerId(userId: string, branchId?: string | null) {
  const partner = await prisma.partner.findFirst({ where: { representative_user_id: userId }, select: { id: true } });
  if (partner?.id) {
    return partner.id;
  }

  if (branchId) {
    const branch = await prisma.partnerBranch.findUnique({ where: { id: branchId }, select: { partner_id: true } });
    return branch?.partner_id;
  }

  return undefined;
}

async function persistRefreshToken(userId: string, refreshToken: string) {
  try {
    await prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: hashRefreshToken(refreshToken),
        expires_at: addDays(new Date(), env.JWT_REFRESH_EXPIRES_IN_DAYS)
      }
    });
  } catch (error) {
    throwDbError(error);
  }
}

export async function issueTokens(user: UserRow, partnerId?: string) {
  const resolvedPartnerId = partnerId ?? await getPartnerId(user.id, user.partner_branches_id ?? null);
  const accessToken = signAccessToken({
    user_id: user.id,
    email: user.email,
    role: user.role,
    partner_id: resolvedPartnerId,
    branch_id: user.partner_branches_id ?? undefined,
    auth_version: user.auth_version ?? 0
  });
  const refreshToken = createRefreshToken();
  await persistRefreshToken(user.id, refreshToken);
  return { accessToken, refreshToken };
}

async function publicUser(user: UserRow, partnerId?: string) {
  const resolvedPartnerId = partnerId ?? await getPartnerId(user.id, user.partner_branches_id ?? null);
  return { ...sanitizeUser(user), partnerId: resolvedPartnerId, branchId: user.partner_branches_id ?? undefined };
}

export async function login(identifier: string, password: string, metadata: { ip?: string; userAgent?: string }) {
  const user = await getUserByIdentifier(identifier);
  const now = new Date();

  if (user?.locked_until && user.locked_until > now) {
    await writeAuthLog(user.id, "LOGIN", "locked", metadata);
    throw new HttpError(423, "Tài khoản đang bị khóa. Vui lòng thử lại sau 15 phút.", "ACCOUNT_LOCKED", { locked_until: user.locked_until.toISOString(), lock_duration_minutes: 15 });
  }

  if (!user) {
    await writeAuthLog(undefined, "LOGIN_FAILED", "account_not_found", metadata);
    throw new HttpError(401, "Sai tên đăng nhập hoặc không tồn tại tài khoản, vui lòng đăng ký phù hợp", "ACCOUNT_NOT_FOUND");
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches) {
    const attempts = (user.failed_login_attempts ?? 0) + 1;
    const lockedUntil = attempts >= 10 ? new Date(Date.now() + lockDurationMs) : null;
    await prisma.user.update({ where: { id: user.id }, data: { failed_login_attempts: attempts, locked_until: lockedUntil } });
    await writeAuthLog(user.id, "LOGIN_FAILED", lockedUntil ? "locked" : "failed", metadata);
    if (lockedUntil) {
      throw new HttpError(423, "Bạn đã nhập sai mật khẩu quá 10 lần. Tài khoản bị khóa trong 15 phút.", "ACCOUNT_LOCKED", { locked_until: lockedUntil.toISOString(), failed_attempts: attempts, lock_duration_minutes: 15 });
    }
    throw new HttpError(401, "Sai mật khẩu", "INVALID_PASSWORD", { failed_attempts: attempts, remaining_attempts: Math.max(0, 10 - attempts) });
  }

  if (!user.is_verified) {
    await writeAuthLog(user.id, "LOGIN", "unverified", metadata);
    throw new HttpError(403, "Vui lòng xác thực email trước khi đăng nhập.", "EMAIL_NOT_VERIFIED");
  }

  if (user.role === "partner_owner") {
    const partner = await prisma.partner.findFirst({ where: { representative_user_id: user.id }, select: { approval_status: true, status: true } });
    if (partner?.approval_status !== "approved") {
      const code = partner?.approval_status === "rejected" ? "PARTNER_REJECTED" : "PARTNER_PENDING";
      const message = code === "PARTNER_REJECTED" ? "Hồ sơ đối tác đã bị từ chối. Vui lòng liên hệ hỗ trợ." : "Hồ sơ đối tác đang chờ quản trị viên phê duyệt.";
      await writeAuthLog(user.id, "LOGIN", code === "PARTNER_REJECTED" ? "rejected" : "pending", metadata);
      throw new HttpError(403, message, code);
    }
    if (partner.status !== "active") {
      await writeAuthLog(user.id, "LOGIN", "partner_inactive", metadata);
      throw new HttpError(403, "Hồ sơ đối tác đang tạm ngưng hoạt động.", "PARTNER_INACTIVE");
    }
  }

  if (!user.is_active) {
    await writeAuthLog(user.id, "LOGIN", "blocked", metadata);
    throw new HttpError(403, "Tài khoản chưa được kích hoạt", "USER_INACTIVE");
  }

  await prisma.user.update({ where: { id: user.id }, data: { failed_login_attempts: 0, locked_until: null } });
  const tokens = await issueTokens(user);
  await writeAuthLog(user.id, "LOGIN", "success", metadata);
  return { ...tokens, user: await publicUser(user) };
}

export async function registerBuyer(input: Record<string, unknown>) {
  const user = await createUser(input, "buyer");
  const token = await createAuthToken((user as { id: string }).id, verificationTokenType);
  const email = input.email as string;
  const message = buildVerificationEmail(token);
  await sendEmail(email, message.subject, message.html);
  return user;
}

function createBusinessCode() {
  return `ASA-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

export async function registerPartner(input: Record<string, unknown>) {
  const passwordHash = await hashPassword(input.password as string);
  const { business_name, business_type, tax_number, website_url, description, ...profile } = input;
  delete profile.password;
  delete profile.confirm_password;
  let userId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...profile,
          phone: typeof profile.phone === "string" ? normalizeIdentifier(profile.phone) : profile.phone,
          password_hash: passwordHash,
          role: "partner_owner",
          is_active: false,
          is_verified: false
        } as never
      });
      const partner = await tx.partner.create({
        data: {
          representative_user_id: user.id,
          business_name: business_name as string,
          business_code: createBusinessCode(),
          business_type: business_type as string | undefined,
          tax_number: tax_number as string,
          website_url: website_url as string | undefined,
          description: description as string | undefined,
          approval_status: "pending",
          status: "active"
        } as never
      });
      return { user, partner };
    });
    userId = result.user.id;
    const token = await createAuthToken(userId, verificationTokenType);
    const emailMessage = buildVerificationEmail(token);
    await sendEmail(input.email as string, emailMessage.subject, emailMessage.html);
    return { user: sanitizeUser(result.user as unknown as Record<string, unknown>), partner: result.partner };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throwDbError(error);
  }
}

async function createAuthToken(userId: string, type: string) {
  const token = createOpaqueToken();
  await prisma.authToken.updateMany({ where: { user_id: userId, type, used_at: null }, data: { used_at: new Date() } });
  await prisma.authToken.create({ data: { user_id: userId, token_hash: hashOpaqueToken(token), type, expires_at: tokenExpiresAt() } });
  return token;
}

async function assertResendAllowed(userId: string, type: string) {
  const recent = await prisma.authToken.findFirst({ where: { user_id: userId, type, created_at: { gt: new Date(Date.now() - resendCooldownMs) } }, orderBy: { created_at: "desc" } });
  if (recent) throw new HttpError(429, "Vui lòng chờ 60 giây trước khi yêu cầu gửi lại email.", "EMAIL_RESEND_COOLDOWN", { cooldown_seconds: 60 });
}

export async function verifyEmail(token: string) {
  const record = await prisma.authToken.findFirst({ where: { token_hash: hashOpaqueToken(token), type: verificationTokenType, used_at: null, expires_at: { gt: new Date() } }, include: { users: true } });
  if (!record?.users) throw new HttpError(400, "Liên kết xác thực không hợp lệ hoặc đã hết hạn.", "INVALID_VERIFICATION_TOKEN");
  const partner = record.users.role === "partner_owner"
    ? await prisma.partner.findFirst({ where: { representative_user_id: record.user_id }, select: { approval_status: true, status: true } })
    : null;
  const isActive = !partner || (partner.approval_status === "approved" && partner.status === "active");
  await prisma.$transaction([
    prisma.authToken.update({ where: { id: record.id }, data: { used_at: new Date() } }),
    prisma.user.update({ where: { id: record.user_id }, data: { is_verified: true, is_active: isActive } })
  ]);
  await writeAuthLog(record.user_id, "VERIFY_EMAIL", "success", {});
}

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } }) as unknown as UserRow | null;
  if (!user || user.is_verified) return;
  await assertResendAllowed(user.id, verificationTokenType);
  const token = await createAuthToken(user.id, verificationTokenType);
  const message = buildVerificationEmail(token);
  await sendEmail(user.email, message.subject, message.html);
}

export async function forgotPassword(identifier: string) {
  const user = await getUserByIdentifier(identifier);
  if (!user) throw new HttpError(404, "Email chưa tồn tại trong hệ thống.", "EMAIL_NOT_FOUND");
  if (!user.is_verified) throw new HttpError(403, "Email chưa được xác thực.", "EMAIL_NOT_VERIFIED");
  await assertResendAllowed(user.id, resetTokenType);
  const token = await createAuthToken(user.id, resetTokenType);
  const message = buildResetPasswordEmail(token);
  await sendEmail(user.email, message.subject, message.html);
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.authToken.findFirst({ where: { token_hash: hashOpaqueToken(token), type: resetTokenType, used_at: null, expires_at: { gt: new Date() } } });
  if (!record) throw new HttpError(400, "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.", "INVALID_RESET_TOKEN");
  await prisma.$transaction([
    prisma.authToken.update({ where: { id: record.id }, data: { used_at: new Date() } }),
    prisma.user.update({ where: { id: record.user_id }, data: { password_hash: await hashPassword(newPassword), failed_login_attempts: 0, locked_until: null, auth_version: { increment: 1 }, updated_at: new Date() } }),
    prisma.refreshToken.updateMany({ where: { user_id: record.user_id, revoked_at: null }, data: { revoked_at: new Date() } })
  ]);
  await writeAuthLog(record.user_id, "RESET_PASSWORD", "success", {});
}

export async function refresh(refreshToken: string | undefined) {
  if (!refreshToken) throw new HttpError(401, "Refresh token required", "REFRESH_TOKEN_REQUIRED");
  const token = await prisma.refreshToken.findFirst({
    where: { token_hash: hashRefreshToken(refreshToken), revoked_at: null, expires_at: { gt: new Date() } },
    select: {
      id: true,
      users: {
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          is_active: true,
          is_verified: true,
          auth_version: true,
          partner_branches_id: true
        }
      }
    }
  });
  if (!token?.users) throw new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  if (!token.users.is_active || !token.users.is_verified) throw new HttpError(403, "Account is not active", "ACCOUNT_NOT_ACTIVE");
  await prisma.refreshToken.update({ where: { id: token.id }, data: { revoked_at: new Date() } });
  const user = token.users as unknown as UserRow;
  const partnerId = await getPartnerId(user.id, user.partner_branches_id ?? null);
  const tokens = await issueTokens(user, partnerId);
  return { ...tokens, user: await publicUser(user, partnerId) };
}

export async function logout(refreshToken: string | undefined, userId?: string) {
  let resolvedUserId = userId;
  if (refreshToken) {
    const token = await prisma.refreshToken.findFirst({ where: { token_hash: hashRefreshToken(refreshToken), revoked_at: null }, select: { user_id: true } });
    resolvedUserId ??= token?.user_id;
    await prisma.refreshToken.updateMany({ where: { token_hash: hashRefreshToken(refreshToken), revoked_at: null }, data: { revoked_at: new Date() } });
  }
  if (resolvedUserId) {
    await prisma.user.update({ where: { id: resolvedUserId }, data: { auth_version: { increment: 1 } } });
    await writeAuthLog(resolvedUserId, "LOGOUT", "success", {});
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = requireData<UserRow>(await prisma.user.findUnique({ where: { id: userId } }) as unknown as UserRow | null, "User not found");
  if (!(await verifyPassword(currentPassword, user.password_hash))) throw new HttpError(401, "Current password is invalid", "INVALID_CURRENT_PASSWORD");
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { password_hash: await hashPassword(newPassword), auth_version: { increment: 1 }, updated_at: new Date() } }),
    prisma.refreshToken.updateMany({ where: { user_id: userId, revoked_at: null }, data: { revoked_at: new Date() } })
  ]);
  await writeAuthLog(userId, "CHANGE_PASSWORD", "success", {});
}

export async function writeAuthLog(userId: string | undefined, action: string, status: string, metadata: { ip?: string; userAgent?: string }) {
  await prisma.authenticationLog.create({ data: { user_id: userId ?? null, action, status, ip_address: metadata.ip, user_agent: metadata.userAgent } });
}
