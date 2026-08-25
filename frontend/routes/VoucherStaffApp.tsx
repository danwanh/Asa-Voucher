import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { usePathname, useRouter } from "next/navigation"
import { Tag, PlusCircle, BarChart3, ScanLine, User, LogOut, Menu, ChevronRight } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { AppUser, Voucher } from "@/types"
import { LoadingState } from "@/components/LoadingState"
import { voucherService } from "@/services/voucherService"

const pageLoading = () => <LoadingState label="Đang tải trang..." variant="page" />
const PartnerVouchersPage = dynamic(() => import("@/pages/partner/PartnerVouchersPage").then((module) => module.PartnerVouchersPage), { loading: pageLoading })
const CreateVoucherPage = dynamic(() => import("@/pages/partner/CreateVoucherPage").then((module) => module.CreateVoucherPage), { loading: pageLoading })
const EditVoucherPage = dynamic(() => import("@/pages/partner/EditVoucherPage").then((module) => module.EditVoucherPage), { loading: pageLoading })
const PartnerVoucherDetailPage = dynamic(() => import("@/pages/partner/PartnerVoucherDetailPage").then((module) => module.PartnerVoucherDetailPage), { loading: pageLoading })
const PartnerRevenuePage = dynamic(() => import("@/pages/partner/PartnerRevenuePage").then((module) => module.PartnerRevenuePage), { loading: pageLoading })
const StaffProfilePage = dynamic(() => import("@/pages/staff/StaffProfilePage").then((module) => module.StaffProfilePage), { loading: pageLoading })
const StaffVoucherReportPage = dynamic(() => import("@/pages/staff/StaffVoucherReportPage").then((module) => module.StaffVoucherReportPage), { loading: pageLoading })
const StaffCheckVoucherPage = dynamic(() => import("@/pages/staff/StaffCheckVoucherPage").then((module) => module.StaffCheckVoucherPage), { loading: pageLoading })

export type VoucherStaffPage = "vouchers" | "create" | "edit" | "voucher-detail" | "reports" | "staff-reports" | "check-voucher" | "profile"
type Page = VoucherStaffPage

function voucherStaffPageFromPath(pathname: string, fallback: VoucherStaffPage = "vouchers"): VoucherStaffPage {
  const segments = pathname.split("/").filter(Boolean)
  const last = segments.at(-1)
  if (last === "profile") return "profile"
  if (last === "new" || last === "create") return "create"
  if (segments[1] === "vouchers" && segments.length >= 3) return last === "edit" ? "edit" : "voucher-detail"
  if (last === "vouchers") return "vouchers"
  if (last === "reports") return "staff-reports"
  if (last === "check-voucher") return "check-voucher"
  return fallback
}

function voucherIdFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const voucherId = segments[1] === "vouchers" ? segments[2] : undefined
  return voucherId && !["new", "create", "edit", "detail"].includes(voucherId) ? voucherId : undefined
}

interface Props {
  user: AppUser
  onLogout: () => void
  initialPage?: VoucherStaffPage
  initialVoucherId?: string
}

const NAV = [
  { label: "Quản lý Voucher",    pg: "vouchers" as Page, icon: <Tag className="w-4 h-4" /> },
  { label: "Tạo voucher mới",    pg: "create" as Page,   icon: <PlusCircle className="w-4 h-4" /> },
  { label: "Kiểm tra Voucher",   pg: "check-voucher" as Page, icon: <ScanLine className="w-4 h-4" /> },
  { label: "Báo cáo Voucher",    pg: "staff-reports" as Page, icon: <BarChart3 className="w-4 h-4" /> },
  { label: "Hồ sơ cá nhân",      pg: "profile" as Page,  icon: <User className="w-4 h-4" /> },
]

const PAGE_LABELS: Record<Page, string> = {
  vouchers: "Quản lý Voucher",
  create: "Tạo Voucher mới",
  edit: "Chỉnh sửa Voucher",
  "voucher-detail": "Chi tiết Voucher",
  reports: "Hiệu suất của tôi",
  "staff-reports": "Báo cáo hiệu suất Voucher",
  "check-voucher": "Kiểm tra Voucher",
  profile: "Hồ sơ cá nhân",
}

function activeNavPageFor(page: Page): Page {
  if (page === "edit" || page === "voucher-detail") return "vouchers"
  if (page === "reports") return "staff-reports"
  return page
}

function locksPriceAndQuantityFor(voucher?: Voucher | null) {
  return voucher?.status === "active" || voucher?.status === "selling"
}

