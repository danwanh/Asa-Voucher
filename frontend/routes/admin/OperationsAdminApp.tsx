import { useState, useEffect, useCallback } from "react"
import { LayoutDashboard, Users, Store, ShoppingBag, AlertTriangle, User } from "lucide-react"
import { SubAdminLayout, type SubAdminRole, type SubAdminNavItem } from "@/layouts/admin/SubAdminLayout"
import { AdminOperationsDashboardPage } from "@/pages/admin/AdminOperationsDashboardPage"
import { UserManagementPage } from "@/pages/admin/UserManagementPage"
import { PartnerManagementPage } from "@/pages/admin/PartnerManagementPage"
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage"
import { AdminComplaintManagementPage } from "@/pages/admin/AdminComplaintManagementPage"
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage"
import { feedbackService } from "@/services/feedbackService"
import type { AppUser } from "@/types"

type Page = "dashboard" | "users" | "partners" | "orders" | "complaints" | "profile"

const VALID_PAGES: Page[] = ["dashboard", "users", "partners", "orders", "complaints", "profile"]

function getInitialPage(initialPage?: "profile"): Page {
  if (typeof window !== "undefined") {
    const tab = new URLSearchParams(window.location.search).get("tab") as Page | null
    if (tab && VALID_PAGES.includes(tab)) return tab
  }
  return initialPage ?? "dashboard"
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

interface Props { user: AppUser; onLogout: () => void; onSwitchRole: () => void; initialPage?: "profile" }

export function OperationsAdminApp({ user, onLogout, onSwitchRole, initialPage }: Props) {
  const [page, setPage] = useState<Page>(() => getInitialPage(initialPage))
  const [complaintBadge, setComplaintBadge] = useState(0)

  const handleNavigate = useCallback((pg: string) => {
    setPage(pg as Page)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", pg)
    window.history.replaceState({}, "", url.toString())
  }, [])

  useEffect(() => {
    function onPopState() {
      const tab = new URLSearchParams(window.location.search).get("tab") as Page | null
      if (tab && VALID_PAGES.includes(tab)) setPage(tab)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const fetchComplaintBadge = useCallback(async () => {
    try {
      const result = await feedbackService.listComplaints({ status: "open", limit: 100 })
      setComplaintBadge(result.total)
    } catch {}
  }, [])

  useEffect(() => {
    fetchComplaintBadge()
    const interval = setInterval(fetchComplaintBadge, 30000)
    const onVisibility = () => { if (!document.hidden) fetchComplaintBadge() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility) }
  }, [fetchComplaintBadge])

  const navWithBadge: SubAdminNavItem[] = [
    { label: "Dashboard",     pg: "dashboard",  icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Người dùng",   pg: "users",      icon: <Users className="w-4 h-4" /> },
    { label: "Đối tác",      pg: "partners",   icon: <Store className="w-4 h-4" /> },
    { label: "Đơn hàng",     pg: "orders",     icon: <ShoppingBag className="w-4 h-4" /> },
    { label: "Khiếu nại",    pg: "complaints", icon: <AlertTriangle className="w-4 h-4" />, badge: complaintBadge || undefined },
    { label: "Hồ sơ",        pg: "profile",    icon: <User className="w-4 h-4" /> },
  ]

  return (
    <SubAdminLayout user={user} role={ROLE} page={page} navItems={navWithBadge}
      onNavigate={handleNavigate} onLogout={onLogout} onSwitchRole={onSwitchRole}>
      {page === "dashboard"  && <AdminOperationsDashboardPage />}
      {page === "users"      && <UserManagementPage />}
      {page === "partners"   && <PartnerManagementPage />}
      {page === "orders"     && <AdminOrdersPage />}
      {page === "complaints" && <AdminComplaintManagementPage />}
      {page === "profile"    && <AdminProfilePage user={user} onLogout={onLogout} />}
    </SubAdminLayout>
  )
}
