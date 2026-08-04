import { useState } from "react"
import { LayoutDashboard, FileText, Tag, User } from "lucide-react"
import { SubAdminLayout, type SubAdminRole, type SubAdminNavItem } from "@/layouts/admin/SubAdminLayout"
import { AdminContentDashboardPage } from "@/pages/admin/AdminContentDashboardPage"
import { ContentManagementPage } from "@/pages/admin/ContentManagementPage"
import { VoucherApprovalPage } from "@/pages/admin/VoucherApprovalPage"
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage"
import { VOUCHERS } from "@/data/mock"
import type { AppUser } from "@/types"

type Page = "dashboard" | "content" | "approval" | "profile"

const ROLE: SubAdminRole = {
  id: "content",
  name: "Admin Nội dung",
  subtitle: "Quản lý nội dung & duyệt voucher",
  icon: "document",
  accent: "#81B29A",
  accentBg: "#EBF5F0",
  sidebarBg: "#253830",
}

interface Props { user: AppUser; onLogout: () => void; onSwitchRole: () => void; initialPage?: "profile" }

export function ContentAdminApp({ user, onLogout, onSwitchRole, initialPage }: Props) {
  const [page, setPage] = useState<Page>(initialPage ?? "dashboard")
  const pendingCount = VOUCHERS.filter((v) => v.status === "pending").length

  const NAV: SubAdminNavItem[] = [
    { label: "Dashboard",         pg: "dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Quản lý Nội dung",  pg: "content",   icon: <FileText className="w-4 h-4" /> },
    { label: "Duyệt Voucher",     pg: "approval",  icon: <Tag className="w-4 h-4" />, badge: pendingCount },
    { label: "Hồ sơ",             pg: "profile",   icon: <User className="w-4 h-4" /> },
  ]

  return (
    <SubAdminLayout user={user} role={ROLE} page={page} navItems={NAV}
      onNavigate={(pg) => setPage(pg as Page)} onLogout={onLogout} onSwitchRole={onSwitchRole}>
      {page === "dashboard" && <AdminContentDashboardPage />}
      {page === "content"   && <ContentManagementPage />}
      {page === "approval"  && <VoucherApprovalPage />}
      {page === "profile"   && <AdminProfilePage user={user} onLogout={onLogout} />}
    </SubAdminLayout>
  )
}
