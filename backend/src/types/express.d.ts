import type { UserRole } from "./role.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        partnerId?: string;
        branchId?: string;
      };
    }
  }
}

export {};
