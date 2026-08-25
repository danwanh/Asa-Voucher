import dynamic from "next/dynamic"
import type { AppUser } from "@/types"
import { LoadingState } from "@/components/LoadingState"

const pageLoading = () => <LoadingState label="Đang tải khu vực quản trị..." variant="page" />
const ContentAdminApp = dynamic(() => import("@/routes/admin/ContentAdminApp").then((module) => module.ContentAdminApp), { loading: pageLoading })
const OperationsAdminApp = dynamic(() => import("@/routes/admin/OperationsAdminApp").then((module) => module.OperationsAdminApp), { loading: pageLoading })
const SecurityAdminApp = dynamic(() => import("@/routes/admin/SecurityAdminApp").then((module) => module.SecurityAdminApp), { loading: pageLoading })

interface Props {
  user: AppUser
  onLogout: () => void
  initialPage?: "profile"
  routePath?: string
}

function pageFromRoute(routePath: string | undefined, role: AppUser["role"]) {
  const segment = routePath?.split("/").filter(Boolean).at(-1)
  if (role === "admin_content") {
    if (segment === "content" || segment === "categories" || segment === "approval" || segment === "profile") return segment
    return "dashboard"
  }
  if (role === "admin_operations") {
    if (segment === "users" || segment === "partners" || segment === "orders" || segment === "profile") return segment
    return "dashboard"
  }
  if (segment === "security" || segment === "profile") return segment
  return "logs"
}

export function AdminApp({ user, onLogout, initialPage, routePath }: Props) {
  const routePage = pageFromRoute(routePath, user.role)
  if (user.role === "admin_content") {
    return <ContentAdminApp user={user} onLogout={onLogout} onSwitchRole={onLogout} initialPage={initialPage ? "profile" : routePage as "dashboard" | "content" | "categories" | "approval" | "profile"} />
  }
  if (user.role === "admin_operations") {
    return <OperationsAdminApp user={user} onLogout={onLogout} onSwitchRole={onLogout} initialPage={initialPage ? "profile" : routePage as "dashboard" | "users" | "partners" | "orders" | "profile"} />
  }
  if (user.role === "admin_security") {
    return <SecurityAdminApp user={user} onLogout={onLogout} onSwitchRole={onLogout} initialPage={initialPage ? "profile" : routePage as "logs" | "security" | "profile"} />
  }
  return null
}
