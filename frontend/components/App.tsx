"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useCartContext } from "@/components/CartProvider"
import { useAuthStore } from "@/stores/authStore"
import type { AppUser, CartItem } from "@/types"
import type { CustomerPage } from "@/layouts/CustomerLayout"
import type { GuestPage } from "@/layouts/GuestLayout"
import type { PartnerPage } from "@/layouts/PartnerLayout"
import type { StaffPage } from "@/layouts/StaffLayout"
import type { VoucherStaffPage } from "@/routes/VoucherStaffApp"
import { toast } from "sonner"
import { LoadingState } from "@/components/LoadingState"

const loading = () => <LoadingState label="Đang tải ứng dụng..." variant="page" />
const GuestApp = dynamic(() => import("@/routes/GuestApp").then((module) => module.GuestApp), { loading })
const LoginPage = dynamic(() => import("@/pages/LoginPage").then((module) => module.LoginPage), { loading })
const CustomerApp = dynamic(() => import("@/routes/CustomerApp").then((module) => module.CustomerApp), { loading })
const PartnerApp = dynamic(() => import("@/routes/PartnerApp").then((module) => module.PartnerApp), { loading })
const VoucherStaffApp = dynamic(() => import("@/routes/VoucherStaffApp").then((module) => module.VoucherStaffApp), { loading })
const StaffApp = dynamic(() => import("@/routes/StaffApp").then((module) => module.StaffApp), { loading })
const AdminApp = dynamic(() => import("@/routes/AdminApp").then((module) => module.AdminApp), { loading })

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

type AppRoutePage = CustomerPage | GuestPage | "profile" | "cart"

function rolePageFromPath(routePath: string | undefined, role: string): PartnerPage | StaffPage | VoucherStaffPage | "profile" | undefined {
  const segments = routePath?.split("/").filter(Boolean) ?? []
  const segment = segments.at(-1)
  if (role === "partner_owner") {
    if (segment === "profile") return "profile"
    if (segments[1] === "vouchers" && segments.length >= 3) {
      return segment === "edit" ? "edit" : "voucher-detail"
    }
    if (segment === "vouchers") return "vouchers"
    if (segment === "new" || segment === "create") return "create"
    if (segment === "edit") return "edit"
    if (segment === "revenue") return "revenue"
    if (segment === "branches") return "branches"
    if (segment === "staff") return "staff"
    if (segment === "check-voucher") return "check-voucher"
    return "revenue"
  }
  if (role === "partner_store_staff") {
    if (segment === "profile") return "profile"
    if (segment === "verify" || segment === "qr-scan") return "qr-scan"
    if (segment === "history") return "history"
    return "dashboard"
  }
  if (role === "partner_voucher_staff") {
    if (segment === "profile") return "profile"
    if (segments[1] === "vouchers" && segments.length >= 3) {
      return segment === "edit" ? "edit" : "voucher-detail"
    }
    if (segment === "new" || segment === "create") return "create"
    if (segment === "edit") return "edit"
    if (segment === "reports") return "staff-reports"
    if (segment === "check-voucher") return "check-voucher"
    if (segment === "detail") return "voucher-detail"
    return "vouchers"
  }
  if (segment === "profile") return "profile"
  return undefined
}

function roleVoucherIdFromPath(routePath: string | undefined) {
  const segments = routePath?.split("/").filter(Boolean) ?? []
  return segments[1] === "vouchers" && segments.length >= 3 && !["new", "create", "edit", "detail"].includes(segments[2])
    ? segments[2]
    : undefined
}

