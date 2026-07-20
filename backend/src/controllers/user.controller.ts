import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/auth.js";
import { requireData, sanitizeUser, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";
import { created, noContent, ok } from "../utils/response.js";
import { rangeFromPagination } from "../validations/common.validation.js";

export async function listUsers(req: Request, res: Response) {
  const { page, limit, role, is_active: isActive } = req.query as Record<string, string | number | boolean>;
  const { from, to } = rangeFromPagination(Number(page), Number(limit));
  const where: Record<string, unknown> = {};

  if (role) where.role = role;
  if (typeof isActive === "boolean") where.is_active = isActive;

  const [data, count] = await prisma.$transaction([
    prisma.user.findMany({ where, skip: from, take: to - from + 1, orderBy: { created_at: "desc" } }),
    prisma.user.count({ where })
  ]);
  ok(res, { items: data.map((user) => sanitizeUser(user as unknown as Record<string, unknown>)), count, page, limit });
}

export async function createUserByAdmin(req: Request, res: Response) {
  const payload = { ...req.body, password_hash: await hashPassword(req.body.password) };
  delete payload.password;
  try {
    const user = await prisma.user.create({ data: payload as never });
    created(res, sanitizeUser(user as unknown as Record<string, unknown>), "User created");
  } catch (error) {
    throwDbError(error);
  }
}

export async function getUser(req: Request, res: Response) {
  if (req.user!.role !== "admin_account" && req.user!.id !== req.params.id) {
    throw new HttpError(403, "Insufficient permissions", "FORBIDDEN");
  }

  const user = requireData(await prisma.user.findUnique({ where: { id: req.params.id } }), "User not found");
  ok(res, sanitizeUser(user as unknown as Record<string, unknown>));
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

  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { ...req.body, updated_at: new Date() } as never });
    ok(res, sanitizeUser(user as unknown as Record<string, unknown>), "User updated");
  } catch (error) {
    throwDbError(error, "User not found");
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { is_active: false, updated_at: new Date() } });
  } catch (error) {
    throwDbError(error, "User not found");
  }
  noContent(res);
}
