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
    if (role === "partner_voucher_staff") return "/voucher-staff/profile"
    if (role === "partner_store_staff") return "/staff/profile"
    if (role.startsWith("admin_")) return "/admin/profile"
    return "/profile"
  }
  return CUSTOMER_ROUTE_PATHS[page]
}
