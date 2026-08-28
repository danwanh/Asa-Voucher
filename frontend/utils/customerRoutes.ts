import type { CustomerPage } from "@/layouts/CustomerLayout"
import type { Role } from "@/types"

const CUSTOMER_ROUTE_PATHS: Partial<Record<CustomerPage, string>> = {
  home: "/",
  vouchers: "/vouchers",
  categories: "/categories",
  cart: "/cart",
  orders: "/orders",
  "my-vouchers": "/my-vouchers",
  settings: "/settings",
  favorites: "/favorites",
}

export function customerPagePath(page: CustomerPage, role?: Role) {
  if (page === "profile" && role) {
    if (role === "partner_owner") return "/partner/profile"
    if (role === "partner_voucher_staff" || role === "partner_store_staff") return "/partner/profile"
    if (role === "admin_content") return "/admin/content/profile"
    if (role === "admin_operations") return "/admin/operations/profile"
    if (role === "admin_security") return "/admin/security/profile"
    return "/profile"
  }
  return CUSTOMER_ROUTE_PATHS[page]
}
