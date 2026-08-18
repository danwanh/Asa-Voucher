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
  if (page === "profile" && role) return `/${role}/profile`
  return CUSTOMER_ROUTE_PATHS[page]
}
