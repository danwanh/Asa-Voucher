import { useState, useCallback, useEffect } from "react"
import { ScrollText, Shield, ShieldCheck, User } from "lucide-react"
import { SubAdminLayout, type SubAdminRole, type SubAdminNavItem } from "@/layouts/admin/SubAdminLayout"
import { SystemLogsPage } from "@/pages/admin/SystemLogsPage"
import { SecurityMonitorPage } from "@/pages/admin/SecurityMonitorPage"
import { RBACManagementPage } from "@/pages/admin/RBACManagementPage"
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage"
import type { AppUser } from "@/types"

type Page = "logs" | "security" | "rbac" | "profile"

const VALID_PAGES: Page[] = ["logs", "security", "rbac", "profile"]

function getInitialPage(initialPage?: "profile"): Page {
  if (typeof window !== "undefined") {
    const tab = new URLSearchParams(window.location.search).get("tab") as Page | null
    if (tab && VALID_PAGES.includes(tab)) return tab
  }
  return initialPage ?? "logs"
}

const ROLE: SubAdminRole = {
  id: "security",
  name: "Admin Bảo mật",
  subtitle: "Nhật ký & phân quyền hệ thống",
  icon: "lock",
  accent: "#E07A5F",
  accentBg: "#FDF0EC",
  sidebarBg: "#3D2820",
}

const NAV: SubAdminNavItem[] = [
  { label: "Nhật ký hệ thống",   pg: "logs",     icon: <ScrollText className="w-4 h-4" /> },
  { label: "Giám sát bảo mật",  pg: "security", icon: <Shield className="w-4 h-4" /> },
  { label: "Phân quyền (RBAC)", pg: "rbac",     icon: <ShieldCheck className="w-4 h-4" /> },
  { label: "Hồ sơ",             pg: "profile",  icon: <User className="w-4 h-4" /> },
]

interface Props { user: AppUser; onLogout: () => void; onSwitchRole: () => void; initialPage?: "profile" }

export function SecurityAdminApp({ user, onLogout, onSwitchRole, initialPage }: Props) {
  const [page, setPage] = useState<Page>(() => getInitialPage(initialPage))

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

  return (
    <SubAdminLayout user={user} role={ROLE} page={page} navItems={NAV}
      onNavigate={handleNavigate} onLogout={onLogout} onSwitchRole={onSwitchRole}>
      {page === "logs"     && <SystemLogsPage />}
      {page === "security" && <SecurityMonitorPage />}
      {page === "rbac"     && <RBACManagementPage />}
      {page === "profile"  && <AdminProfilePage user={user} onLogout={onLogout} />}
    </SubAdminLayout>
  )
}
