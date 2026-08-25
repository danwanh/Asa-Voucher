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
}

export function AdminApp({ user, onLogout, initialPage }: Props) {
  if (user.role === "admin_content") {
    return <ContentAdminApp user={user} onLogout={onLogout} onSwitchRole={onLogout} initialPage={initialPage} />
  }
  if (user.role === "admin_operations") {
    return <OperationsAdminApp user={user} onLogout={onLogout} onSwitchRole={onLogout} initialPage={initialPage} />
  }
  if (user.role === "admin_security") {
    return <SecurityAdminApp user={user} onLogout={onLogout} onSwitchRole={onLogout} initialPage={initialPage} />
  }
  return null
}
