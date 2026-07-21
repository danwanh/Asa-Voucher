"use client";

import Link from "next/link";
import { ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/constants";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useCartStore } from "@/stores/useCartStore";
import { addCartItem } from "@/services/cart.service";
import type { VoucherListItem } from "@/services/voucher.service";

interface Props {
  voucher: VoucherListItem;
}

export function VoucherCard({ voucher }: Props) {
  const refreshCart = useCartStore((s) => s.refresh);
  const isAvailable = voucher.status === "selling" && voucher.remaining_quantity > 0;

  async function handleAddToCart() {
    try {
      await addCartItem(voucher.id, 1);
      await refreshCart();
      toast.success("Đã thêm vào giỏ hàng");
    } catch {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
    }
  }

  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition-shadow flex flex-col">
      <Link href={`/buyer/vouchers/${voucher.id}`} className="relative block h-44 w-full bg-muted">
        {voucher.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={voucher.thumbnail_url} alt={voucher.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-4xl">🎫</div>
        )}
        {voucher.discount_rate > 0 && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
            -{voucher.discount_rate}%
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {voucher.partner_name && (
          <span className="text-xs text-muted-foreground">{voucher.partner_name}</span>
        )}
        <Link
          href={`/buyer/vouchers/${voucher.id}`}
          className="font-bold text-foreground line-clamp-2 leading-snug"
        >
          {voucher.name}
        </Link>

        {typeof voucher.rating === "number" && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <span>{voucher.rating.toFixed(1)}</span>
            {voucher.review_count ? <span>({voucher.review_count})</span> : null}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="flex flex-col">
            <span className="font-black text-primary">{fmt(voucher.selling_price)}</span>
            {voucher.original_price > voucher.selling_price && (
              <span className="text-xs text-muted-foreground line-through">
                {fmt(voucher.original_price)}
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={!isAvailable}
            onClick={handleAddToCart}
            className="rounded-xl bg-primary text-primary-foreground p-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            aria-label="Thêm vào giỏ"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>

        {!isAvailable && (
          <div className="pt-1">
            <StatusBadge status={voucher.status} />
          </div>
        )}
      </div>
    </div>
  );
}
