import { useEffect, useMemo, useState } from "react"
import { Search, Star, ChevronRight, Zap, ShieldCheck, Smartphone, TrendingUp, ChevronDown } from "lucide-react"
import { C, fmt } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { BannerCarousel } from "@/components/BannerCarousel"
import dynamic from "next/dynamic"
import { SectionHeader } from "@/components/SectionHeader"
import type { Voucher } from "@/types"
import { voucherService, type HomepageSummary } from "@/services/voucherService"
import { isVoucherAvailable } from "@/hooks/useCart"

const LazyNewsSection = dynamic(() => import("@/components/NewsSection").then((module) => module.LazyNewsSection), {
  loading: () => <div className="min-h-24" aria-hidden="true" />,
})

interface Props {
  viewer?: "guest" | "customer"
  onNavigate: (p: string) => void
  onVoucherDetail: (v: Voucher) => void
  onLogin?: () => void
  onAddToCart: (v: Voucher) => void
  onBuyNow: (v: Voucher) => void
  onOpenArticle: (id: string) => void
}

type GuestCategory = {
  id: string
  name: string
  slug: string
}

const CATEGORY_STYLES = [
  { icon: "gift", color: "#FDEBD0" },
  { icon: "heart", color: "#FCE4EC" },
  { icon: "location", color: "#E3F2FD" },
  { icon: "ticket", color: "#EDE7F6" },
  { icon: "shield", color: "#E8F5E9" },
  { icon: "document", color: "#FFF8E1" },
  { icon: "shield", color: "#E0F7FA" },
  { icon: "shoppingCart", color: "#F3E5F5" },
]

const FAQ = [
  { q: "Voucher điện tử là gì?", a: "Voucher điện tử là phiếu giảm giá kỹ thuật số, được lưu trữ trong tài khoản và sử dụng tại cửa hàng bằng cách xuất trình mã QR hoặc mã code." },
  { q: "Làm sao để sử dụng voucher?", a: "Sau khi mua, voucher được lưu trong mục 'Voucher của tôi'. Khi đến cửa hàng, nhấn vào voucher để hiển thị QR code và nhờ nhân viên quét." },
  { q: "Voucher có hết hạn không?", a: "Có. Mỗi voucher có ngày hết hạn riêng. Bạn có thể xem thời hạn trong chi tiết voucher hoặc email xác nhận mua hàng." },
  { q: "Có thể hoàn tiền nếu không dùng được?", a: "ASA Voucher hỗ trợ hoàn tiền trong vòng 7 ngày kể từ ngày mua, với điều kiện voucher chưa được sử dụng." },
]

const EMPTY_SUMMARY: HomepageSummary = {
  vouchers: 0,
  partners: 0,
  customers: 0,
  maxDiscount: 0,
  categoryCounts: [],
}

function formatCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value)
}

