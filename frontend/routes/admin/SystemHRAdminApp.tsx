import { useState } from "react"
import { Users, Store, UserCheck, User } from "lucide-react"
import { SubAdminLayout, type SubAdminRole, type SubAdminNavItem } from "@/layouts/admin/SubAdminLayout"
import { UserManagementPage } from "@/pages/admin/UserManagementPage"
import { PartnerManagementPage } from "@/pages/admin/PartnerManagementPage"
import { AdminStaffPage } from "@/pages/admin/AdminStaffPage"
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage"
import type { AppUser } from "@/types"

type Page = "users" | "partners" | "staff" | "profile"

const ROLE: SubAdminRole = {
  id: "system-hr",
  name: "System & HR Admin",
  subtitle: "Hệ thống & Nhân sự",
  emoji: "🛡️",
  accent: "#3D405B",
  accentBg: "#ECEEF5",
  sidebarBg: "#2D2F45",
}

const NAV: SubAdminNavItem[] = [
  { label: "Người dùng",   pg: "users",    icon: <Users className="w-4 h-4" /> },
  { label: "Đối tác",      pg: "partners", icon: <Store className="w-4 h-4" /> },
  { label: "Nhân viên",    pg: "staff",    icon: <UserCheck className="w-4 h-4" /> },
  { label: "Hồ sơ Admin",  pg: "profile",  icon: <User className="w-4 h-4" /> },
]

interface Props {
  user: AppUser
  onLogout: () => void
  onSwitchRole: () => void
}

export function SystemHRAdminApp({ user, onLogout, onSwitchRole }: Props) {
  const [page, setPage] = useState<Page>("users")

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
      {page === "users"    && <UserManagementPage />}
      {page === "partners" && <PartnerManagementPage />}
      {page === "staff"    && <AdminStaffPage />}
      {page === "profile"  && <AdminProfilePage user={user} onLogout={onLogout} />}
    </SubAdminLayout>
  )
}
