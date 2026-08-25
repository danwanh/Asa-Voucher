import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { StaffLayout, type StaffPage } from "@/layouts/StaffLayout"
import type { AppUser } from "@/types"
import { LoadingState } from "@/components/LoadingState"

const pageLoading = () => <LoadingState label="Đang tải trang..." variant="page" />
const StaffDashboardPage = dynamic(() => import("@/pages/staff/StaffDashboardPage").then((module) => module.StaffDashboardPage), { loading: pageLoading })
const VerifyVoucherPage = dynamic(() => import("@/pages/staff/VerifyVoucherPage").then((module) => module.VerifyVoucherPage), { loading: pageLoading })
const VerificationHistoryPage = dynamic(() => import("@/pages/staff/VerificationHistoryPage").then((module) => module.VerificationHistoryPage), { loading: pageLoading })
const StaffProfilePage = dynamic(() => import("@/pages/staff/StaffProfilePage").then((module) => module.StaffProfilePage), { loading: pageLoading })

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
