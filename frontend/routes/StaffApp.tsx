import { useState } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { StaffLayout, type StaffPage } from "@/layouts/StaffLayout"
import type { AppUser } from "@/types"
import { LoadingState } from "@/components/LoadingState"

const pageLoading = () => <LoadingState label="Đang tải trang..." variant="page" />
const StaffDashboardPage = dynamic(() => import("@/pages/staff/StaffDashboardPage").then((module) => module.StaffDashboardPage), { loading: pageLoading })
const VerifyVoucherPage = dynamic(() => import("@/pages/staff/VerifyVoucherPage").then((module) => module.VerifyVoucherPage), { loading: pageLoading })
const VerificationHistoryPage = dynamic(() => import("@/pages/staff/VerificationHistoryPage").then((module) => module.VerificationHistoryPage), { loading: pageLoading })
const StaffProfilePage = dynamic(() => import("@/pages/staff/StaffProfilePage").then((module) => module.StaffProfilePage), { loading: pageLoading })

function staffPageFromPath(pathname: string, fallback: StaffPage = "dashboard"): StaffPage {
  const last = pathname.split("/").filter(Boolean).at(-1)
  if (last === "profile") return "profile"
  if (last === "verify" || last === "qr-scan") return "qr-scan"
  if (last === "history") return "history"
  if (last === "dashboard") return "dashboard"
  return fallback
}

interface Props {
  user: AppUser
  onLogout: () => void
  initialPage?: StaffPage
  initialCode?: string
}

export function StaffApp({ user, onLogout, initialPage, initialCode = "" }: Props) {
  const pathname = usePathname()
  const page = staffPageFromPath(pathname, initialCode ? "qr-scan" : (initialPage ?? "dashboard"))
  const [pendingCode] = useState(initialCode)

  return (
    <StaffLayout user={user} page={page} onNavigate={() => undefined} onLogout={onLogout}>
      {page === "dashboard" && <StaffDashboardPage />}
      {page === "qr-scan" && <VerifyVoucherPage initialCode={pendingCode} branchId={user.branchId} />}
      {page === "history" && <VerificationHistoryPage />}
      {page === "profile" && <StaffProfilePage user={user} onLogout={onLogout} />}
    </StaffLayout>
  )
}
