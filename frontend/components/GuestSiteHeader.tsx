"use client"

import { useState } from "react"
import { Grid3x3, Home, LogIn, Menu, Search, ShoppingCart, Tag, UserPlus, X } from "lucide-react"
import { C } from "@/utils/constants"

export type GuestNavItem = {
  label: string
  id: string
  onClick: () => void
}

interface Props {
  active: string
  navItems: GuestNavItem[]
  cartCount?: number | null
  cartOnClick?: () => void
  loginOnClick?: () => void
  registerOnClick?: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  onSearchFocus?: () => void
  onSearchSubmit?: (value: string) => void
}

export function GuestSiteHeader({
  active,
  navItems,
  cartCount,
  cartOnClick,
  loginOnClick,
  registerOnClick,
  searchValue,
  onSearchChange,
  onSearchFocus,
  onSearchSubmit,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [internalSearch, setInternalSearch] = useState("")

  const search = onSearchChange ? searchValue ?? "" : internalSearch
  const changeSearch = onSearchChange ?? setInternalSearch
  const submitSearch = onSearchSubmit

  return (
    <header className="sticky top-0 z-50 shadow-sm" style={{ backgroundColor: C.indigo }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <button onClick={navItems.find((n) => n.id === "home")?.onClick} className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.png" alt="Asa Voucher" className="w-8 h-8 rounded-xl object-contain" />
          <span className="font-black text-lg text-white hidden sm:block">Asa Voucher</span>
        </button>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault()
              submitSearch?.(search)
            }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "white", fontFamily: "'Inter', sans-serif" }}
              placeholder="Tìm voucher..."
              type="search"
              name="guest-voucher-search"
              autoComplete="new-password"
              value={search}
              onFocus={onSearchFocus}
              onChange={(e) => changeSearch(e.target.value)}
            />
          </form>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={n.onClick}
              className="px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
              style={{
                color: active === n.id ? C.apricot : "rgba(244,241,222,0.75)",
                backgroundColor: active === n.id ? "rgba(255,255,255,0.1)" : "transparent",
              }}
            >
              {n.id === "home" && <Home className="w-4 h-4" />}
              {n.id === "vouchers" && <Tag className="w-4 h-4" />}
              {n.id === "categories" && <Grid3x3 className="w-4 h-4" />}
              {n.label}
            </button>
          ))}
        </nav>

        {/* Auth buttons + cart */}
        <div className="flex items-center gap-1">
          {cartOnClick && (
            <button onClick={cartOnClick} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors" aria-label="Giỏ hàng">
              <ShoppingCart className="w-5 h-5 text-white" />
              {cartCount !== null && cartCount !== undefined && cartCount > 0 ? (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ backgroundColor: C.peach }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </button>
          )}
          {loginOnClick && (
            <button
              onClick={loginOnClick}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
              style={{ color: "rgba(244,241,222,0.8)" }}
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden lg:inline">Đăng nhập</span>
            </button>
          )}
          {registerOnClick && (
            <button
              onClick={registerOnClick}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: C.peach }}
            >
              <UserPlus className="w-4 h-4" />
              Đăng ký
            </button>
          )}
          <button className="md:hidden p-2 rounded-xl hover:bg-white/10" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-3 flex flex-wrap gap-2" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: C.indigo }}>
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => { n.onClick(); setMobileOpen(false) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: active === n.id ? C.peach : "rgba(255,255,255,0.1)", color: "white" }}
            >
              {n.label}
            </button>
          ))}
          {loginOnClick && (
            <button onClick={() => { loginOnClick(); setMobileOpen(false) }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white" }}>
              <LogIn className="w-4 h-4" /> Đăng nhập
            </button>
          )}
          {registerOnClick && (
            <button onClick={() => { registerOnClick(); setMobileOpen(false) }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: C.peach }}>
              <UserPlus className="w-4 h-4" /> Đăng ký
            </button>
          )}
        </div>
      )}
    </header>
  )
}