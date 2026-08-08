import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { cartService } from "@/services/cartService"
import type { CartItem, Voucher } from "@/types"

const STORAGE_KEY = "asa-cart-v1"
const syncedUsers = new Set<string>()

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function isVoucherAvailable(voucher: Voucher) {
  const today = new Date().toISOString().slice(0, 10)
  const remaining = voucher.quantity - voucher.sold
  return voucher.status === "active" && remaining > 0 && voucher.validFrom <= today && voucher.validTo >= today
}

export function useCart(userId?: string) {
  const [cart, setCart] = useState<CartItem[]>(readStoredCart)

  useEffect(() => {
    if (!userId) syncedUsers.clear()
  }, [userId])

  useEffect(() => {
    if (!userId) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    }
  }, [cart, userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    const sync = async () => {
      if (!syncedUsers.has(userId)) {
        syncedUsers.add(userId)
        const localCart = readStoredCart()
        const results = await Promise.allSettled(
          localCart.map((item) => cartService.add(item.voucher.id, item.qty)),
        )
        const failed = results.filter((result) => result.status === "rejected").length
        if (failed > 0) {
          toast.warning("Một số voucher trong giỏ khách chưa thể đồng bộ.", {
            description: "Vui lòng kiểm tra lại tình trạng voucher trước khi đặt hàng.",
          })
        }
        window.localStorage.removeItem(STORAGE_KEY)
      }

      try {
        const serverCart = await cartService.get()
        if (!cancelled) setCart(serverCart)
      } catch {
        toast.error("Không thể tải giỏ hàng. Vui lòng thử lại.")
      }
    }

    void sync()
    return () => { cancelled = true }
  }, [userId])

  const add = useCallback((voucher: Voucher) => {
    let accepted = true
    setCart((prev) => {
      const existing = prev.find((item) => item.voucher.id === voucher.id)
      const nextQty = (existing?.qty ?? 0) + 1
      const available = voucher.quantity - voucher.sold
      if (nextQty > available) {
        accepted = false
        toast.error("Số lượng yêu cầu vượt quá số lượng voucher còn lại trong kho")
        return prev
      }
      return existing
        ? prev.map((item) => item.voucher.id === voucher.id ? { ...item, qty: nextQty } : item)
        : [...prev, { voucher, qty: 1 }]
    })

    if (userId && accepted) {
      void cartService.add(voucher.id).then(async () => {
        setCart(await cartService.get())
      }).catch(async () => {
        toast.error("Không thể cập nhật giỏ hàng trên máy chủ.")
        setCart(await cartService.get().catch(() => []))
      })
    }
  }, [userId])

  const remove = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.voucher.id !== id))
    const item = cart.find((entry) => entry.voucher.id === id)
    if (userId && item?.cartItemId) {
      void cartService.remove(item.cartItemId)
        .then(async () => setCart(await cartService.get()))
        .catch(async () => {
          toast.error("Không thể xóa voucher khỏi giỏ hàng.")
          setCart(await cartService.get())
        })
    }
  }, [cart, userId])

  const update = useCallback((id: string, qty: number) => {
    const item = cart.find((entry) => entry.voucher.id === id)
    if (!item) return
    const available = item.voucher.quantity - item.voucher.sold
    if (qty > available) {
      toast.error("Số lượng yêu cầu vượt quá số lượng voucher còn lại trong kho")
      return
    }
    setCart((prev) => prev.map((entry) => entry.voucher.id === id ? { ...entry, qty } : entry))
    if (userId && item.cartItemId) {
      void cartService.update(item.cartItemId, qty).catch(async () => {
        toast.error("Không thể cập nhật số lượng voucher.")
        setCart(await cartService.get())
      })
    }
  }, [cart, userId])

  const clear = useCallback(() => {
    setCart([])
    window.localStorage.removeItem(STORAGE_KEY)
    if (userId) void cartService.clear().catch(() => undefined)
  }, [userId])

  const total = cart.reduce((sum, item) => (
    isVoucherAvailable(item.voucher) ? sum + item.voucher.price * item.qty : sum
  ), 0)
  const count = cart.reduce((sum, item) => sum + item.qty, 0)

  return { cart, add, remove, update, clear, total, count }
}
