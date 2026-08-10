import crypto from "node:crypto";
import { promisify } from "node:util";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "../types/auth.types.js";
import { HttpError } from "./http-error.js";

const scrypt = promisify(crypto.scrypt);

export type AccessTokenPayload = {
  user_id: string;
  email: string;
  role: UserRole;
  partner_id?: string;
  branch_id?: string;
  auth_version?: number;
};

function jwtSecret() {
  if (!env.JWT_SECRET) {
    throw new HttpError(500, "JWT secret is not configured", "JWT_NOT_CONFIGURED");
  }

  return env.JWT_SECRET;
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");

  return storedBuffer.length === derivedKey.length && crypto.timingSafeEqual(storedBuffer, derivedKey);
}

export function signAccessToken(payload: AccessTokenPayload) {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, jwtSecret(), options);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, jwtSecret()) as AccessTokenPayload;
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function parseCookies(cookieHeader: string | undefined) {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name) {
      cookies[name] = decodeURIComponent(valueParts.join("="));
    }
  }

  return cookies;
}
