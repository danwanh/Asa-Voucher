import { useState, useEffect, useCallback } from "react"
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

  const handleNavigate = useCallback((pg: string) => {
    setPage(pg as Page)
    if (pg === "profile") return
    const url = new URL(window.location.href)
    url.searchParams.set("tab", pg)
    window.history.replaceState({}, "", url.toString())
  }, [])

  useEffect(() => {
    if (initialPage === "profile") setPage("profile")
  }, [initialPage])

  useEffect(() => {
    function onPopState() {
      const tab = new URLSearchParams(window.location.search).get("tab") as Page | null
      if (tab && VALID_PAGES.includes(tab)) setPage(tab)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const navItems: SubAdminNavItem[] = [
    { label: "Dashboard",     pg: "dashboard",  icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Người dùng",   pg: "users",      icon: <Users className="w-4 h-4" /> },
    { label: "Đối tác",      pg: "partners",   icon: <Store className="w-4 h-4" /> },
    { label: "Đơn hàng",     pg: "orders",     icon: <ShoppingBag className="w-4 h-4" /> },
    { label: "Khiếu nại",    pg: "complaints", icon: <MessageSquare className="w-4 h-4" /> },
    { label: "Hồ sơ",        pg: "profile",    icon: <User className="w-4 h-4" /> },
  ]

  return (
    <SubAdminLayout user={user} role={ROLE} page={page} navItems={navItems}
      onNavigate={handleNavigate} onLogout={onLogout} onSwitchRole={onSwitchRole}>
      {page === "dashboard"  && <AdminOperationsDashboardPage />}
      {page === "users"      && <UserManagementPage />}
      {page === "partners"   && <PartnerManagementPage />}
      {page === "orders"     && <AdminOrdersPage />}
      {page === "complaints" && <AdminComplaintsPage />}
      {page === "profile"    && <AdminProfilePage user={user} onLogout={onLogout} />}
    </SubAdminLayout>
  )
}
