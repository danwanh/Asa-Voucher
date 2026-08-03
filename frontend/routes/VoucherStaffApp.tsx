import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tag, PlusCircle, BarChart2, User, LogOut, Menu, ChevronRight } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { PartnerVouchersPage } from "@/pages/partner/PartnerVouchersPage"
import { CreateVoucherPage } from "@/pages/partner/CreateVoucherPage"
import { EditVoucherPage } from "@/pages/partner/EditVoucherPage"
import { PartnerVoucherDetailPage } from "@/pages/partner/PartnerVoucherDetailPage"
import { PartnerRevenuePage } from "@/pages/partner/PartnerRevenuePage"
import { StaffProfilePage } from "@/pages/staff/StaffProfilePage"
import type { AppUser, Voucher } from "@/types"

type Page = "vouchers" | "create" | "edit" | "voucher-detail" | "reports" | "profile"

interface Props {
  user: AppUser
  onLogout: () => void
  initialPage?: "profile"
}

const NAV = [
  { label: "Quản lý Voucher",  pg: "vouchers" as Page, icon: <Tag className="w-4 h-4" /> },
  { label: "Tạo voucher mới",  pg: "create" as Page,   icon: <PlusCircle className="w-4 h-4" /> },
  { label: "Hiệu suất của tôi", pg: "reports" as Page,  icon: <BarChart2 className="w-4 h-4" /> },
  { label: "Hồ sơ cá nhân",    pg: "profile" as Page,   icon: <User className="w-4 h-4" /> },
]

const PAGE_LABELS: Record<Page, string> = {
  vouchers: "Quản lý Voucher",
  create: "Tạo Voucher mới",
  edit: "Chỉnh sửa Voucher",
  "voucher-detail": "Chi tiết Voucher",
  reports: "Hiệu suất của tôi",
  profile: "Hồ sơ cá nhân",
}

export function VoucherStaffApp({ user, onLogout, initialPage }: Props) {
  const router = useRouter()
  const [page, setPage] = useState<Page>(initialPage ?? "vouchers")
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const goEdit   = (v: Voucher) => { setSelectedVoucher(v); setPage("edit") }
  const goDetail = (v: Voucher) => { setSelectedVoucher(v); setPage("voucher-detail") }

  const ACCENT = "#81B29A"
  const SIDEBAR_BG = "#253830"

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
          const active = page === n.pg
          return (
            <button
              key={n.pg}
              onClick={() => { n.pg === "profile" ? router.push(`/${user.role}/profile`) : setPage(n.pg); setMobileOpen(false) }}
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
            <PartnerVouchersPage onCreateNew={() => setPage("create")} onEdit={goEdit} onDetail={goDetail} />
          )}
          {page === "create" && <CreateVoucherPage onBack={() => setPage("vouchers")} />}
          {page === "edit" && selectedVoucher && (
            <EditVoucherPage voucher={selectedVoucher} onBack={() => setPage("vouchers")} onSave={(v) => setSelectedVoucher(v)} />
          )}
          {page === "voucher-detail" && selectedVoucher && (
            <PartnerVoucherDetailPage voucher={selectedVoucher} onBack={() => setPage("vouchers")} onEdit={goEdit} />
          )}
          {page === "reports" && <PartnerRevenuePage />}
          {page === "profile" && <StaffProfilePage user={user} onLogout={onLogout} />}
        </main>
      </div>
    </div>
  )
}
