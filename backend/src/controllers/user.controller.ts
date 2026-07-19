import type { Request, Response } from "express";
import { hashPassword } from "../utils/auth.js";
import { db, requireData, sanitizeUser, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";
import { created, noContent, ok } from "../utils/response.js";
import { rangeFromPagination } from "../validations/common.validation.js";

export async function listUsers(req: Request, res: Response) {
  const { page, limit, role, is_active: isActive } = req.query as Record<string, string | number | boolean>;
  const { from, to } = rangeFromPagination(Number(page), Number(limit));
  let query = db().from("users").select("*", { count: "exact" }).range(from, to).order("created_at", { ascending: false });

  if (role) query = query.eq("role", role);
  if (typeof isActive === "boolean") query = query.eq("is_active", isActive);

  const { data, error, count } = await query;
  if (error) throwDbError(error);
  ok(res, { items: (data ?? []).map(sanitizeUser), count, page, limit });
}

export async function createUserByAdmin(req: Request, res: Response) {
  const payload = { ...req.body, password_hash: await hashPassword(req.body.password) };
  delete payload.password;
  const { data, error } = await db().from("users").insert(payload).select("*").single();
  if (error) throwDbError(error);
  created(res, sanitizeUser(requireData<Record<string, unknown>>(data, error)), "User created");
}

export async function getUser(req: Request, res: Response) {
  if (req.user!.role !== "admin_account" && req.user!.id !== req.params.id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }

  const { data, error } = await db().from("users").select("*").eq("id", req.params.id).single();
  ok(res, sanitizeUser(requireData<Record<string, unknown>>(data, error, "User not found")));
}

export async function updateUser(req: Request, res: Response) {
  const isAdmin = req.user!.role === "admin_account";
  if (!isAdmin && req.user!.id !== req.params.id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }

  const forbiddenForOwner = ["role", "is_active", "is_verified", "partner_branches_id"];
  if (!isAdmin && forbiddenForOwner.some((field) => field in req.body)) {
    throw new HttpError(403, "Only admin can update account status or role", "FORBIDDEN");
  }

  const { data, error } = await db()
    .from("users")
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select("*")
    .single();
  ok(res, sanitizeUser(requireData<Record<string, unknown>>(data, error, "User not found")), "User updated");
}

export async function deleteUser(req: Request, res: Response) {
  const { error } = await db().from("users").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", req.params.id);
  if (error) throwDbError(error);
  noContent(res);
}
