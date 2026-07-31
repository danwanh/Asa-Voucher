"use client"

import { useEffect, useState } from "react"
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

export default function App() {
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const initialize = useAuthStore((s) => s.initialize)
  const logout = useAuthStore((s) => s.logout)

  const [showLogin, setShowLogin] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(false)

  const { cart, add, remove, update, clear, total, count } = useCart()

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleRequestLogin = () => setShowLogin(true)

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

  const handleLogout = async () => {
    await logout()
    clear()
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F4F1DE" }}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg animate-pulse" style={{ backgroundColor: "#E07A5F", color: "white" }}>A</div>
      </div>
    )
  }

  if (!user && !showLogin) return (
    <GuestApp
      onLogin={handleRequestLogin}
      onCheckout={handleCheckoutAsGuest}
      cartAdd={add}
      cartCount={count}
    />
  )

  if (!user) return (
    <LoginPage
      onLogin={handleLoginSuccess}
      onBack={handleLoginBack}
    />
  )

  if (user.role === "buyer") return (
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
      initialPage={pendingCheckout ? "create-order" : undefined}
      onInitialPageConsumed={() => setPendingCheckout(false)}
    />
  )

  if (user.role === "partner_owner")         return <PartnerApp user={user} onLogout={handleLogout} />
  if (user.role === "partner_voucher_staff") return <VoucherStaffApp user={user} onLogout={handleLogout} />
  if (user.role === "partner_store_staff")   return <StaffApp user={user} onLogout={handleLogout} />
  if (user.role === "admin_content" || user.role === "admin_account" || user.role === "admin_security")
    return <AdminApp user={user} onLogout={handleLogout} />
  return null
}
