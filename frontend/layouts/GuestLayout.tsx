import { useRouter } from "next/navigation"
import { Grid3x3, Home, Info, LogIn, Search, ShoppingCart, Tag } from "lucide-react"
import { AppFooter } from "@/components/AppFooter"
import { GuestSiteHeader } from "@/components/GuestSiteHeader"
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
  const router = useRouter()
  const activePage = page === "detail" ? "vouchers" : page

  return (
    <div className="min-h-screen pb-16 md:pb-0 flex flex-col" style={{ backgroundColor: C.content, fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <GuestSiteHeader
        active={activePage}
        navItems={DESKTOP_NAV.map((n) => ({ label: n.label, id: n.value, onClick: () => onNavigate(n.value) }))}
        cartCount={cartCount}
        cartOnClick={() => onNavigate("cart")}
        loginOnClick={onLogin}
        registerOnClick={onRegister}
        searchValue={voucherSearch}
        onSearchChange={onVoucherSearchChange}
        onSearchFocus={onVoucherSearchFocus}
      />

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
