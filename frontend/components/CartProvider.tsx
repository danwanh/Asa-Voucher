"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useCart } from "@/hooks/useCart"
import { useAuthStore } from "@/stores/authStore"
import type { CartItem } from "@/types"
import type { Voucher } from "@/types"
import { cartService } from "@/services/cartService"

const CHECKOUT_SELECTION_KEY = "asa-selected-cart-items-v1"

type CartContextValue = ReturnType<typeof useCart> & {
  cartCount: number | null
  cartCountLoading: boolean
  checkoutSelectionIds: string[] | null
  checkoutItems: CartItem[]
  setCheckoutSelection: (cartItemIds: string[]) => void
  clearCheckoutSelection: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function readSelection(): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_SELECTION_KEY)
    if (raw === null) return null
    const value = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : null
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
  const [checkoutSelectionIds, setCheckoutSelectionIds] = useState<string[] | null>(readSelection)
  const cartState = useCart(
    userId,
    !isCheckoutRoute,
  )
  const checkoutState = useCart(
    userId,
    isCreateOrderRoute && checkoutSelectionIds !== null,
    checkoutSelectionIds ?? undefined,
  )
  const [serverCartCount, setServerCartCount] = useState<number | null>(null)
  const [cartCountRequestLoading, setCartCountRequestLoading] = useState(false)

  const refreshCartCount = useCallback(async () => {
    if (!userId) {
      setServerCartCount(null)
      setCartCountRequestLoading(false)
      return
    }
    setCartCountRequestLoading(true)
    try {
      setServerCartCount(await cartService.getCount())
    } catch {
      setServerCartCount(null)
    } finally {
      setCartCountRequestLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refreshCartCount()
  }, [refreshCartCount])

  useEffect(() => {
    if (cartState.hasLoaded) setServerCartCount(cartState.cart.length)
  }, [cartState.hasLoaded, cartState.cart.length])

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
    setServerCartCount(0)
  }, [cartState.clear])

  const removeMany = useCallback((cartItemIds: string[]) => {
    cartState.removeMany(cartItemIds)
    const removedCount = new Set(cartItemIds).size
    setServerCartCount((current) => current === null ? current : Math.max(0, current - removedCount))
  }, [cartState.removeMany])

  const setCheckoutSelection = useCallback((cartItemIds: string[]) => {
    setCheckoutSelectionIds(cartItemIds)
    window.sessionStorage.setItem(CHECKOUT_SELECTION_KEY, JSON.stringify(cartItemIds))
  }, [])

  const clearCheckoutSelection = useCallback(() => {
    setCheckoutSelectionIds(null)
    window.sessionStorage.removeItem(CHECKOUT_SELECTION_KEY)
  }, [])

  const checkoutItems = checkoutSelectionIds === null
    ? []
    : checkoutState.cart.filter((item) => item.cartItemId && checkoutSelectionIds.includes(item.cartItemId))

  const cartCount = userId ? serverCartCount : cartState.cart.length
  const cartCountLoading = Boolean(userId && (cartCountRequestLoading || serverCartCount === null))

  return (
    <CartContext.Provider value={{
      ...cartState,
      add,
      remove,
      update,
      clear,
      removeMany,
      cartCount,
      cartCountLoading,
      checkoutSelectionIds,
      checkoutItems,
      setCheckoutSelection,
      clearCheckoutSelection,
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
