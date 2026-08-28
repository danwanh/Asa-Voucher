import { useState } from "react"
import { useRouter } from "next/navigation"
import { Home, QrCode, History, User, LogOut, Menu, ChevronRight, Scan } from "lucide-react"
import { C } from "@/utils/constants"
import type { AppUser } from "@/types"

export type StaffPage = "dashboard" | "qr-scan" | "history" | "profile"

const NAV_ITEMS = [
  { label: "Tổng quan", pg: "dashboard" as StaffPage, icon: <Home className="w-4 h-4" /> },
  { label: "Quét QR Code", pg: "qr-scan" as StaffPage, icon: <Scan className="w-4 h-4" /> },
  { label: "Lịch sử xác nhận", pg: "history" as StaffPage, icon: <History className="w-4 h-4" /> },
  // { label: "Thông báo", pg: "notifications" as StaffPage, icon: <Bell className="w-4 h-4" /> },
  { label: "Hồ sơ cá nhân", pg: "profile" as StaffPage, icon: <User className="w-4 h-4" /> },
]

interface Props {
  user: AppUser
  page: StaffPage
  onNavigate: (p: StaffPage) => void
  onLogout: () => void
  children: React.ReactNode
}

function SidebarContent({ user, page, onNavigate, onLogout, onClose }: Omit<Props, "children"> & { onClose?: () => void }) {
  const router = useRouter()
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3 mb-5">
          <img src="/logo.png" alt="Asa" className="h-8 object-contain" />
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black" style={{ backgroundColor: C.apricot + "30", color: C.apricot }}>
            {user.name[0]}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{user.name}</div>
            <div className="text-xs break-words" style={{ color: "rgba(244,241,222,0.5)" }}>{user.branchName ?? "Chưa gán chi nhánh"}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map((n) => (
          <button
            key={n.pg}
            onClick={() => { onNavigate(n.pg); router.push(`/partner/${n.pg === "qr-scan" ? "verify" : n.pg}`); onClose?.() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
            style={{
              backgroundColor: page === n.pg ? C.apricot : "transparent",
              color: page === n.pg ? C.indigo : "rgba(244,241,222,0.7)",
            }}
          >
            {n.icon}
            <span className="flex-1">{n.label}</span>
            {page === n.pg && <ChevronRight className="w-3 h-3 opacity-60" />}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold w-full hover:bg-white/10 transition-colors" style={{ color: "rgba(244,241,222,0.6)" }}>
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>
    </div>
  )
}

export function StaffLayout({ user, page, onNavigate, onLogout, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentLabel = NAV_ITEMS.find((n) => n.pg === page)?.label ?? ""

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div className="hidden md:flex w-56 shrink-0 flex-col" style={{ backgroundColor: C.indigo }}>
        <SidebarContent user={user} page={page} onNavigate={onNavigate} onLogout={onLogout} />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 flex flex-col" style={{ backgroundColor: C.indigo }}>
            <SidebarContent user={user} page={page} onNavigate={onNavigate} onLogout={onLogout} onClose={() => setMobileOpen(false)} />
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
            {/* <h1 className="font-black" style={{ color: C.indigo }}>{currentLabel}</h1> */}
          </div>
          <div className="text-sm font-semibold" style={{ color: "#8A8DA8" }}>{user.name}</div>
        </header>
        <main className="flex-1 overflow-auto" style={{ backgroundColor: C.content }}>
          {children}
        </main>
      </div>
    </div>
  )
}
