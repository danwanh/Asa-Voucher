import { ContentAdminApp } from "@/routes/admin/ContentAdminApp"
import { OperationsAdminApp } from "@/routes/admin/OperationsAdminApp"
import { SecurityAdminApp } from "@/routes/admin/SecurityAdminApp"
import type { AppUser } from "@/types"

interface Props {
  user: AppUser
  onLogout: () => void
}

export function AdminApp({ user, onLogout }: Props) {
  if (user.role === "admin_content") {
    return <ContentAdminApp user={user} onLogout={onLogout} onSwitchRole={onLogout} />
  }
  if (user.role === "admin_operations") {
    return <OperationsAdminApp user={user} onLogout={onLogout} onSwitchRole={onLogout} />
  }
  if (user.role === "admin_security") {
    return <SecurityAdminApp user={user} onLogout={onLogout} onSwitchRole={onLogout} />
  }
  return null
}
