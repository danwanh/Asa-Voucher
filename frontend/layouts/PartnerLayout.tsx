import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tag, GitBranch, Users, BarChart2, Bell, Building2, Settings, LogOut, Menu, ChevronRight, ScanLine } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { AppUser } from "@/types"
import type { PartnerProfile } from "@/services/partnerService"

export type PartnerPage =
  | "vouchers" | "create" | "edit" | "voucher-detail" | "revenue"
  | "branches" | "staff" | "check-voucher" | "profile" | "settings"

interface NavItem {
  label: string
  pg: PartnerPage
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { label: "Báo cáo", pg: "revenue", icon: <BarChart2 className="w-4 h-4" /> },
  { label: "Quản lý Voucher", pg: "vouchers", icon: <Tag className="w-4 h-4" /> },
  { label: "Kiểm tra Voucher", pg: "check-voucher", icon: <ScanLine className="w-4 h-4" /> },
  { label: "Chi nhánh", pg: "branches", icon: <GitBranch className="w-4 h-4" /> },
  { label: "Quản lý nhân viên", pg: "staff", icon: <Users className="w-4 h-4" /> },
  // { label: "Thông báo", pg: "notifications", icon: <Bell className="w-4 h-4" /> },
  { label: "Hồ sơ đối tác", pg: "profile", icon: <Building2 className="w-4 h-4" /> },
  // { label: "Cài đặt", pg: "settings", icon: <Settings className="w-4 h-4" /> },
]

interface Props {
  user: AppUser
  partner: PartnerProfile | null
  page: PartnerPage
  onNavigate: (p: PartnerPage) => void
  onLogout: () => void
  children: React.ReactNode
}

type SidebarProps = Omit<Props, "children"> & { onClose?: () => void }

function SidebarContent({ user, partner, page, onNavigate, onLogout, onClose }: SidebarProps) {
  const router = useRouter()
  const partnerLabel = user.role === "partner_owner" ? (user.name || user.email) : user.name
  const partnerName = partner?.businessName ?? partnerLabel
  const approvalStatus = partner?.approvalStatus
  const partnerStatus = partner?.status
  const approvalText = approvalStatus === "approved"
    ? "Đã duyệt"
    : approvalStatus === "pending"
    ? "Chờ duyệt"
    : approvalStatus === "rejected"
    ? "Bị từ chối"
    : "Chưa có hồ sơ"
  const isActive = partnerStatus === "active"
  const statusColor = approvalStatus === "approved" && isActive ? "#81B29A" : "#E07A5F"

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black" style={{ backgroundColor: C.peach, color: "white" }}>A</div>
          <div>
            <div className="font-black text-white text-sm">Asa Partner</div>
            <div className="text-xs" style={{ color: "rgba(244,241,222,0.5)" }}>Quản lý doanh nghiệp</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
           <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}><AppIcon name="gift" className="w-5 h-5 text-white" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold leading-tight text-white" style={{ overflowWrap: "anywhere" }}>{partnerName}</div>
            <div className="text-xs flex items-center gap-1" style={{ color: statusColor }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: statusColor }} />
              {approvalText}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map((n) => (
          <button
            key={n.pg}
            onClick={() => {
              onNavigate(n.pg)
              const path = n.pg === "profile" ? "/partner/profile" : `/partner/${n.pg}`
              router.push(path)
              onClose?.()
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
            style={{
              backgroundColor: page === n.pg ? C.peach : "transparent",
              color: page === n.pg ? "white" : "rgba(244,241,222,0.7)",
            }}
          >
            {n.icon}
            <span className="flex-1">{n.label}</span>
            {page === n.pg && <ChevronRight className="w-3 h-3 opacity-60" />}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold w-full hover:bg-white/10 transition-colors"
          style={{ color: "rgba(244,241,222,0.6)" }}
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  )
}

export function PartnerLayout({ user, partner, page, onNavigate, onLogout, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentLabel = NAV_ITEMS.find((n) => n.pg === page)?.label ?? ""
  const partnerLabel = user.role === "partner_owner" ? (user.name || user.email) : user.name
  const partnerName = partner?.businessName ?? partnerLabel

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-60 shrink-0 flex-col" style={{ backgroundColor: C.indigo }}>
        <SidebarContent user={user} partner={partner} page={page} onNavigate={onNavigate} onLogout={onLogout} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-60 flex flex-col" style={{ backgroundColor: C.indigo }}>
            <SidebarContent user={user} partner={partner} page={page} onNavigate={onNavigate} onLogout={onLogout} onClose={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-between px-5 bg-white shrink-0" style={{ borderColor: "#E2DFC8" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-xl hover:bg-muted">
              <Menu className="w-5 h-5" style={{ color: C.indigo }} />
            </button>
            <h1 className="font-black" style={{ color: C.indigo }}>{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/*
            <button onClick={() => onNavigate("notifications")} className="p-2 rounded-xl hover:bg-muted relative">
              <Bell className="w-5 h-5" style={{ color: "#8A8DA8" }} />
            </button>
            */}
            <div className="text-sm font-semibold" style={{ color: "#8A8DA8" }}>{partnerName}</div>
          </div>
        </header>

        <main className="flex-1 overflow-auto" style={{ backgroundColor: C.content }}>
          {children}
        </main>
      </div>
    </div>
  )
}
