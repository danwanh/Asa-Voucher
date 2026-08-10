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
import { useCartContext } from "@/components/CartProvider"
import { useAuthStore } from "@/stores/authStore"
import type { AppUser, CartItem } from "@/types"
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

export default function App({ initialPage, initialOrderId, initialStaffCode, initialPaymentStatus }: { initialPage?: CustomerPage | "profile" | "cart"; initialOrderId?: string; initialStaffCode?: string; initialPaymentStatus?: string } = {}) {
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const initialize = useAuthStore((s) => s.initialize)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [showLogin, setShowLogin] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const {
    cart, add, remove, update, clear, removeMany, total, count, cartCount, cartCountLoading, isLoading: cartLoading,
    checkoutSelectionIds, checkoutItems, setCheckoutSelection, clearCheckoutSelection,
  } = useCartContext()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!pendingCheckout || !user || cartLoading) return
    const cartItemIds = cart.map((item) => item.cartItemId).filter((id): id is string => Boolean(id))
    if (cartItemIds.length > 0) setCheckoutSelection(cartItemIds)
  }, [pendingCheckout, user, cartLoading, cart, setCheckoutSelection])

  const handleRequestLogin = () => router.push("/login")
  const handleRequestRegister = () => router.push("/signup")

  const handleCheckoutAsGuest = (_items?: CartItem[]) => {
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
      clearCheckoutSelection()
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

  const guestInitialPage = initialPage === "cart" || initialPage === "vouchers" || initialPage === "categories"
    ? initialPage
    : undefined

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4F1DE" }} role="status" aria-live="polite">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center font-black text-lg animate-pulse" style={{ backgroundColor: "#E07A5F", color: "white" }}>A</div>
          <p className="text-sm font-semibold" style={{ color: "#3D405B" }}>Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    )
  }

  if (!user && !showLogin && (!initialPage || guestInitialPage)) return (
    <GuestApp
      onLogin={handleRequestLogin}
      onRegister={handleRequestRegister}
      onCheckout={handleCheckoutAsGuest}
      cartAdd={add}
       cartCount={cartCount}
       cartCountLoading={cartCountLoading}
      cart={cart}
      total={total}
      cartRemove={remove}
      cartUpdate={update}
       initialPage={guestInitialPage}
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
       cartCount={cartCount}
       cartCountLoading={cartCountLoading}
      add={add}
      remove={remove}
      update={update}
       removeMany={removeMany}
       cartLoading={cartLoading}
       checkoutSelectionIds={checkoutSelectionIds}
       checkoutItems={checkoutItems}
       setCheckoutSelection={setCheckoutSelection}
       clearCheckoutSelection={clearCheckoutSelection}
      initialPage={pendingCheckout ? "create-order" : initialPage}
      initialOrderId={initialOrderId}
      initialPaymentStatus={initialPaymentStatus}
      onInitialPageConsumed={() => setPendingCheckout(false)}
    />
  )

  if (user.role === "partner_owner")         return withLogoutDialog(<PartnerApp user={user} onLogout={handleLogout} initialPage={initialPage === "profile" ? initialPage : undefined} />)
  if (user.role === "partner_voucher_staff") return withLogoutDialog(<VoucherStaffApp user={user} onLogout={handleLogout} initialPage={initialPage === "profile" ? initialPage : undefined} />)
  if (user.role === "partner_store_staff")   return withLogoutDialog(<StaffApp user={user} onLogout={handleLogout} initialPage={initialStaffCode ? "verify" : initialPage === "profile" ? initialPage : undefined} initialCode={initialStaffCode} />)
  if (user.role === "admin_content" || user.role === "admin_operations" || user.role === "admin_security")
    return withLogoutDialog(<AdminApp user={user} onLogout={handleLogout} initialPage={initialPage === "profile" ? initialPage : undefined} />)
  return null
}