export function VoucherStaffApp({ user, onLogout, initialPage, initialVoucherId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const page = voucherStaffPageFromPath(pathname, initialPage ?? "vouchers")
  const activeNavPage = activeNavPageFor(page)
  const routeVoucherId = voucherIdFromPath(pathname)
  const effectiveVoucherId = routeVoucherId ?? initialVoucherId
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [isVoucherLoading, setIsVoucherLoading] = useState(false)
  const [voucherLoadError, setVoucherLoadError] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!effectiveVoucherId) {
      setIsVoucherLoading(false)
      setVoucherLoadError(null)
      return
    }

    let isMounted = true
    setIsVoucherLoading(true)
    setVoucherLoadError(null)
    void voucherService.getDetail(effectiveVoucherId)
      .then((detail) => {
        if (!isMounted) return
        setSelectedVoucher(detail.voucher)
      })
      .catch(async () => {
        try {
          const manageDetail = await voucherService.getManageDetail(effectiveVoucherId)
          if (!isMounted) return
          setSelectedVoucher(manageDetail.voucher)
        } catch {
          if (!isMounted) return
          setSelectedVoucher(null)
          setVoucherLoadError("Không thể tải chi tiết voucher.")
        }
      })
      .finally(() => {
        if (isMounted) setIsVoucherLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [effectiveVoucherId])

  useEffect(() => {
    if (page === "edit" && selectedVoucher && ["rejected", "expired", "locked", "sold_out"].includes(selectedVoucher.status)) {
      router.replace(`/voucher-staff/vouchers/${selectedVoucher.id}`)
    }
  }, [page, router, selectedVoucher])

  const goEdit = (v: Voucher) => {
    setSelectedVoucher(v)
    const nextPage = ["rejected", "expired", "locked", "sold_out"].includes(v.status) ? "voucher-detail" : "edit"
    router.push(`/voucher-staff/vouchers/${v.id}/${nextPage === "edit" ? "edit" : ""}`.replace(/\/$/, ""))
  }
  const goDetail = (v: Voucher) => {
    setSelectedVoucher(v)
    router.push(`/voucher-staff/vouchers/${v.id}`)
  }

  const ACCENT = "#81B29A"
  const SIDEBAR_BG = "#253830"

  const voucherRouteFallback = (
    <div className="p-6">
      {isVoucherLoading ? (
        <LoadingState label="Đang tải chi tiết voucher..." variant="page" />
      ) : (
        <div className="rounded-xl border bg-white p-5 text-sm" style={{ borderColor: "#F0EDD8", color: "#C0392B" }}>
          {voucherLoadError ?? "Không tìm thấy voucher."}
        </div>
      )}
    </div>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: SIDEBAR_BG }}>
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: ACCENT, color: "white" }}>A</div>
          <span className="font-black text-white text-sm">Asa Vouchers</span>
        </div>
        {/* Role badge */}
        <div className="px-3 py-2.5 rounded-2xl border" style={{ backgroundColor: `${ACCENT}20`, borderColor: `${ACCENT}40` }}>
           <AppIcon name="tag" className="w-5 h-5 mb-1 text-white" />
          <div className="font-black text-xs text-white leading-tight">Nhân viên Tạo Voucher</div>
          <div className="text-xs mt-0.5 opacity-70 text-white">Tạo & quản lý voucher</div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0" style={{ backgroundColor: ACCENT, color: "white" }}>
            {user.name[0]}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{user.name}</div>
            <div className="text-xs truncate opacity-50 text-white">{user.email}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map((n) => {
          const active = activeNavPage === n.pg
          return (
            <button
              key={n.pg}
              onClick={() => { router.push(`/voucher-staff/${n.pg === "profile" ? "profile" : n.pg}`); setMobileOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
              style={{
                backgroundColor: active ? ACCENT : "transparent",
                color: active ? "white" : "rgba(255,255,255,0.62)",
              }}
            >
              <span className="flex-shrink-0">{n.icon}</span>
              <span className="flex-1 truncate">{n.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />}
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-60 flex flex-col"><SidebarContent /></div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-between px-5 bg-white flex-shrink-0" style={{ borderColor: "#F0EDD8" }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5 rounded-lg" onClick={() => setMobileOpen(!mobileOpen)}>
              <Menu className="w-5 h-5" style={{ color: C.indigo }} />
            </button>
            <div className="flex items-center gap-2">
              <AppIcon name="tag" className="w-4 h-4" />
              <div>
                <span className="text-xs font-semibold opacity-60" style={{ color: C.indigo }}>Nhân viên Tạo Voucher</span>
                <span className="hidden sm:inline text-xs opacity-40 mx-2" style={{ color: C.indigo }}>›</span>
                <span className="hidden sm:inline font-black text-sm" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{PAGE_LABELS[page]}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border" style={{ backgroundColor: `${ACCENT}18`, color: ACCENT, borderColor: `${ACCENT}30` }}>
            <AppIcon name="tag" className="w-4 h-4" /> NV Tạo Voucher
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: C.content }}>
          {page === "vouchers" && (
            <PartnerVouchersPage onCreateNew={() => router.push("/voucher-staff/vouchers/new")} onEdit={goEdit} onDetail={goDetail} />
          )}
          {page === "create" && <CreateVoucherPage onBack={() => router.push("/voucher-staff/vouchers")} onSaveDraft={() => router.push("/voucher-staff/vouchers")} />}
          {page === "edit" && (
            selectedVoucher ? (
              <EditVoucherPage
                voucher={selectedVoucher}
                lockPriceAndQuantity={locksPriceAndQuantityFor(selectedVoucher)}
                onBack={() => router.push("/voucher-staff/vouchers")}
                onSave={(v) => setSelectedVoucher(v)}
              />
            ) : voucherRouteFallback
          )}
          {page === "voucher-detail" && (
            selectedVoucher ? (
              <PartnerVoucherDetailPage voucher={selectedVoucher} onBack={() => router.push("/voucher-staff/vouchers")} onEdit={goEdit} />
            ) : voucherRouteFallback
          )}
          {page === "reports" && <PartnerRevenuePage />}
          {page === "staff-reports" && <StaffVoucherReportPage/>}
          {page === "check-voucher" && <StaffCheckVoucherPage branchId={user.branchId} />}
          {page === "profile" && <StaffProfilePage user={user} onLogout={onLogout} />}
        </main>
      </div>
    </div>
  )
}
