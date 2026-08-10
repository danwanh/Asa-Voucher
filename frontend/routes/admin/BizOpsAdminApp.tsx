import { useState } from "react"
import { BarChart2, Tag, ShoppingBag, User } from "lucide-react"
import { SubAdminLayout, type SubAdminRole, type SubAdminNavItem } from "@/layouts/admin/SubAdminLayout"
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage"
import { VoucherApprovalPage } from "@/pages/admin/VoucherApprovalPage"
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage"
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage"
import type { AppUser } from "@/types"

type Page = "dashboard" | "approval" | "orders" | "profile"

const ROLE: SubAdminRole = {
  id: "biz-ops",
  name: "Business Operations Admin",
  subtitle: "Vận hành Kinh doanh",
  icon: "dashboard",
  accent: "#E07A5F",
  accentBg: "#FDF0EC",
  sidebarBg: "#3D2820",
}

const NAV: SubAdminNavItem[] = [
  { label: "Dashboard TC",    pg: "dashboard", icon: <BarChart2 className="w-4 h-4" /> },
  { label: "Duyệt Voucher",   pg: "approval",  icon: <Tag className="w-4 h-4" /> },
  { label: "Quản lý Đơn",     pg: "orders",    icon: <ShoppingBag className="w-4 h-4" /> },
  { label: "Hồ sơ Admin",     pg: "profile",   icon: <User className="w-4 h-4" /> },
]

interface Props {
  user: AppUser
  onLogout: () => void
  onSwitchRole: () => void
}

export function BizOpsAdminApp({ user, onLogout, onSwitchRole }: Props) {
  const [page, setPage] = useState<Page>("dashboard")

  return (
    <SubAdminLayout
      user={user}
      role={ROLE}
      page={page}
      navItems={NAV}
      onNavigate={(pg) => setPage(pg as Page)}
      onLogout={onLogout}
      onSwitchRole={onSwitchRole}
    >
      {page === "dashboard" && <AdminDashboardPage />}
      {page === "approval"  && <VoucherApprovalPage />}
      {page === "orders"    && <AdminOrdersPage />}
      {page === "profile"   && <AdminProfilePage user={user} onLogout={onLogout} />}
    </SubAdminLayout>
  )
}
