"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/useCartStore";
import { addCartItem } from "@/services/cart.service";

interface Props {
  voucherProductId: string;
  disabled?: boolean;
}

export function AddToCartButton({ voucherProductId, disabled }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const refreshCart = useCartStore((s) => s.refresh);

  async function handleAdd() {
    setLoading(true);
    try {
      await addCartItem(voucherProductId, quantity);
      await refreshCart();
      toast.success("Đã thêm vào giỏ hàng");
    } catch {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-xl border border-border">
        <button
          type="button"
          className="px-3 py-2 text-lg disabled:opacity-40"
          disabled={disabled || quantity <= 1}
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
        >
          -
        </button>
        <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
        <button
          type="button"
          className="px-3 py-2 text-lg disabled:opacity-40"
          disabled={disabled}
          onClick={() => setQuantity((q) => q + 1)}
        >
          +
        </button>
      </div>
      <Button onClick={handleAdd} disabled={disabled || loading} className="flex-1">
        {loading ? "Đang thêm..." : "Thêm vào giỏ hàng"}
      </Button>
    </div>
  );
}
