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

export function useCart(userId?: string, enabled = true, cartItemIds?: string[]) {
  const [cart, setCart] = useState<CartItem[]>(readStoredCart)
  const [isLoading, setIsLoading] = useState(Boolean(userId && enabled))
  const [hasLoaded, setHasLoaded] = useState(!userId)

  useEffect(() => {
    setHasLoaded(!userId)
  }, [userId])

  useEffect(() => {
    if (!userId) syncedUsers.clear()
  }, [userId])

  useEffect(() => {
    if (!userId) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    }
  }, [cart, userId])

  useEffect(() => {
    if (!userId || !enabled) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setHasLoaded(false)

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
        const serverCart = await cartService.get(cartItemIds)
        if (!cancelled) {
          setCart(serverCart)
          setHasLoaded(true)
        }
      } catch {
        toast.error("Không thể tải giỏ hàng. Vui lòng thử lại.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void sync()
    return () => { cancelled = true }
  }, [userId, enabled, cartItemIds])

  const add = useCallback(async (voucher: Voucher): Promise<CartItem | undefined> => {
    let accepted = true
    if (!userId) {
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
      return undefined
    }

    if (!accepted) return undefined
    try {
      await cartService.add(voucher.id)
      const serverCart = await cartService.get()
      setCart(serverCart)
      return serverCart.find((item) => item.voucher.id === voucher.id)
    } catch {
      toast.error("Không thể cập nhật giỏ hàng trên máy chủ.")
      setCart(await cartService.get().catch(() => []))
    }
    return undefined
  }, [userId])

  const remove = useCallback(async (id: string) => {
    const item = cart.find((entry) => entry.voucher.id === id)
    if (!userId || !item?.cartItemId) {
      setCart((prev) => prev.filter((entry) => entry.voucher.id !== id))
      return
    }
    try {
      await cartService.remove(item.cartItemId)
      setCart(await cartService.get())
    } catch {
      toast.error("Không thể xóa voucher khỏi giỏ hàng.")
      setCart(await cartService.get().catch(() => []))
    }
  }, [cart, userId])

  const update = useCallback(async (id: string, qty: number) => {
    const item = cart.find((entry) => entry.voucher.id === id)
    if (!item) return
    const available = item.voucher.quantity - item.voucher.sold
    if (qty > available) {
      toast.error("Số lượng yêu cầu vượt quá số lượng voucher còn lại trong kho")
      return
    }
    if (!userId || !item.cartItemId) {
      setCart((prev) => prev.map((entry) => entry.voucher.id === id ? { ...entry, qty } : entry))
      return
    }
    try {
      await cartService.update(item.cartItemId, qty)
      setCart(await cartService.get())
    } catch {
      toast.error("Không thể cập nhật số lượng voucher.")
      setCart(await cartService.get().catch(() => []))
    }
  }, [cart, userId])

  const clear = useCallback(async () => {
    if (!userId) {
      setCart([])
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    try {
      await cartService.clear()
      setCart(await cartService.get())
    } catch {
      toast.error("Không thể xóa giỏ hàng.")
      setCart(await cartService.get().catch(() => []))
    }
  }, [userId])

  const removeMany = useCallback((cartItemIds: string[]) => {
    const selected = new Set(cartItemIds)
    setCart((prev) => prev.filter((item) => !item.cartItemId || !selected.has(item.cartItemId)))
  }, [])

  const total = cart.reduce((sum, item) => (
    isVoucherAvailable(item.voucher) ? sum + item.voucher.price * item.qty : sum
  ), 0)
  const count = cart.reduce((sum, item) => sum + item.qty, 0)

  return { cart, add, remove, update, clear, removeMany, total, count, isLoading, hasLoaded }
}
