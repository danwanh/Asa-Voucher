import { supabase } from "../config/supabase.js";
import { HttpError } from "./http-error.js";

export function db() {
  if (!supabase) {
    throw new HttpError(500, "Supabase is not configured", "DATABASE_NOT_CONFIGURED");
  }

  return supabase;
}

export function throwDbError(error: { message: string; code?: string } | null, fallback = "Database error"): never {
  if (!error) {
    throw new HttpError(500, fallback, "DATABASE_ERROR");
  }

  if (error.code === "23505") {
    throw new HttpError(409, error.message, "CONFLICT");
  }

  throw new HttpError(500, error.message || fallback, "DATABASE_ERROR");
}

export function requireData<T>(data: T | null, error: { message: string; code?: string } | null, message = "Not found") {
  if (error) {
    if (error.code === "PGRST116") {
      throw new HttpError(404, message, "NOT_FOUND");
    }

    throwDbError(error);
  }

  if (!data) {
    throw new HttpError(404, message, "NOT_FOUND");
  }

  return data;
}

export function sanitizeUser<T extends Record<string, unknown>>(user: T) {
  const safeUser = { ...user };
  delete safeUser.password_hash;
  return safeUser;
}
