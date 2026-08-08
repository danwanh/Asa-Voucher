"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GuestApp } from "@/routes/GuestApp"
import { LoginPage } from "@/pages/LoginPage"
import { CustomerApp } from "@/routes/CustomerApp"
import { PartnerApp } from "@/routes/PartnerApp"
import { VoucherStaffApp } from "@/routes/VoucherStaffApp"
import { StaffApp } from "@/routes/StaffApp"
import { AdminApp } from "@/routes/AdminApp"
import { useCart } from "@/hooks/useCart"
import { useAuthStore } from "@/stores/authStore"
import type { AppUser } from "@/types"
import type { CustomerPage } from "@/layouts/CustomerLayout"
import { toast } from "sonner"

function LogoutConfirmDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title">
        <h2 id="logout-dialog-title" className="text-lg font-black" style={{ color: "#3D405B" }}>Đăng xuất?</h2>
        <p className="mt-2 text-sm" style={{ color: "#8A8DA8" }}>Bạn có chắc muốn đăng xuất khỏi tài khoản không?</p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-2xl border-2 py-3 font-bold" style={{ borderColor: "#E2DFC8", color: "#3D405B" }}>Hủy</button>
          <button onClick={onConfirm} className="flex-1 rounded-2xl py-3 font-bold text-white" style={{ backgroundColor: "#E07A5F" }}>Đăng xuất</button>
        </div>
      </div>
    </div>
  )
}

export default function App({ initialPage, initialOrderId }: { initialPage?: CustomerPage | "profile" | "cart"; initialOrderId?: string } = {}) {
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const initialize = useAuthStore((s) => s.initialize)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [showLogin, setShowLogin] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const { cart, add, remove, update, clear, total, count } = useCart(user?.id)

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleRequestLogin = () => router.push("/login")
  const handleRequestRegister = () => router.push("/signup")

  const handleCheckoutAsGuest = () => {
    setPendingCheckout(true)
    setShowLogin(true)
  }

  const handleLoginSuccess = (_u: AppUser) => {
    setShowLogin(false)
  }

  const handleLoginBack = () => {
    setShowLogin(false)
    setPendingCheckout(false)
  }

  const handleLogout = () => setShowLogoutConfirm(true)

  const confirmLogout = async () => {
    setShowLogoutConfirm(false)
    try {
      await logout()
      clear()
    } catch {
      toast.error("Đăng xuất thất bại. Vui lòng thử lại.")
    }
  }

  const withLogoutDialog = (content: React.ReactNode) => (
    <>
      {content}
      {showLogoutConfirm && <LogoutConfirmDialog onCancel={() => setShowLogoutConfirm(false)} onConfirm={confirmLogout} />}
    </>
  )

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F4F1DE" }}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg animate-pulse" style={{ backgroundColor: "#E07A5F", color: "white" }}>A</div>
      </div>
    )
  }

  if (!user && !showLogin && (!initialPage || initialPage === "cart")) return (
    <GuestApp
      onLogin={handleRequestLogin}
      onRegister={handleRequestRegister}
      onCheckout={handleCheckoutAsGuest}
      cartAdd={add}
      cartCount={count}
      cart={cart}
      total={total}
      cartRemove={remove}
      cartUpdate={update}
      initialPage={initialPage === "cart" ? "cart" : undefined}
    />
  )

  if (!user) return (
    <LoginPage
      onLogin={handleLoginSuccess}
      onBack={handleLoginBack}
    />
  )

  if (user.role === "buyer") return withLogoutDialog(
    <CustomerApp
      user={user}
      onLogout={handleLogout}
      cart={cart}
      total={total}
      count={count}
      add={add}
      remove={remove}
      update={update}
      clear={clear}
       initialPage={pendingCheckout ? "create-order" : initialPage}
       initialOrderId={initialOrderId}
      onInitialPageConsumed={() => setPendingCheckout(false)}
    />
  )

  if (user.role === "partner_owner")         return withLogoutDialog(<PartnerApp user={user} onLogout={handleLogout} initialPage={initialPage === "profile" ? initialPage : undefined} />)
  if (user.role === "partner_voucher_staff") return withLogoutDialog(<VoucherStaffApp user={user} onLogout={handleLogout} initialPage={initialPage === "profile" ? initialPage : undefined} />)
  if (user.role === "partner_store_staff")   return withLogoutDialog(<StaffApp user={user} onLogout={handleLogout} initialPage={initialPage === "profile" ? initialPage : undefined} />)
  if (user.role === "admin_content" || user.role === "admin_operations" || user.role === "admin_security")
    return withLogoutDialog(<AdminApp user={user} onLogout={handleLogout} initialPage={initialPage === "profile" ? initialPage : undefined} />)
  return null
}
