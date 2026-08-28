import { usePathname } from "next/navigation"
import { FileText, Tag, MessageSquare, Shield, User } from "lucide-react"
import { SubAdminLayout, type SubAdminRole, type SubAdminNavItem } from "@/layouts/admin/SubAdminLayout"
import { ContentManagementPage } from "@/pages/admin/ContentManagementPage"
import { CategoryManagementPage } from "@/pages/admin/CategoryManagementPage"
import { FeedbackManagementPage } from "@/pages/admin/FeedbackManagementPage"
import { SystemLogsPage } from "@/pages/admin/SystemLogsPage"
import { AdminProfilePage } from "@/pages/admin/AdminProfilePage"
import type { AppUser } from "@/types"

type Page = "content" | "categories" | "feedback" | "logs" | "profile"

const ROLE: SubAdminRole = {
  id: "content-tech",
  name: "Content & Tech Admin",
  subtitle: "Nội dung & Kỹ thuật",
  icon: "toolbox",
  accent: "#81B29A",
  accentBg: "#EBF5F0",
  sidebarBg: "#253830",
}

const NAV: SubAdminNavItem[] = [
  { label: "Quản lý Nội dung",  pg: "content",    icon: <FileText className="w-4 h-4" /> },
  { label: "Danh mục",          pg: "categories", icon: <Tag className="w-4 h-4" /> },
  { label: "Phản hồi KH",       pg: "feedback",   icon: <MessageSquare className="w-4 h-4" /> },
  { label: "Nhật ký Bảo mật",   pg: "logs",       icon: <Shield className="w-4 h-4" /> },
  { label: "Hồ sơ Admin",       pg: "profile",    icon: <User className="w-4 h-4" /> },
]

interface Props {
  user: AppUser
  onLogout: () => void
  onSwitchRole: () => void
}

export function ContentTechAdminApp({ user, onLogout, onSwitchRole }: Props) {
  const pathname = usePathname()
  const page = (pathname.split("/").filter(Boolean).at(-1) as Page | undefined) ?? "content"

  return (
    <SubAdminLayout
      user={user}
      role={ROLE}
      page={page}
      navItems={NAV}
      basePath="/admin/content"
      onNavigate={() => undefined}
      onLogout={onLogout}
      onSwitchRole={onSwitchRole}
    >
      {page === "content"    && <ContentManagementPage />}
      {page === "categories" && <CategoryManagementPage />}
      {page === "feedback"   && <FeedbackManagementPage />}
      {page === "logs"       && <SystemLogsPage />}
      {page === "profile"    && <AdminProfilePage user={user} onLogout={onLogout} />}
    </SubAdminLayout>
  )
}
