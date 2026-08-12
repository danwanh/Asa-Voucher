import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../utils/response.js";
import { HttpError } from "../utils/http-error.js";
import * as rbacService from "../services/rbac.service.js";
import {
  createRoleSchema,
  updateRoleSchema,
  updatePermissionsSchema,
} from "../validations/rbac.validation.js";

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}

export async function listRoles(req: Request, res: Response) {
  const roles = await rbacService.listRoles(requireUser(req));
  sendSuccess(res, roles);
}

export async function getRole(req: Request, res: Response) {
  const role = await rbacService.getRole(requireUser(req), req.params.id);
  sendSuccess(res, role);
}

export async function createRole(req: Request, res: Response) {
  const input = createRoleSchema.parse(req.body);
  const role = await rbacService.createRole(requireUser(req), input);
  sendCreated(res, role, "Tạo vai trò thành công");
}

export async function updateRole(req: Request, res: Response) {
  const input = updateRoleSchema.parse(req.body);
  const role = await rbacService.updateRole(requireUser(req), req.params.id, input);
  sendSuccess(res, role, "Cập nhật vai trò thành công");
}

export async function deleteRole(req: Request, res: Response) {
  await rbacService.deleteRole(requireUser(req), req.params.id);
  sendSuccess(res, { success: true }, "Đã xóa vai trò");
}

export async function listPermissions(req: Request, res: Response) {
  const permissions = await rbacService.listPermissions(requireUser(req));
  sendSuccess(res, permissions);
}

export async function updateRolePermissions(req: Request, res: Response) {
  const input = updatePermissionsSchema.parse(req.body);
  const role = await rbacService.updateRolePermissions(requireUser(req), req.params.id, input);
  sendSuccess(res, role, "Cập nhật quyền thành công");
}