export default function App({ initialPage, initialOrderId, initialVoucherId, initialStaffCode, initialPaymentStatus, routePath, protectedRoute = false }: { initialPage?: AppRoutePage; initialOrderId?: string; initialVoucherId?: string; initialStaffCode?: string; initialPaymentStatus?: string; routePath?: string; protectedRoute?: boolean } = {}) {
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const initializationError = useAuthStore((s) => s.initializationError)
  const initialize = useAuthStore((s) => s.initialize)
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const [showLogin, setShowLogin] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const {
    cart, add, remove, update, clear, resetLocalState, removeMany, total, count, cartCount, cartCountLoading, isLoading: cartLoading, hasLoaded: cartHasLoaded,
    checkoutDraft, checkoutCartItemIds, checkoutItems, setCartCheckout, setDirectCheckout, clearCheckoutDraft,
  } = useCartContext()

  useEffect(() => {
    if (!pendingCheckout || !user || !checkoutDraft) return
    if (user.role !== "buyer") {
      toast.error("Chỉ tài khoản khách hàng có thể đặt voucher.")
      setPendingCheckout(false)
      clearCheckoutDraft()
      return
    }
    if (checkoutDraft.kind === "cart" && (cartLoading || !cartHasLoaded)) return
    const hasCompleteCartSelection = checkoutDraft.kind !== "cart"
      || (checkoutItems.length === checkoutDraft.voucherIds.length && checkoutItems.every((item) => item.cartItemId))
    if (checkoutItems.length === 0 || !hasCompleteCartSelection) {
      toast.error("Không thể chuẩn bị sản phẩm đã chọn. Vui lòng kiểm tra lại giỏ hàng.")
      setPendingCheckout(false)
      return
    }
    setPendingCheckout(false)
    router.push("/checkout/create-order")
  }, [pendingCheckout, user, checkoutDraft, checkoutItems, cartLoading, cartHasLoaded, router, clearCheckoutDraft])

  const handleRequestLogin = () => router.push("/login")
  const handleRequestRegister = () => router.push("/signup")

  const handleCheckoutAsGuest = (items: CartItem[], kind: "cart" | "direct" = "cart") => {
    if (kind === "direct") setDirectCheckout(items[0].voucher)
    else setCartCheckout(items)
    setPendingCheckout(true)
    setShowLogin(true)
  }

  const handleLoginSuccess = (_u: AppUser) => {
    setShowLogin(false)
  }

  const handleLoginBack = () => {
    setShowLogin(false)
    setPendingCheckout(false)
    clearCheckoutDraft()
  }

  const handleLogout = () => setShowLogoutConfirm(true)

  const confirmLogout = async () => {
    setShowLogoutConfirm(false)
    try {
      await logout()
      resetLocalState()
      clearCheckoutDraft()
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

  const guestInitialPage = initialPage === "cart" || initialPage === "vouchers" || initialPage === "detail" || initialPage === "categories" || initialPage === "about" || initialPage === "contact"
    ? initialPage
    : undefined
  const isPublicRoute = !protectedRoute && (!initialPage || Boolean(guestInitialPage))

  useEffect(() => {
    if (!isPublicRoute) {
      void initialize()
      return
    }

    const timer = window.setTimeout(() => void initialize(), 250)
    return () => window.clearTimeout(timer)
  }, [initialize, isPublicRoute])

  // Public pages do not need to wait for session recovery before showing content.
  // Protected pages still wait so their first render cannot expose the wrong shell.
  if (!isInitialized && !isPublicRoute) return <LoadingState label="Đang khôi phục phiên đăng nhập..." variant="page" />
  if (initializationError && !isPublicRoute && user) return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-black text-[#3D405B]">Không thể khôi phục phiên đăng nhập</h1>
      <p className="mt-2 text-sm text-[#8A8DA8]">Vui lòng kiểm tra kết nối và thử lại.</p>
      <button onClick={() => void initialize()} className="mt-6 rounded-2xl bg-[#E07A5F] px-6 py-3 font-bold text-white">Thử lại</button>
    </div>
  )

  if (!user && !showLogin && isPublicRoute) return (
    <GuestApp
      onLogin={handleRequestLogin}
      onRegister={handleRequestRegister}
      onCheckout={handleCheckoutAsGuest}
       cartCount={cartCount}
       cartCountLoading={cartCountLoading}
      cart={cart}
      total={total}
      cartRemove={remove}
      cartUpdate={update}
       initialPage={guestInitialPage}
       initialVoucherId={initialVoucherId}
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
       checkoutDraft={checkoutDraft}
       checkoutCartItemIds={checkoutCartItemIds}
       checkoutItems={checkoutItems}
       setCartCheckout={setCartCheckout}
       setDirectCheckout={setDirectCheckout}
       clearCheckoutDraft={clearCheckoutDraft}
      initialPage={initialPage && !["about", "contact"].includes(initialPage) ? initialPage as CustomerPage : undefined}
       initialOrderId={initialOrderId}
       initialVoucherId={initialVoucherId}
      initialPaymentStatus={initialPaymentStatus}
      onInitialPageConsumed={() => setPendingCheckout(false)}
    />
  )

  const rolePage = rolePageFromPath(routePath, user.role)
  const roleVoucherId = roleVoucherIdFromPath(routePath)
  if (user.role === "partner_owner")         return withLogoutDialog(<PartnerApp user={user} onLogout={handleLogout} initialPage={rolePage as PartnerPage | undefined} initialVoucherId={roleVoucherId} />)
  if (user.role === "partner_voucher_staff") return withLogoutDialog(<VoucherStaffApp user={user} onLogout={handleLogout} initialPage={rolePage as VoucherStaffPage | undefined} initialVoucherId={roleVoucherId} />)
  if (user.role === "partner_store_staff")   return withLogoutDialog(<StaffApp user={user} onLogout={handleLogout} initialPage={rolePage as StaffPage | undefined} initialCode={initialStaffCode} />)
  if (user.role === "admin_content" || user.role === "admin_operations" || user.role === "admin_security")
    return withLogoutDialog(<AdminApp user={user} onLogout={handleLogout} initialPage={initialPage === "profile" ? initialPage : undefined} routePath={routePath} />)
  return null
}
