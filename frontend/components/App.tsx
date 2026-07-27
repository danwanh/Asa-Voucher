"use client"

import { useState } from "react"
import { GuestApp } from "@/routes/GuestApp"
import { LoginPage } from "@/pages/LoginPage"
import { CustomerApp } from "@/routes/CustomerApp"
import { PartnerApp } from "@/routes/PartnerApp"
import { VoucherStaffApp } from "@/routes/VoucherStaffApp"
import { StaffApp } from "@/routes/StaffApp"
import { AdminApp } from "@/routes/AdminApp"
import { useCart } from "@/hooks/useCart"
import type { AppUser } from "@/types"

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  // When true, CustomerApp starts at create-order after login
  const [pendingCheckout, setPendingCheckout] = useState(false)

  // Cart is lifted here so it persists across the guest → authenticated transition
  const { cart, add, remove, update, clear, total, count } = useCart()

  const handleRequestLogin = () => setShowLogin(true)

  const handleCheckoutAsGuest = () => {
    setPendingCheckout(true)
    setShowLogin(true)
  }

  const handleLoginSuccess = (u: AppUser) => {
    setUser(u)
    setShowLogin(false)
  }

  const handleLoginBack = () => {
    setShowLogin(false)
    setPendingCheckout(false)
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
      onLogout={() => { setUser(null); clear() }}
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

  if (user.role === "partner_owner")         return <PartnerApp user={user} onLogout={() => setUser(null)} />
  if (user.role === "partner_voucher_staff") return <VoucherStaffApp user={user} onLogout={() => setUser(null)} />
  if (user.role === "partner_store_staff")   return <StaffApp user={user} onLogout={() => setUser(null)} />
  if (user.role === "admin_content" || user.role === "admin_account" || user.role === "admin_security")
    return <AdminApp user={user} onLogout={() => setUser(null)} />
  return null
}
