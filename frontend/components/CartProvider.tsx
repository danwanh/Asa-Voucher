"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { usePathname } from "next/navigation"
import { useCart } from "@/hooks/useCart"
import { useAuthStore } from "@/stores/authStore"
import type { CartItem } from "@/types"

const CHECKOUT_SELECTION_KEY = "asa-selected-cart-items-v1"

type CartContextValue = ReturnType<typeof useCart> & {
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
  const userId = useAuthStore((state) => state.user?.id)
  const pathname = usePathname()
  const isCheckoutRoute = pathname?.startsWith("/checkout/") ?? false
  const isCreateOrderRoute = pathname === "/checkout/create-order"
  const [checkoutSelectionIds, setCheckoutSelectionIds] = useState<string[] | null>(readSelection)
  const cartState = useCart(
    userId,
    !isCheckoutRoute || checkoutSelectionIds !== null,
    isCreateOrderRoute ? checkoutSelectionIds ?? undefined : undefined,
  )

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
    : cartState.cart.filter((item) => item.cartItemId && checkoutSelectionIds.includes(item.cartItemId))

  return (
    <CartContext.Provider value={{ ...cartState, checkoutSelectionIds, checkoutItems, setCheckoutSelection, clearCheckoutSelection }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCartContext() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCartContext must be used within CartProvider")
  return context
}
