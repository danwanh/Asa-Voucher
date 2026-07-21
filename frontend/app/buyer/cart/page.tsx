"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeleton";
import { fmt } from "@/lib/constants";
import { useCartStore } from "@/stores/useCartStore";
import {
  getCart,
  updateCartItem,
  removeCartItem,
  checkout,
  type CartItemWithVoucher
} from "@/services/cart.service";

export default function CartPage() {
  const router = useRouter();
  const refreshCartCount = useCartStore((s) => s.refresh);
  const [items, setItems] = useState<CartItemWithVoucher[] | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    getCart()
      .then((cart) => setItems(cart.items))
      .catch(() => setItems([]));
  }, []);

  async function handleQuantityChange(id: string, quantity: number) {
    if (quantity < 1) return;
    try {
      await updateCartItem(id, quantity);
      setItems((prev) => prev?.map((item) => (item.id === id ? { ...item, quantity } : item)) ?? null);
      refreshCartCount();
    } catch {
      toast.error("Không thể cập nhật số lượng");
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeCartItem(id);
      setItems((prev) => prev?.filter((item) => item.id !== id) ?? null);
      refreshCartCount();
    } catch {
      toast.error("Không thể xoá sản phẩm");
    }
  }

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      const order = await checkout({ payment_method: "bank_transfer" });
      await refreshCartCount();
      toast.success("Đặt hàng thành công");
      router.push(`/buyer/orders/${order.id}`);
    } catch {
      toast.error("Thanh toán thất bại. Vui lòng thử lại.");
    } finally {
      setCheckingOut(false);
    }
  }

  if (items === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="Giỏ hàng trống"
        description="Hãy khám phá và thêm voucher yêu thích vào giỏ hàng."
        action={{ label: "Khám phá voucher", onClick: () => router.push("/buyer") }}
      />
    );
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.voucher_products.selling_price, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <Link href={`/buyer/vouchers/${item.voucher_product_id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              {item.voucher_products.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.voucher_products.thumbnail_url}
                  alt={item.voucher_products.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">🎫</div>
              )}
            </Link>

            <div className="flex-1">
              <Link
                href={`/buyer/vouchers/${item.voucher_product_id}`}
                className="font-semibold text-foreground line-clamp-1"
              >
                {item.voucher_products.name}
              </Link>
              <p className="text-sm font-bold text-primary">{fmt(item.voucher_products.selling_price)}</p>
            </div>

            <div className="flex items-center rounded-xl border border-border">
              <button
                type="button"
                className="px-3 py-1.5 text-lg"
                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
              <button
                type="button"
                className="px-3 py-1.5 text-lg"
                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              className="rounded-xl p-2 text-destructive hover:bg-destructive/10"
              aria-label="Xoá"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="h-fit space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tạm tính</span>
          <span className="font-semibold">{fmt(total)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-black">
          <span>Tổng cộng</span>
          <span className="text-primary">{fmt(total)}</span>
        </div>
        <Button className="w-full" onClick={handleCheckout} disabled={checkingOut}>
          {checkingOut ? "Đang xử lý..." : "Thanh toán"}
        </Button>
      </div>
    </div>
  );
}
