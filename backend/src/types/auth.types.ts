export type AppRole =
  | "buyer"
  | "partner_owner"
  | "partner_voucher_staff"
  | "partner_store_staff"
  | "admin_content"
  | "admin_account"
  | "admin_security";

export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  /** Đối tác trực thuộc: dùng cho partner_owner, partner_voucher_staff */
  partnerId?: string | null;
  /** Chi nhánh làm việc: dùng cho partner_store_staff */
  branchId?: string | null;
}

export const ADMIN_ROLES: AppRole[] = ["admin_content", "admin_account", "admin_security"];
export const PARTNER_STAFF_ROLES: AppRole[] = [
  "partner_owner",
  "partner_voucher_staff",
  "partner_store_staff",
];

export function isAdminRole(role: AppRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export type UserRole = AppRole;
export const adminRoles = ADMIN_ROLES;
export const partnerStaffRoles = PARTNER_STAFF_ROLES;
