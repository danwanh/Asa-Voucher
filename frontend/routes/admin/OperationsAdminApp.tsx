import { useState } from "react"
import { LayoutDashboard, Users, Store, ShoppingBag, User } from "lucide-react"
import { SubAdminLayout, type SubAdminRole, type SubAdminNavItem } from "@/layouts/admin/SubAdminLayout"
import { AdminOperationsDashboardPage } from "@/pages/admin/AdminOperationsDashboardPage"
import { UserManagementPage } from "@/pages/admin/UserManagementPage"
import { PartnerManagementPage } from "@/pages/admin/PartnerManagementPage"
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage"
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage"
import type { AppUser } from "@/types"

type Page = "dashboard" | "users" | "partners" | "orders" | "profile"

const ROLE: SubAdminRole = {
   id: "operations",
   name: "Admin Vận hành",
  subtitle: "Quản lý người dùng, đối tác & đơn hàng",
  icon: "user",
  accent: "#3D405B",
  accentBg: "#ECEEF5",
  sidebarBg: "#2D2F45",
}

const NAV: SubAdminNavItem[] = [
  { label: "Dashboard",     pg: "dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Người dùng",   pg: "users",     icon: <Users className="w-4 h-4" /> },
  { label: "Đối tác",      pg: "partners",  icon: <Store className="w-4 h-4" /> },
  { label: "Đơn hàng",     pg: "orders",    icon: <ShoppingBag className="w-4 h-4" /> },
  { label: "Hồ sơ",        pg: "profile",   icon: <User className="w-4 h-4" /> },
]

interface Props { user: AppUser; onLogout: () => void; onSwitchRole: () => void; initialPage?: "profile" }

export function OperationsAdminApp({ user, onLogout, onSwitchRole, initialPage }: Props) {
  const [page, setPage] = useState<Page>(initialPage ?? "dashboard")

  return (
    <SubAdminLayout user={user} role={ROLE} page={page} navItems={NAV}
      onNavigate={(pg) => setPage(pg as Page)} onLogout={onLogout} onSwitchRole={onSwitchRole}>
      {page === "dashboard" && <AdminOperationsDashboardPage />}
      {page === "users"     && <UserManagementPage />}
      {page === "partners"  && <PartnerManagementPage />}
      {page === "orders"    && <AdminOrdersPage />}
      {page === "profile"   && <AdminProfilePage user={user} onLogout={onLogout} />}
    </SubAdminLayout>
  )
}
