import { Star } from "lucide-react"
import { AppIcon } from "@/components/AppIcon"
import { C, fmt } from "@/utils/constants"
import { StatusBadge } from "./StatusBadge"
import type { Voucher } from "@/types"

const FALLBACK = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=400&fit=crop"

const CAT_ICON: Record<string, string> = {
  food: "gift",
  travel: "location",
  beauty: "heart",
  entertainment: "ticket",
}

interface Props {
  voucher: Voucher
  onBuy: () => void
  onClick: () => void
}

export function VoucherCard({ voucher: v, onBuy, onClick }: Props) {
  const discountLabel =
    v.discountType === "percent" ? `Giảm ${v.discount}%` : `Giảm ${fmt(v.discount)}`

  return (
    <div
      className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group"
      style={{ fontFamily: "'Nunito', sans-serif" }}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative overflow-hidden h-40">
        <img
          src={v.image}
          alt={v.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <AppIcon name={CAT_ICON[v.category] ?? "tag"} className="absolute top-3 left-3 w-5 h-5 text-white" />
        {v.status !== "active" && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <StatusBadge status={v.status} />
          </div>
        )}
      </div>

      {/* Ticket accent bar */}
      <div
        className="relative px-4 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: C.apricot }}
      >
        <div
          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
          style={{ backgroundColor: C.eggshell }}
        />
        <div
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
          style={{ backgroundColor: C.eggshell }}
        />
        <span className="text-sm font-extrabold" style={{ color: C.indigo }}>
          {discountLabel}
        </span>
        <span className="text-xs" style={{ color: C.indigoLight }}>
          Còn {v.quantity - v.sold}/{v.quantity}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="font-bold text-sm leading-snug mb-1 line-clamp-2" style={{ color: C.indigo }}>
          {v.title}
        </p>
        <p className="text-xs mb-3" style={{ color: "#8A8DA8" }}>{v.partnerName}</p>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-extrabold" style={{ color: C.peach }}>
              {fmt(v.price)}
            </span>
            <span className="text-xs line-through ml-1.5" style={{ color: "#B0B3C8" }}>
              {fmt(v.originalPrice)}
            </span>
          </div>
          {v.status === "active" && (
            <button
              onClick={(e) => { e.stopPropagation(); onBuy() }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
              style={{ backgroundColor: C.peach }}
            >
              Mua ngay
            </button>
          )}
        </div>

        {v.rating > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold">{v.rating}</span>
            <span className="text-xs" style={{ color: "#B0B3C8" }}>({v.reviews})</span>
          </div>
        )}
      </div>
    </div>
  )
}
