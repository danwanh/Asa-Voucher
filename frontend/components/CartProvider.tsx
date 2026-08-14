"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { usePathname } from "next/navigation"
import { useCart } from "@/hooks/useCart"
import { useAuthStore } from "@/stores/authStore"
import type { CartItem, CheckoutDraft } from "@/types"
import type { Voucher } from "@/types"

const CHECKOUT_DRAFT_KEY = "asa-checkout-draft-v2"

type CartContextValue = ReturnType<typeof useCart> & {
  cartCount: number | null
  cartCountLoading: boolean
  checkoutDraft: CheckoutDraft | null
  checkoutCartItemIds: string[]
  checkoutItems: CartItem[]
  setCartCheckout: (items: CartItem[]) => void
  setDirectCheckout: (voucher: Voucher) => void
  clearCheckoutDraft: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function readCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY)
    if (raw === null) return null
    const value = JSON.parse(raw) as CheckoutDraft
    if (value?.kind === "cart" && Array.isArray(value.voucherIds) && value.voucherIds.every((id) => typeof id === "string") && Array.isArray(value.cartItemIds) && value.cartItemIds.every((id) => typeof id === "string")) return value
    if (value?.kind === "direct" && Array.isArray(value.items) && value.items.every((item) => item && typeof item === "object" && item.voucher && typeof item.voucher.id === "string" && Number.isInteger(item.qty) && item.qty > 0)) return value
    return null
  } catch {
    return null
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const authUser = useAuthStore((state) => state.user)
  const userId = authUser?.role === "buyer" ? authUser.id : undefined
  const pathname = usePathname()
  const isCheckoutRoute = pathname?.startsWith("/checkout/") ?? false
  const isCreateOrderRoute = pathname === "/checkout/create-order"
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(readCheckoutDraft)
  const cartState = useCart(
    userId,
    !isCheckoutRoute || isCreateOrderRoute,
  )
  const add = useCallback(async (voucher: Voucher) => {
    const item = await cartState.add(voucher)
    return item
  }, [cartState.add])

  const remove = useCallback(async (id: string) => {
    await cartState.remove(id)
  }, [cartState.remove])

  const update = useCallback(async (id: string, qty: number) => {
    await cartState.update(id, qty)
  }, [cartState.update])

  const clear = useCallback(async () => {
    await cartState.clear()
  }, [cartState.clear])

  const resetLocalState = useCallback(() => {
    cartState.resetLocalState()
  }, [cartState.resetLocalState])

  const removeMany = useCallback((cartItemIds: string[]) => {
    cartState.removeMany(cartItemIds)
  }, [cartState.removeMany])

  const saveCheckoutDraft = useCallback((draft: CheckoutDraft) => {
    setCheckoutDraft(draft)
    window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft))
  }, [])

  const setCartCheckout = useCallback((items: CartItem[]) => {
    saveCheckoutDraft({
      kind: "cart",
      voucherIds: items.map((item) => item.voucher.id),
      cartItemIds: items.flatMap((item) => item.cartItemId ? [item.cartItemId] : []),
    })
  }, [saveCheckoutDraft])

  const setDirectCheckout = useCallback((voucher: Voucher) => {
    saveCheckoutDraft({ kind: "direct", items: [{ voucher, qty: 1 }] })
  }, [saveCheckoutDraft])

  const clearCheckoutDraft = useCallback(() => {
    setCheckoutDraft(null)
    window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY)
  }, [])

  const selectedVoucherIds = checkoutDraft?.kind === "cart" ? new Set(checkoutDraft.voucherIds) : null
  const checkoutItems = checkoutDraft?.kind === "direct"
    ? checkoutDraft.items
    : selectedVoucherIds
      ? cartState.cart.filter((item) => selectedVoucherIds.has(item.voucher.id))
      : []
  const checkoutCartItemIds = checkoutDraft?.kind === "cart"
    ? checkoutItems.flatMap((item) => item.cartItemId ? [item.cartItemId] : [])
    : []

  const cartCount = cartState.count
  const cartCountLoading = Boolean(userId && !cartState.hasLoaded)

  return (
    <CartContext.Provider value={{
      ...cartState,
      add,
      remove,
      update,
      clear,
      resetLocalState,
      removeMany,
      cartCount,
      cartCountLoading,
      checkoutDraft,
      checkoutCartItemIds,
      checkoutItems,
      setCartCheckout,
      setDirectCheckout,
      clearCheckoutDraft,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCartContext() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCartContext must be used within CartProvider")
  return context
}
