import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Store, ShoppingBag, User, MessageSquare } from "lucide-react"
import { SubAdminLayout, type SubAdminRole, type SubAdminNavItem } from "@/layouts/admin/SubAdminLayout"
import { AdminOperationsDashboardPage } from "@/pages/admin/AdminOperationsDashboardPage"
import { UserManagementPage } from "@/pages/admin/UserManagementPage"
import { PartnerManagementPage } from "@/pages/admin/PartnerManagementPage"
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage"
import { AdminComplaintsPage } from "@/pages/admin/AdminComplaintsPage"
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage"
import type { AppUser } from "@/types"

type Page = "dashboard" | "users" | "partners" | "orders" | "complaints" | "profile"

const VALID_PAGES: Page[] = ["dashboard", "users", "partners", "orders", "complaints", "profile"]

function pageFromPath(pathname: string, fallback: Page): Page {
  const segment = pathname.split("/").filter(Boolean).at(-1) as Page | undefined
  return segment && VALID_PAGES.includes(segment) ? segment : fallback
}

const ROLE: SubAdminRole = {
   id: "operations",
   name: "Admin Vận hành",
  subtitle: "Quản lý người dùng, đối tác & đơn hàng",
  icon: "user",
  accent: "#3D405B",
  accentBg: "#ECEEF5",
  sidebarBg: "#2D2F45",
}

interface Props { user: AppUser; onLogout: () => void; onSwitchRole: () => void; initialPage?: Page }

export function OperationsAdminApp({ user, onLogout, onSwitchRole, initialPage }: Props) {
  const pathname = usePathname()
  const page = pageFromPath(pathname, initialPage ?? "dashboard")

  const navItems: SubAdminNavItem[] = [
    { label: "Dashboard",     pg: "dashboard",  icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Người dùng",   pg: "users",      icon: <Users className="w-4 h-4" /> },
    { label: "Đối tác",      pg: "partners",   icon: <Store className="w-4 h-4" /> },
    { label: "Đơn hàng",     pg: "orders",     icon: <ShoppingBag className="w-4 h-4" /> },
    { label: "Khiếu nại",    pg: "complaints", icon: <MessageSquare className="w-4 h-4" /> },
    { label: "Hồ sơ",        pg: "profile",    icon: <User className="w-4 h-4" /> },
  ]

  return (
    <SubAdminLayout user={user} role={ROLE} page={page} navItems={navItems} basePath="/admin/operations"
      onNavigate={() => undefined} onLogout={onLogout} onSwitchRole={onSwitchRole}>
      {page === "dashboard"  && <AdminOperationsDashboardPage />}
      {page === "users"      && <UserManagementPage />}
      {page === "partners"   && <PartnerManagementPage />}
      {page === "orders"     && <AdminOrdersPage />}
      {page === "complaints" && <AdminComplaintsPage />}
      {page === "profile"    && <AdminProfilePage user={user} onLogout={onLogout} />}
    </SubAdminLayout>
  )
}
