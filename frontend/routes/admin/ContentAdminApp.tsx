import { useEffect, useState } from "react"
import { LayoutDashboard, FileText, Tag, User } from "lucide-react"
import { SubAdminLayout, type SubAdminRole, type SubAdminNavItem } from "@/layouts/admin/SubAdminLayout"
import { AdminContentDashboardPage } from "@/pages/admin/AdminContentDashboardPage"
import { ContentManagementPage } from "@/pages/admin/ContentManagementPage"
import { VoucherApprovalPage } from "@/pages/admin/VoucherApprovalPage"
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage"
import type { AppUser } from "@/types"
import { voucherService } from "@/services/voucherService"

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
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadPendingCount() {
      try {
        const items = await voucherService.listPublicVouchers({ limit: 100 })
        if (!isMounted) return
        setPendingCount(items.filter((voucher) => voucher.status === "pending").length)
      } catch {
        if (!isMounted) return
        setPendingCount(0)
      }
    }

    loadPendingCount()
    return () => {
      isMounted = false
    }
  }, [])

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
