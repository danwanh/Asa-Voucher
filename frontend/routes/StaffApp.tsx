import { useState } from "react"
import { StaffLayout, type StaffPage } from "@/layouts/StaffLayout"
import { StaffDashboardPage } from "@/pages/staff/StaffDashboardPage"
import { VerifyVoucherPage } from "@/pages/staff/VerifyVoucherPage"
import { QRScanPage } from "@/pages/staff/QRScanPage"
import { VerificationHistoryPage } from "@/pages/staff/VerificationHistoryPage"
import { StaffProfilePage } from "@/pages/staff/StaffProfilePage"
import { StaffNotificationsPage } from "@/pages/staff/StaffNotificationsPage"
import type { AppUser } from "@/types"

interface Props {
  user: AppUser
  onLogout: () => void
  initialPage?: "profile" | "verify"
  initialCode?: string
}

export function StaffApp({ user, onLogout, initialPage, initialCode = "" }: Props) {
  const [page, setPage] = useState<StaffPage>(initialPage ?? "dashboard")
  const [pendingCode, setPendingCode] = useState(initialCode)

  const handleQRFound = (code: string) => {
    setPendingCode(code)
    setPage("verify")
  }

  return (
    <StaffLayout user={user} page={page} onNavigate={setPage} onLogout={onLogout}>
      {page === "dashboard" && <StaffDashboardPage />}
      {page === "verify" && <VerifyVoucherPage initialCode={pendingCode} branchId={user.branchId} />}
      {page === "qr-scan" && <QRScanPage onVoucherFound={handleQRFound} />}
      {page === "history" && <VerificationHistoryPage />}
      {page === "notifications" && <StaffNotificationsPage />}
      {page === "profile" && <StaffProfilePage user={user} onLogout={onLogout} />}
    </StaffLayout>
  )
}
