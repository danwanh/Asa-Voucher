import { useState } from "react"
import { useRouter } from "next/navigation"
import { Home, Users, Store, Package, FileText, LogOut, Menu, BadgeCheck, Grid3x3, MessageSquare, BarChart2, ChevronRight } from "lucide-react"
import { C } from "@/utils/constants"
import type { AppUser } from "@/types"

export type AdminPage =
  | "dashboard" | "users" | "partners" | "staff" | "approval"
  | "orders" | "categories" | "reports" | "feedback" | "logs" | "profile"

interface NavItem {
  label: string
  pg: AdminPage
  icon: React.ReactNode
  badge?: number
}

interface Props {
  user: AppUser
  page: AdminPage
  pendingVouchers: number
  onNavigate: (p: AdminPage) => void
  onLogout: () => void
  children: React.ReactNode
}

function SidebarContent({ user, page, pendingVouchers, onNavigate, onLogout, onClose }: Omit<Props, "children"> & { onClose?: () => void }) {
  const router = useRouter()
  const navItems: NavItem[] = [
    { label: "Tổng quan", pg: "dashboard", icon: <Home className="w-4 h-4" /> },
    { label: "Người dùng", pg: "users", icon: <Users className="w-4 h-4" /> },
    { label: "Doanh nghiệp", pg: "partners", icon: <Store className="w-4 h-4" /> },
    { label: "Nhân viên", pg: "staff", icon: <Users className="w-4 h-4" /> },
    { label: "Duyệt Voucher", pg: "approval", icon: <BadgeCheck className="w-4 h-4" />, badge: pendingVouchers },
    { label: "Đơn hàng", pg: "orders", icon: <Package className="w-4 h-4" /> },
    { label: "Danh mục", pg: "categories", icon: <Grid3x3 className="w-4 h-4" /> },
    { label: "Báo cáo", pg: "reports", icon: <BarChart2 className="w-4 h-4" /> },
    { label: "Phản hồi", pg: "feedback", icon: <MessageSquare className="w-4 h-4" /> },
    { label: "Nhật ký", pg: "logs", icon: <FileText className="w-4 h-4" /> },
    { label: "Hồ sơ", pg: "profile", icon: <Users className="w-4 h-4" /> },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3 mb-4">
          <img src="/logo.png" alt="Asa" className="h-8 object-contain" />
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: C.peach, color: "white" }}>{user.name[0]}</div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{user.name}</div>
            <div className="text-xs truncate" style={{ color: "rgba(244,241,222,0.5)" }}>{user.email}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((n) => (
          <button
            key={n.pg}
            onClick={() => { onNavigate(n.pg); router.push(`/admin/${n.pg}`); onClose?.() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
            style={{ backgroundColor: page === n.pg ? C.peach : "transparent", color: page === n.pg ? "white" : "rgba(244,241,222,0.7)" }}
          >
            {n.icon}
            <span className="flex-1">{n.label}</span>
            {n.badge != null && n.badge > 0 && (
              <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold" style={{ backgroundColor: C.apricot, color: C.indigo }}>{n.badge}</span>
            )}
            {page === n.pg && !n.badge && <ChevronRight className="w-3 h-3 opacity-60" />}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold w-full hover:bg-white/10" style={{ color: "rgba(244,241,222,0.6)" }}>
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>
    </div>
  )
}

export function AdminLayout({ user, page, pendingVouchers, onNavigate, onLogout, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const PAGE_LABELS: Record<AdminPage, string> = {
    dashboard: "Tổng quan", users: "Quản lý người dùng", partners: "Quản lý doanh nghiệp",
    staff: "Quản lý nhân viên", approval: "Duyệt Voucher", orders: "Quản lý đơn hàng",
    categories: "Quản lý danh mục", reports: "Báo cáo hệ thống", feedback: "Phản hồi", logs: "Nhật ký hệ thống", profile: "Hồ sơ Admin",
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div className="hidden md:flex w-56 shrink-0 flex-col" style={{ backgroundColor: C.indigo }}>
        <SidebarContent user={user} page={page} pendingVouchers={pendingVouchers} onNavigate={onNavigate} onLogout={onLogout} />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 flex flex-col" style={{ backgroundColor: C.indigo }}>
            <SidebarContent user={user} page={page} pendingVouchers={pendingVouchers} onNavigate={onNavigate} onLogout={onLogout} onClose={() => setMobileOpen(false)} />
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
            <h1 className="font-black" style={{ color: C.indigo }}>{PAGE_LABELS[page]}</h1>
          </div>
          <div className="text-sm font-semibold" style={{ color: "#8A8DA8" }}>{new Date().toLocaleDateString("vi-VN")}</div>
        </header>

        <main className="flex-1 overflow-auto" style={{ backgroundColor: C.content }}>
          {children}
        </main>
      </div>
    </div>
  )
}
