import { useState, useEffect } from "react"
import { StaffLayout, type StaffPage } from "@/layouts/StaffLayout"
import { StaffDashboardPage } from "@/pages/staff/StaffDashboardPage"
import { VerifyVoucherPage } from "@/pages/staff/VerifyVoucherPage"
import { VerificationHistoryPage } from "@/pages/staff/VerificationHistoryPage"
import { StaffProfilePage } from "@/pages/staff/StaffProfilePage"
import type { AppUser } from "@/types"

interface Props {
  user: AppUser
  onLogout: () => void
  initialPage?: "profile"
  initialCode?: string
}

export function StaffApp({ user, onLogout, initialPage, initialCode = "" }: Props) {
  const [page, setPage] = useState<StaffPage>(initialCode ? "qr-scan" : (initialPage ?? "dashboard"))
  const [pendingCode, setPendingCode] = useState(initialCode)

  useEffect(() => {
    if (pendingCode) setPendingCode("")
  }, [pendingCode])

  return (
    <StaffLayout user={user} page={page} onNavigate={setPage} onLogout={onLogout}>
      {page === "dashboard" && <StaffDashboardPage />}
      {page === "qr-scan" && <VerifyVoucherPage initialCode={pendingCode} branchId={user.branchId} />}
      {page === "history" && <VerificationHistoryPage />}
      {page === "profile" && <StaffProfilePage user={user} onLogout={onLogout} />}
    </StaffLayout>
  )
}