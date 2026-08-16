import { useState } from "react"
import { useRouter } from "next/navigation"
import { Grid3x3, Home, Info, LogIn, Menu, Search, ShoppingCart, Tag, UserPlus, X } from "lucide-react"
import { AppFooter } from "@/components/AppFooter"
import { C } from "@/utils/constants"

export type GuestPage = "home" | "vouchers" | "detail" | "categories" | "about" | "contact" | "cart"

interface Props {
  page: GuestPage
  onNavigate: (p: GuestPage) => void
  onLogin: () => void
  onRegister: () => void
  cartCount?: number | null
  cartCountLoading?: boolean
  voucherSearch: string
  onVoucherSearchChange: (value: string) => void
  onVoucherSearchFocus: () => void
  children: React.ReactNode
}

const DESKTOP_NAV: { label: string; value: GuestPage; icon: React.ReactNode }[] = [
  { label: "Trang chủ", value: "home", icon: <Home className="w-4 h-4" /> },
  { label: "Voucher", value: "vouchers", icon: <Tag className="w-4 h-4" /> },
  { label: "Danh mục", value: "categories", icon: <Grid3x3 className="w-4 h-4" /> },
  { label: "Giới thiệu", value: "about", icon: <Info className="w-4 h-4" /> },
  // { label: "Liên hệ", value: "contact", icon: <Phone className="w-4 h-4" /> },
]

const MOBILE_NAV: { label: string; value: GuestPage; icon: React.ReactNode }[] = [
  { label: "Trang chủ", value: "home", icon: <Home className="w-5 h-5" /> },
  { label: "Tìm kiếm", value: "vouchers", icon: <Search className="w-5 h-5" /> },
  { label: "Giỏ hàng", value: "cart", icon: <ShoppingCart className="w-5 h-5" /> },
  { label: "Danh mục", value: "categories", icon: <Grid3x3 className="w-5 h-5" /> },
  { label: "Đăng nhập", value: "home", icon: <LogIn className="w-5 h-5" /> },
]

export function GuestLayout({
  page,
  onNavigate,
  onLogin,
  onRegister,
  cartCount = 0,
  cartCountLoading = false,
  voucherSearch,
  onVoucherSearchChange,
  onVoucherSearchFocus,
  children
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const activePage = page === "detail" ? "vouchers" : page

  return (
    <div className="min-h-screen pb-16 md:pb-0 flex flex-col" style={{ backgroundColor: C.content, fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ backgroundColor: C.indigo }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          {/* Logo */}
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: C.peach, color: "white" }}>
              A
            </div>
            <span className="font-black text-lg text-white hidden sm:block">Asa</span>
          </button>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
              <input
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "white", fontFamily: "'Inter', sans-serif" }}
                placeholder="Tìm voucher..."
                type="search"
                name="guest-voucher-search"
                autoComplete="new-password"
                value={voucherSearch}
                onFocus={onVoucherSearchFocus}
                onChange={(e) => onVoucherSearchChange(e.target.value)}
              />
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {DESKTOP_NAV.map((n) => (
              <button
                key={n.value}
                onClick={() => onNavigate(n.value)}
                className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
                style={{
                  color: activePage === n.value ? C.apricot : "rgba(244,241,222,0.75)",
                  backgroundColor: activePage === n.value ? "rgba(255,255,255,0.1)" : "transparent",
                }}
              >
                {n.icon}{n.label}
              </button>
            ))}
          </nav>

          {/* Auth buttons + cart */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigate("cart")}
              className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
              aria-label="Giỏ hàng"
            >
              <ShoppingCart className="w-5 h-5 text-white" />
              {cartCount !== null && cartCount > 0 ? (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ backgroundColor: C.peach }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </button>
            <button
              onClick={onLogin}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
              style={{ color: "rgba(244,241,222,0.8)" }}
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden lg:inline">Đăng nhập</span>
            </button>
            <button
              onClick={onRegister}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: C.peach }}
            >
              <UserPlus className="w-4 h-4" />
              Đăng ký
            </button>
            <button className="md:hidden p-2 rounded-xl hover:bg-white/10" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t px-4 py-3 flex flex-wrap gap-2" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: C.indigo }}>
            {DESKTOP_NAV.map((n) => (
              <button
                key={n.value}
                onClick={() => { onNavigate(n.value); setMobileOpen(false) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: activePage === n.value ? C.peach : "rgba(255,255,255,0.1)", color: "white" }}
              >
                {n.icon}{n.label}
              </button>
            ))}
            <button onClick={() => { onLogin(); setMobileOpen(false) }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white" }}>
              <LogIn className="w-4 h-4" /> Đăng nhập
            </button>
            <button onClick={() => { onRegister(); setMobileOpen(false) }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: C.peach }}>
              <UserPlus className="w-4 h-4" /> Đăng ký
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1" style={{ backgroundColor: C.content }}>{children}</main>

      <AppFooter
        onHome={() => onNavigate("home")}
        onVouchers={() => onNavigate("vouchers")}
        onCategories={() => onNavigate("categories")}
        onSupport={() => onNavigate("contact")}
        onRegisterPartner={onRegister}
        onTerms={() => router.push("/terms")}
        onPolicy={() => router.push("/policy")}
        onPrivacy={() => router.push("/privacy")}
      />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 border-t" style={{ backgroundColor: "white", borderColor: "#E2DFC8" }}>
        {MOBILE_NAV.map((n) => {
          const isLogin = n.label === "Đăng nhập"
          const isActive = !isLogin && (activePage === n.value || (n.value === "vouchers" && page === "detail"))
          const showBadge = n.value === "cart" && cartCount !== null && cartCount > 0
          return (
            <button
              key={`${n.label}-${n.value}`}
              onClick={() => {
                if (isLogin) {
                  onLogin()
                  return
                }
                onNavigate(n.value)
              }}
              className="flex flex-col items-center gap-0.5 px-3 py-2 relative"
              style={{ color: isActive ? C.peach : "#8A8DA8" }}
            >
              <div className="relative">
                {n.icon}
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: C.peach, color: "white", fontSize: "10px" }}>
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold">{n.label}</span>
              {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: C.peach }} />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
