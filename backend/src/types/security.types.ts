import type { SecurityAlert, User } from "@prisma/client";

export type SecurityAlertRow = SecurityAlert & {
  user: Pick<User, "id" | "full_name" | "email">;
};
