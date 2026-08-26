import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Search, Menu, Home, Tag, Package, User, Grid3x3, Gift, LogOut } from "lucide-react"
import { AppFooter } from "@/components/AppFooter"
import { C } from "@/utils/constants"
import type { AppUser } from "@/types"

export type CustomerPage =
  | "home" | "vouchers" | "categories" | "detail" | "cart"
  | "checkout" | "create-order" | "payment" | "success"
  | "my-vouchers" | "orders" | "order-detail"
  | "review" | "complaint" | "profile" | "favorites" | "settings"

interface Props {
  user: AppUser
  page: CustomerPage
  cartCount: number | null
  cartCountLoading?: boolean
  voucherSearch: string
  onVoucherSearchChange: (value: string) => void
  onVoucherSearchFocus: () => void
  onNavigate: (p: CustomerPage) => void
  onLogout: () => void
  children: React.ReactNode
}

const DESKTOP_NAV: { label: string; pg: CustomerPage; icon: React.ReactNode }[] = [
  { label: "Trang chủ", pg: "home", icon: <Home className="w-4 h-4" /> },
  { label: "Voucher", pg: "vouchers", icon: <Tag className="w-4 h-4" /> },
  { label: "Voucher của tôi", pg: "my-vouchers", icon: <Gift className="w-4 h-4" /> },
  { label: "Danh mục", pg: "categories", icon: <Grid3x3 className="w-4 h-4" /> },
  { label: "Lịch sử đơn hàng", pg: "orders", icon: <Package className="w-4 h-4" /> },
  { label: "Hồ sơ", pg: "profile", icon: <User className="w-4 h-4" /> },
]

const MOBILE_NAV: { label: string; pg: CustomerPage; icon: React.ReactNode }[] = [
  { label: "Trang chủ", pg: "home", icon: <Home className="w-5 h-5" /> },
  { label: "Tìm kiếm", pg: "vouchers", icon: <Search className="w-5 h-5" /> },
  { label: "Giỏ hàng", pg: "cart", icon: <ShoppingCart className="w-5 h-5" /> },
  { label: "Tài khoản", pg: "profile", icon: <User className="w-5 h-5" /> },
]

export function CustomerLayout({
  user,
  page,
  cartCount,
  cartCountLoading = false,
  voucherSearch,
  onVoucherSearchChange,
  onVoucherSearchFocus,
  onNavigate,
  onLogout,
  children
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const likelyRoutes = page === "payment" || page === "success"
      ? ["/orders", "/my-vouchers"]
      : page === "home" || page === "vouchers"
        ? ["/cart", "/orders"]
        : ["/vouchers"]
    const timer = window.setTimeout(() => likelyRoutes.forEach((path) => router.prefetch(path)), 1000)
    return () => window.clearTimeout(timer)
  }, [page, router])

  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0" style={{ backgroundColor: C.content, fontFamily: "'Nunito', sans-serif" }}>
      <header className="sticky top-0 z-50 shadow-sm" style={{ backgroundColor: C.indigo }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          {/* Logo */}
          <button onClick={() => onNavigate("home")} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: C.peach, color: "white" }}>A</div>
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
                name="voucher-search"
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
                key={n.pg}
                onClick={() => onNavigate(n.pg)}
                className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
                style={{
                  color: page === n.pg ? C.apricot : "rgba(244,241,222,0.75)",
                  backgroundColor: page === n.pg ? "rgba(255,255,255,0.1)" : "transparent",
                }}
              >
                {n.icon}{n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            {/* Cart */}
            <button onClick={() => onNavigate("cart")} className="relative p-2 rounded-xl hover:bg-white/10">
              <ShoppingCart className="w-5 h-5 text-white" />
              {cartCount !== null && cartCount > 0 ? (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: C.peach, color: "white" }}>
                  {cartCount}
                </span>
              ) : null}
            </button>

            {/* Logout — visible in header */}
            <button
              onClick={onLogout}
              title="Đăng xuất"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
              style={{ color: "rgba(244,241,222,0.8)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Đăng xuất</span>
            </button>

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-xl hover:bg-white/10">
              <Menu className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Mobile full nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t px-4 py-3 flex flex-wrap gap-2" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: C.indigo }}>
            {DESKTOP_NAV.map((n) => (
              <button
                key={n.pg}
                onClick={() => {
                  onNavigate(n.pg)
                  setMobileOpen(false)
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: page === n.pg ? C.peach : "rgba(255,255,255,0.1)", color: "white" }}
              >
                {n.icon}{n.label}
              </button>
            ))}
            <button
              onClick={() => { onLogout(); setMobileOpen(false) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white" }}
            >
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>
      <AppFooter
        onHome={() => onNavigate("home")}
        onVouchers={() => onNavigate("vouchers")}
        onCategories={() => onNavigate("categories")}
        onSupport={() => window.location.assign("mailto:support@asavoucher.vn")}
        onRegisterPartner={() => router.push("/signup")}
        onTerms={() => router.push("/terms")}
        onPolicy={() => router.push("/policy")}
        onPrivacy={() => router.push("/privacy")}
      />
      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 border-t" style={{ backgroundColor: "white", borderColor: "#E2DFC8" }}>
        {MOBILE_NAV.map((n) => {
          const isActive = page === n.pg || (n.pg === "vouchers" && page === "detail")
          const showBadge = n.pg === "cart" && cartCount !== null && cartCount > 0
          return (
            <button
              key={n.pg}
              onClick={() => {
                onNavigate(n.pg)
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
