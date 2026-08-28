import type { Role } from "@/types"

export function getRoleLandingPath(role: Role) {
  switch (role) {
    case "admin_content":
      return "/admin/content"
    case "admin_operations":
      return "/admin/operations"
    case "admin_security":
      return "/admin/security"
    case "partner_owner":
    case "partner_voucher_staff":
    case "partner_store_staff":
      return "/partner"
    case "buyer":
    default:
      return "/"
  }
}
