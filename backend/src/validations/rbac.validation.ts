import { z } from "zod";

export const createRoleSchema = z.object({
  key: z.string().min(2).max(50),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().optional(),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const updatePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;

export const idParamSchema = z.object({
  id: z.string().uuid(),
});
