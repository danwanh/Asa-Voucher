import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import { C, formatCategoryLabel } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { VoucherCard } from "@/components/VoucherCard"
import type { Voucher } from "@/types"
import type { CustomerPage } from "@/layouts/CustomerLayout"
import { voucherService } from "@/services/voucherService"
import { LoadingState } from "@/components/LoadingState"

interface Props {
  onBuy: (v: Voucher) => void
  onDetail: (v: Voucher) => void
  onNavigate: (p: CustomerPage) => void
}

export function HomePage({ onBuy, onDetail, onNavigate }: Props) {
  const [activeCat, setActiveCat] = useState("all")
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadVouchers() {
      setIsLoading(true)
      try {
        const items = await voucherService.listPublicVouchers({ limit: 100 })
        if (!isMounted) return
        setVouchers(items)
      } catch {
        if (!isMounted) return
        setVouchers([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadVouchers()
    return () => {
      isMounted = false
    }
  }, [])

  const featured = vouchers.filter((v) => v.status === "active")
    .filter((v) => activeCat === "all" || v.category === activeCat)
    .slice(0, 6)

  const categories = [
    { id: "all", label: "Tất cả", icon: "gift" },
    ...Array.from(new Set(vouchers.map((voucher) => voucher.category))).slice(0, 4).map((slug) => ({
      id: slug,
      label: formatCategoryLabel(slug),
      icon: "tag"
    }))
  ]

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.indigo} 0%, ${C.indigoLight} 100%)` }}>
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-xl">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-6"
              style={{ backgroundColor: C.peach + "25", color: C.apricot }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: C.peach }} />
              Đang có 245 đơn hàng hôm nay
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
              Voucher ưu đãi<br />
              <span style={{ color: C.apricot }}>siêu tiết kiệm</span>
            </h1>
            <p className="text-lg mb-8" style={{ color: "rgba(244,241,222,0.75)" }}>
              Hàng nghìn ưu đãi hấp dẫn từ 124 đối tác uy tín trên toàn quốc.
            </p>
            <button
              onClick={() => onNavigate("vouchers")}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: C.peach }}
            >
              Khám phá ngay <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="absolute -bottom-8 -right-8 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: C.apricot }} />
        <div className="absolute top-8 right-32 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: C.teal }} />
      </div>

      {/* Category pills */}
      <div className="max-w-6xl mx-auto px-4 -mt-5 relative z-10">
        <div className="bg-card rounded-3xl p-5 shadow-lg flex flex-wrap gap-2 justify-center">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all"
              style={{
                backgroundColor: activeCat === c.id ? C.peach : C.eggshell,
                color: activeCat === c.id ? "white" : C.indigo,
              }}
            >
              <AppIcon name={c.icon} className="w-4 h-4" />{c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured vouchers */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black" style={{ color: C.indigo }}>Voucher nổi bật</h2>
          <button
            onClick={() => onNavigate("vouchers")}
            className="flex items-center gap-1 text-sm font-semibold hover:underline"
            style={{ color: C.peach }}
          >
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <LoadingState label="Đang tải voucher..." variant="section" size="sm" />
        ) : featured.length === 0 ? (
          <div className="text-center py-16">
            <AppIcon name="search" className="w-10 h-10 mb-3 mx-auto" />
            <div className="font-bold" style={{ color: C.indigo }}>Không có voucher trong danh mục này</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((v) => (
              <VoucherCard key={v.id} voucher={v} onBuy={() => onBuy(v)} onClick={() => onDetail(v)} />
            ))}
          </div>
        )}
      </div>

      {/* Trust banners */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "shield", title: "Cam kết hoàn tiền", desc: "Hoàn tiền 100% nếu không sử dụng được" },
            { icon: "zap", title: "Giao mã tức thì", desc: "Nhận mã voucher ngay sau khi thanh toán" },
            { icon: "shield", title: "Đối tác uy tín", desc: "124 đối tác được xác thực chất lượng" },
          ].map((b) => (
            <div key={b.title} className="bg-card rounded-2xl p-5 flex items-start gap-4 shadow-sm">
              <AppIcon name={b.icon} className="w-8 h-8" />
              <div>
                <div className="font-bold text-sm" style={{ color: C.indigo }}>{b.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