export function GuestHomePage({ viewer = "guest", onNavigate, onVoucherDetail, onLogin, onAddToCart, onBuyNow, onOpenArticle }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [categories, setCategories] = useState<GuestCategory[]>([])
  const [homepageSummary, setHomepageSummary] = useState<HomepageSummary>(EMPTY_SUMMARY)
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadVouchers() {
      setIsLoadingVouchers(true)
      try {
        const [voucherPage, categoryItems, summary] = await Promise.all([
          voucherService.listPublicVouchersPage({ limit: 12 }),
          voucherService.listCategories(),
          voucherService.getHomepageSummary(),
        ])
        if (!isMounted) return
        setVouchers(voucherPage.items)
        setCategories(categoryItems)
        setHomepageSummary(summary)
      } catch {
        if (!isMounted) return
        setVouchers([])
        setCategories([])
        setHomepageSummary(EMPTY_SUMMARY)
      } finally {
        if (isMounted) setIsLoadingVouchers(false)
      }
    }

    loadVouchers()
    return () => {
      isMounted = false
    }
  }, [])

  const availableVouchers = useMemo(() => vouchers.filter(isVoucherAvailable), [vouchers])
  const featured = useMemo(() => availableVouchers.slice(0, 6), [availableVouchers])
  const flashSale = useMemo(() => availableVouchers.filter((v) => v.discount >= 30).slice(0, 4), [availableVouchers])

  const categoryCountsById = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of homepageSummary.categoryCounts) {
      counts.set(item.categoryId, item.count)
    }
    return counts
  }, [homepageSummary.categoryCounts])

  const visibleCategories = useMemo(() => categories.slice(0, 8), [categories])

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden py-20 px-4"
        style={{
          background: `linear-gradient(135deg, ${C.indigo} 0%, #4D5170 50%, #5A5E7A 100%)`,
        }}
      >
        {/* Background blobs */}
        <div className="absolute top-10 right-20 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: C.peach, filter: "blur(60px)" }} />
        <div className="absolute bottom-0 left-10 w-48 h-48 rounded-full opacity-10" style={{ backgroundColor: C.teal, filter: "blur(50px)" }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5 border border-white/20" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: C.apricot }}>
            <Zap className="w-3 h-3" /> {homepageSummary.vouchers > 0 ? `Đang có ${formatCount(homepageSummary.vouchers)} voucher ưu đãi` : "Chưa có voucher ưu đãi"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Tiết kiệm thông minh<br />với <span style={{ color: C.apricot }}>ASA Voucher</span>
          </h1>
          <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.75)" }}>
            {homepageSummary.vouchers > 0
              ? `Mua voucher điện tử từ ${formatCount(homepageSummary.partners)} thương hiệu. Ưu đãi cao nhất hiện có ${formatCount(homepageSummary.maxDiscount)}%, sử dụng tại cửa hàng áp dụng.`
              : "Khám phá voucher điện tử từ các thương hiệu đang hoạt động trên ASA Voucher."}
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-10">
            {[
              { label: "Voucher", value: formatCount(homepageSummary.vouchers) },
              { label: "Thương hiệu", value: formatCount(homepageSummary.partners) },
              { label: "Khách hàng", value: formatCount(homepageSummary.customers) },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black" style={{ color: C.apricot, fontFamily: "'Nunito', sans-serif" }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner carousel */}
      <section className="px-4 pt-6">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl border border-black/5 bg-white p-2 sm:p-3 shadow-sm">
            <BannerCarousel />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-14 px-4" style={{ backgroundColor: C.eggshell }}>
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            eyebrow="Danh mục"
            title="Danh mục nổi bật"
            subtitle="Khám phá ưu đãi theo từng nhóm nhu cầu"
            action={{ label: "Xem tất cả", onClick: () => onNavigate("categories") }}
          />
          {isLoadingVouchers ? (
            <div className="text-sm" style={{ color: "#6B7280" }}>Đang tải danh mục...</div>
          ) : visibleCategories.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {visibleCategories.map((cat, index) => {
                const style = CATEGORY_STYLES[index % CATEGORY_STYLES.length]
                return (
                  <button
                    key={cat.id}
                    onClick={() => onNavigate("vouchers")}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:shadow-md transition-all group"
                    style={{ backgroundColor: style.color }}
                  >
                    <AppIcon name={style.icon} className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold text-center leading-tight" style={{ color: C.indigo }}>{cat.name}</div>
                    <div className="text-[10px]" style={{ color: "#6B7280" }}>{formatCount(categoryCountsById.get(cat.id) ?? 0)}</div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-5 text-sm shadow-sm border border-black/5" style={{ color: "#6B7280" }}>Chưa có danh mục nào.</div>
          )}
        </div>
      </section>

      {/* Flash Sale */}
      <section className="py-14 px-4" style={{ backgroundColor: "#FFF5F0" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-white text-sm" style={{ backgroundColor: C.peach }}>
                <Zap className="w-3.5 h-3.5" /> FLASH SALE
              </div>
              <div>
                <div className="text-lg font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Ưu đãi sốc hôm nay</div>
                <div className="text-xs mt-0.5" style={{ color: "#8A8DA8" }}>Giảm từ 30% trở lên, số lượng có hạn</div>
              </div>
            </div>
            <button onClick={() => onNavigate("vouchers")} className="flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: C.peach }}>
              Xem thêm <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {isLoadingVouchers ? (
            <div className="text-sm" style={{ color: "#6B7280" }}>Đang tải voucher flash sale...</div>
          ) : flashSale.length === 0 ? (
            <div className="rounded-xl bg-white p-5 text-sm shadow-sm border border-black/5" style={{ color: "#6B7280" }}>Chưa có voucher flash sale.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {flashSale.map((v) => (
                <VoucherCard key={v.id} voucher={v} onDetail={onVoucherDetail} onAddToCart={onAddToCart} onBuyNow={onBuyNow} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Vouchers */}
      <section className="py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            eyebrow="Gợi ý cho bạn"
            title="Voucher nổi bật"
            subtitle="Chọn lọc những ưu đãi được yêu thích nhất"
            action={{ label: "Xem tất cả", onClick: () => onNavigate("vouchers") }}
          />
          {isLoadingVouchers ? (
            <div className="text-sm" style={{ color: "#6B7280" }}>Đang tải voucher nổi bật...</div>
          ) : featured.length === 0 ? (
            <div className="rounded-xl bg-white p-5 text-sm shadow-sm border border-black/5" style={{ color: "#6B7280" }}>Chưa có voucher nổi bật.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((v) => (
                <VoucherCard key={v.id} voucher={v} onDetail={onVoucherDetail} onAddToCart={onAddToCart} onBuyNow={onBuyNow} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* News / Articles */}
      <LazyNewsSection onOpenArticle={onOpenArticle} />

      {/* How it works */}
      <section className="py-14 px-4" style={{ backgroundColor: "#EAF2EE" }}>
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Quy trình mua voucher</h2>
          <p className="text-sm mb-10" style={{ color: "#6B7280" }}>Đơn giản, nhanh chóng, an toàn</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { icon: <Search className="w-6 h-6" />, title: "Tìm voucher", desc: "Tìm kiếm và chọn voucher phù hợp với nhu cầu" },
              { icon: <Smartphone className="w-6 h-6" />, title: "Thanh toán", desc: "Thanh toán an toàn qua VNPay, PayPal" },
              { icon: <ShieldCheck className="w-6 h-6" />, title: "Nhận voucher", desc: "Voucher được gửi ngay sau khi thanh toán thành công" },
              { icon: <TrendingUp className="w-6 h-6" />, title: "Sử dụng", desc: "Xuất trình QR code tại cửa hàng và tận hưởng ưu đãi" },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 shadow-md" style={{ backgroundColor: C.peach }}>
                  {step.icon}
                </div>
                <div className="font-black text-sm mb-1" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{step.title}</div>
                <div className="text-xs text-center leading-relaxed" style={{ color: "#6B7280" }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-4" style={{ backgroundColor: C.muted }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Câu hỏi thường gặp</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/4">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-bold text-sm" style={{ color: C.indigo }}>{f.q}</span>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} style={{ color: C.peach }} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "#4B5563" }}>{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-14 px-4" style={{ background: `linear-gradient(135deg, ${C.peach}, #C96A4C)` }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Bắt đầu tiết kiệm ngay hôm nay</h2>
          <p className="text-white/80 mb-6 text-sm">Đăng ký miễn phí để lưu voucher yêu thích và theo dõi đơn hàng của bạn</p>
          <div className="flex justify-center gap-3">
            {viewer === "guest" && (
              <button onClick={onLogin} className="px-6 py-3 rounded-xl font-bold text-sm bg-white hover:bg-opacity-90 transition-all" style={{ color: C.peach }}>
                Đăng nhập
              </button>
            )}
            <button onClick={() => onNavigate("vouchers")} className="px-6 py-3 rounded-xl font-bold text-sm border-2 border-white text-white hover:bg-white/10 transition-all">
              Khám phá ngay
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function VoucherCard({ voucher: v, onDetail, onAddToCart, onBuyNow }: { voucher: Voucher; onDetail: (v: Voucher) => void; onAddToCart: (v: Voucher) => void; onBuyNow: (v: Voucher) => void }) {
  const pct = Math.round(((v.originalPrice - v.price) / v.originalPrice) * 100)
  const isAvailable = isVoucherAvailable(v)
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onDetail(v)}>
      <div className="relative h-40 overflow-hidden">
        {v.image ? (
          <img src={v.image} alt={v.title} width={640} height={360} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-100 text-xs font-semibold" style={{ color: "#8A8DA8" }}>
            <AppIcon name="gift" className="h-8 w-8" />
            Chưa có ảnh
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-white text-xs font-bold" style={{ backgroundColor: C.peach }}>
          -{pct}%
        </div>
      </div>
      <div className="p-4">
        <div className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: C.teal }}><AppIcon name={v.partnerLogo} className="w-3.5 h-3.5" /> {v.partnerName}</div>
        <div className="font-bold text-sm mb-2 line-clamp-2 leading-snug" style={{ color: C.indigo }}>{v.title}</div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-black text-base" style={{ color: C.peach }}>{fmt(v.price)}</span>
          <span className="text-xs line-through" style={{ color: "#9CA3AF" }}>{fmt(v.originalPrice)}</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 text-xs" style={{ color: "#6B7280" }}>
            <Star className="w-3 h-3 fill-current" style={{ color: C.apricot }} />
            {v.rating} ({v.reviews})
          </div>
        </div>
        {isAvailable ? <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(v) }}
            className="rounded-lg border px-2 py-1.5 text-xs font-bold"
            style={{ borderColor: C.peach, color: C.peach }}
          >
            + Giỏ hàng
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onBuyNow(v) }}
            className="rounded-lg px-2 py-1.5 text-xs font-bold text-white"
            style={{ backgroundColor: C.peach }}
          >
            Mua ngay
          </button>
        </div> : <div className="rounded-lg bg-gray-100 px-3 py-2 text-center text-xs font-bold text-gray-500">Không khả dụng</div>}
      </div>
    </div>
  )
}
