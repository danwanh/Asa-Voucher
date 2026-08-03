import { useState } from "react"
import { LogOut, Menu, X, ChevronRight, ArrowLeft, Tag } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { AppUser } from "@/types"

export interface SubAdminNavItem {
  label: string
  pg: string
  icon: React.ReactNode
  badge?: number
}

export interface SubAdminRole {
  id: string
  name: string
  subtitle: string
  icon: string
  accent: string
  accentBg: string
  sidebarBg: string
}

interface Props {
  user: AppUser
  role: SubAdminRole
  page: string
  navItems: SubAdminNavItem[]
  onNavigate: (pg: string) => void
  onLogout: () => void
  onSwitchRole: () => void
  children: React.ReactNode
}

export function SubAdminLayout({ user, role, page, navItems, onNavigate, onLogout, onSwitchRole, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const pageLabel = navItems.find((n) => n.pg === page)?.label ?? "—"

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: role.sidebarBg }}>
      {/* Logo + role badge */}
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.09)" }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: role.accent }}>
            <Tag className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-white text-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>ASA Admin</span>
        </div>

        {/* Role badge */}
        <div className="px-3 py-2.5 rounded-2xl border" style={{ backgroundColor: `${role.accent}20`, borderColor: `${role.accent}40` }}>
           <AppIcon name={role.icon} className="w-5 h-5 mb-1 text-white" />
          <div className="font-black text-xs leading-tight" style={{ color: "white", fontFamily: "'Nunito', sans-serif" }}>{role.name}</div>
          <div className="text-xs mt-0.5 opacity-70" style={{ color: "white" }}>{role.subtitle}</div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
            style={{ backgroundColor: role.accent, color: "white" }}
          >
            {user.name[0]}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{user.name}</div>
            <div className="text-xs truncate opacity-50 text-white">{user.email}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((n) => {
          const active = page === n.pg
          return (
            <button
              key={n.pg}
              onClick={() => { onNavigate(n.pg); setMobileOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
              style={{
                backgroundColor: active ? role.accent : "transparent",
                color: active ? "white" : "rgba(255,255,255,0.62)",
              }}
            >
              <span className="flex-shrink-0">{n.icon}</span>
              <span className="flex-1 truncate">{n.label}</span>
              {n.badge != null && n.badge > 0 && (
                <span
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-black flex-shrink-0"
                  style={{ backgroundColor: C.apricot, color: C.indigo }}
                >
                  {n.badge}
                </span>
              )}
              {active && !n.badge && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />}
            </button>
          )
        })}
      </nav>

      {/* Footer actions */}
      <div className="p-3 border-t space-y-1" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <button
          onClick={onSwitchRole}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Đổi vai trò
        </button>
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
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-60 flex flex-col">
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header
          className="flex items-center justify-between px-5 h-14 flex-shrink-0 border-b"
          style={{ backgroundColor: "white", borderColor: "#F0EDD8" }}
        >
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5 rounded-lg" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" style={{ color: C.indigo }} /> : <Menu className="w-5 h-5" style={{ color: C.indigo }} />}
            </button>
            {/* Role frame label */}
            <div className="flex items-center gap-2">
               <AppIcon name={role.icon} className="w-4 h-4" />
              <div>
                <span className="text-xs font-semibold opacity-60" style={{ color: C.indigo }}>{role.name}</span>
                <span className="hidden sm:inline text-xs opacity-40 mx-2" style={{ color: C.indigo }}>›</span>
                <span className="hidden sm:inline font-black text-sm" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{pageLabel}</span>
              </div>
            </div>
          </div>

          {/* Role indicator pill */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
            style={{ backgroundColor: role.accentBg, color: role.accent, borderColor: `${role.accent}30` }}
          >
             <AppIcon name={role.icon} className="w-3.5 h-3.5" />
            <span>{role.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: C.content }}>
          {children}
        </main>
      </div>
    </div>
  )
}
