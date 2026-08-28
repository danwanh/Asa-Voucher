import { usePathname } from "next/navigation"
import { ScrollText, Shield, User } from "lucide-react"
import { SubAdminLayout, type SubAdminRole, type SubAdminNavItem } from "@/layouts/admin/SubAdminLayout"
import { SystemLogsPage } from "@/pages/admin/SystemLogsPage"
import { SecurityMonitorPage } from "@/pages/admin/SecurityMonitorPage"
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage"
import type { AppUser } from "@/types"

type Page = "logs" | "security" | "profile"

const VALID_PAGES: Page[] = ["logs", "security", "profile"]

function pageFromPath(pathname: string, fallback: Page): Page {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 2 && segments[1] === "security") return "logs"
  const segment = segments.at(-1) as Page | undefined
  return segment && VALID_PAGES.includes(segment) ? segment : fallback
}

const ROLE: SubAdminRole = {
  id: "security",
  name: "Admin Bảo mật",
  subtitle: "Nhật ký & giám sát bảo mật",
  icon: "lock",
  accent: "#E07A5F",
  accentBg: "#FDF0EC",
  sidebarBg: "#3D2820",
}

const NAV: SubAdminNavItem[] = [
  { label: "Nhật ký hệ thống",   pg: "logs",     icon: <ScrollText className="w-4 h-4" /> },
  { label: "Giám sát bảo mật",  pg: "security", icon: <Shield className="w-4 h-4" /> },
  { label: "Hồ sơ",             pg: "profile",  icon: <User className="w-4 h-4" /> },
]

interface Props { user: AppUser; onLogout: () => void; onSwitchRole: () => void; initialPage?: Page }

export function SecurityAdminApp({ user, onLogout, onSwitchRole, initialPage }: Props) {
  const pathname = usePathname()
  const page = pageFromPath(pathname, initialPage ?? "logs")

  return (
    <SubAdminLayout user={user} role={ROLE} page={page} navItems={NAV} basePath="/admin/security"
      onNavigate={() => undefined} onLogout={onLogout} onSwitchRole={onSwitchRole}>
      {page === "logs"     && <SystemLogsPage />}
      {page === "security" && <SecurityMonitorPage />}
      {page === "profile"  && <AdminProfilePage user={user} onLogout={onLogout} />}
    </SubAdminLayout>
  )
}
