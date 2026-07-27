import { useState, useCallback } from "react"
import type { CartItem, Voucher } from "@/types"

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([])

  const add = useCallback((voucher: Voucher) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.voucher.id === voucher.id)
      if (existing) return prev.map((i) => i.voucher.id === voucher.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { voucher, qty: 1 }]
    })
  }, [])

  const remove = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.voucher.id !== id))
  }, [])

  const update = useCallback((id: string, qty: number) => {
    setCart((prev) => prev.map((i) => i.voucher.id === id ? { ...i, qty } : i))
  }, [])

  const clear = useCallback(() => setCart([]), [])

  const total = cart.reduce((s, i) => s + i.voucher.price * i.qty, 0)
  const count = cart.reduce((s, i) => s + i.qty, 0)

  return { cart, add, remove, update, clear, total, count }
}
