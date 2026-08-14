import { useState } from "react"
import { useRouter } from "next/navigation"
import { Menu, X, Tag, ShoppingCart } from "lucide-react"
import { C } from "@/utils/constants"

export type GuestPage = "home" | "vouchers" | "detail" | "categories" | "about" | "contact" | "cart"

interface Props {
  page: GuestPage
  onNavigate: (p: GuestPage) => void
  onLogin: () => void
  onRegister: () => void
  cartCount?: number | null
  cartCountLoading?: boolean
  children: React.ReactNode
}

const NAV = [
  { label: "Trang chủ", value: "home" as GuestPage },
  { label: "Voucher", value: "vouchers" as GuestPage },
  { label: "Danh mục", value: "categories" as GuestPage },
  { label: "Giới thiệu", value: "about" as GuestPage },
  { label: "Liên hệ", value: "contact" as GuestPage },
]

export function GuestLayout({ page, onNavigate, onLogin, onRegister, cartCount = 0, cartCountLoading = false, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.content, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-sm border-b border-black/5" style={{ backgroundColor: "rgba(244,241,222,0.96)", backdropFilter: "blur(8px)" }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 font-black text-xl"
            style={{ fontFamily: "'Nunito', sans-serif", color: C.indigo }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: C.peach }}>
              <Tag className="w-4 h-4 text-white" />
            </div>
            <span>ASA Voucher</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <button
                key={n.value}
                onClick={() => onNavigate(n.value)}
                className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  color: page === n.value ? C.peach : C.indigo,
                  backgroundColor: page === n.value ? `${C.peach}18` : "transparent",
                }}
              >
                {n.label}
              </button>
            ))}
          </nav>

          {/* Auth buttons + cart */}
          <div className="hidden md:flex items-center gap-2">
            {/* Cart badge */}
            <button
              onClick={() => router.push("/cart")}
              className="relative p-2 rounded-xl hover:bg-black/5 transition-colors"
              title="Giỏ hàng"
            >
              <ShoppingCart className="w-5 h-5" style={{ color: C.indigo }} />
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
              className="px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all hover:shadow-sm"
              style={{ borderColor: C.indigo, color: C.indigo }}
            >
              Đăng nhập
            </button>
            <button
              onClick={onRegister}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: C.peach }}
            >
              Đăng ký
            </button>
          </div>

          {/* Mobile: cart badge + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => router.push("/cart")}
              className="relative p-2 rounded-lg"
            >
              <ShoppingCart className="w-5 h-5" style={{ color: C.indigo }} />
              {cartCount !== null && cartCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: C.peach, fontSize: 10 }}>
                  {cartCount}
                </span>
              ) : null}
            </button>
            <button className="p-2 rounded-lg" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" style={{ color: C.indigo }} /> : <Menu className="w-5 h-5" style={{ color: C.indigo }} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-black/5 py-3 px-4 flex flex-col gap-1" style={{ backgroundColor: "white" }}>
            {NAV.map((n) => (
              <button
                key={n.value}
                onClick={() => { onNavigate(n.value); setMobileOpen(false) }}
                className="text-left px-3 py-2.5 rounded-xl text-sm font-semibold"
                style={{ color: page === n.value ? C.peach : C.indigo, backgroundColor: page === n.value ? `${C.peach}18` : "transparent" }}
              >
                {n.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2 border-t border-black/5 mt-1">
              <button onClick={onLogin} className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2" style={{ borderColor: C.indigo, color: C.indigo }}>
                Đăng nhập
              </button>
              <button onClick={onRegister} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: C.peach }}>
                Đăng ký
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1" style={{ backgroundColor: C.content }}>{children}</main>

      {/* Footer */}
      <footer className="border-t border-black/8 py-12" style={{ backgroundColor: C.indigo }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 font-black text-lg mb-3" style={{ fontFamily: "'Nunito', sans-serif", color: "white" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.peach }}>
                  <Tag className="w-3.5 h-3.5 text-white" />
                </div>
                ASA Voucher
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                Nền tảng mua bán voucher điện tử hàng đầu Việt Nam. Tiết kiệm thông minh, trải nghiệm đỉnh cao.
              </p>
            </div>
            {[
              { title: "Sản phẩm", links: ["Ẩm thực", "Làm đẹp", "Du lịch", "Giải trí", "Thể thao"] },
              { title: "Hỗ trợ", links: ["Trung tâm trợ giúp", "Liên hệ", "Chính sách hoàn tiền", "Điều khoản dịch vụ"] },
              { title: "Doanh nghiệp", links: ["Đăng ký đối tác", "Bảng giá", "API tích hợp", "Tài liệu"] },
            ].map((col) => (
              <div key={col.title}>
                <div className="font-bold text-sm mb-3" style={{ color: "rgba(255,255,255,0.9)" }}>{col.title}</div>
                {col.links.map((l) => (
                  <div key={l} className="text-sm py-0.5 cursor-pointer hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>© 2026 ASA Voucher. Tất cả quyền được bảo lưu.</p>
            <div className="flex gap-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span className="cursor-pointer hover:text-white">Chính sách</span>
              <span className="cursor-pointer hover:text-white">Bảo mật</span>
              <span className="cursor-pointer hover:text-white">Cookie</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
