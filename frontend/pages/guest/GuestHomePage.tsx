import { useEffect, useMemo, useState } from "react"
import { Search, Star, ChevronRight, Zap, ShieldCheck, Smartphone, TrendingUp, ChevronDown } from "lucide-react"
import { C, fmt } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Voucher } from "@/types"
import { voucherService } from "@/services/voucherService"

interface Props {
  onNavigate: (p: string) => void
  onVoucherDetail: (v: Voucher) => void
  onLogin: () => void
  onAddToCart: (v: Voucher) => void
}

const CATEGORIES = [
  { icon: "gift", name: "Ẩm thực", count: 45, color: "#FDEBD0" },
  { icon: "heart", name: "Làm đẹp", count: 32, color: "#FCE4EC" },
  { icon: "location", name: "Du lịch", count: 28, color: "#E3F2FD" },
  { icon: "ticket", name: "Giải trí", count: 21, color: "#EDE7F6" },
  { icon: "shield", name: "Thể thao", count: 8, color: "#E8F5E9" },
  { icon: "document", name: "Giáo dục", count: 5, color: "#FFF8E1" },
  { icon: "shield", name: "Sức khỏe", count: 14, color: "#E0F7FA" },
  { icon: "shoppingCart", name: "Mua sắm", count: 19, color: "#F3E5F5" },
]

const REVIEWS = [
  { name: "Nguyễn Thị Lan", avatar: "user", rating: 5, text: "Dịch vụ tuyệt vời! Mua voucher rất dễ dàng, tiết kiệm được nhiều tiền.", date: "05/07/2026" },
  { name: "Trần Văn Hùng", avatar: "user", rating: 5, text: "Nhiều voucher hấp dẫn, giá tốt. Sẽ tiếp tục sử dụng ASA Voucher!", date: "03/07/2026" },
  { name: "Phạm Minh Châu", avatar: "user", rating: 4, text: "App dễ dùng, tìm voucher nhanh. Chăm sóc khách hàng nhiệt tình.", date: "01/07/2026" },
]

const FAQ = [
  { q: "Voucher điện tử là gì?", a: "Voucher điện tử là phiếu giảm giá kỹ thuật số, được lưu trữ trong tài khoản và sử dụng tại cửa hàng bằng cách xuất trình mã QR hoặc mã code." },
  { q: "Làm sao để sử dụng voucher?", a: "Sau khi mua, voucher được lưu trong mục 'Voucher của tôi'. Khi đến cửa hàng, nhấn vào voucher để hiển thị QR code và nhờ nhân viên quét." },
  { q: "Voucher có hết hạn không?", a: "Có. Mỗi voucher có ngày hết hạn riêng. Bạn có thể xem thời hạn trong chi tiết voucher hoặc email xác nhận mua hàng." },
  { q: "Có thể hoàn tiền nếu không dùng được?", a: "ASA Voucher hỗ trợ hoàn tiền trong vòng 7 ngày kể từ ngày mua, với điều kiện voucher chưa được sử dụng." },
]

export function GuestHomePage({ onNavigate, onVoucherDetail, onLogin, onAddToCart }: Props) {
  const [search, setSearch] = useState("")
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadVouchers() {
      setIsLoadingVouchers(true)
      try {
        const items = await voucherService.listPublicVouchers({ limit: 100 })
        if (!isMounted) return
        setVouchers(items)
      } catch {
        if (!isMounted) return
        setVouchers([])
      } finally {
        if (isMounted) setIsLoadingVouchers(false)
      }
    }

    loadVouchers()
    return () => {
      isMounted = false
    }
  }, [])

  const featured = useMemo(() => vouchers.filter((v) => v.status === "active").slice(0, 6), [vouchers])
  const flashSale = useMemo(() => vouchers.filter((v) => v.discount >= 30).slice(0, 4), [vouchers])

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const voucher of vouchers) {
      counts.set(voucher.category, (counts.get(voucher.category) ?? 0) + 1)
    }
    return counts
  }, [vouchers])

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
            <Zap className="w-3 h-3" /> Hơn 1,000+ voucher ưu đãi mỗi ngày
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Tiết kiệm thông minh<br />với <span style={{ color: C.apricot }}>ASA Voucher</span>
          </h1>
          <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.75)" }}>
            Mua voucher điện tử từ hàng trăm thương hiệu uy tín. Giảm giá đến 70%, sử dụng ngay tại cửa hàng.
          </p>

          {/* Search */}
          <div className="flex gap-2 max-w-xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onNavigate("vouchers")}
                placeholder="Tìm voucher, thương hiệu..."
                className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm outline-none border-2 border-transparent focus:border-opacity-60"
                style={{ backgroundColor: "white", color: C.indigo, fontFamily: "'Inter', sans-serif" }}
              />
            </div>
            <button
              onClick={() => onNavigate("vouchers")}
              className="px-6 py-3.5 rounded-xl font-bold text-sm text-white whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{ backgroundColor: C.peach }}
            >
              Tìm kiếm
            </button>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-10">
            {[
              { label: "Voucher", value: "5,000+" },
              { label: "Thương hiệu", value: "200+" },
              { label: "Khách hàng", value: "50,000+" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black" style={{ color: C.apricot, fontFamily: "'Nunito', sans-serif" }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Danh mục nổi bật</h2>
            <button onClick={() => onNavigate("categories")} className="flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: C.peach }}>
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => onNavigate("vouchers")}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:shadow-md transition-all group"
                style={{ backgroundColor: cat.color }}
              >
                <AppIcon name={cat.icon} className="w-8 h-8 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-center leading-tight" style={{ color: C.indigo }}>{cat.name}</div>
                <div className="text-[10px]" style={{ color: "#6B7280" }}>{categoryCounts.get(cat.name.toLowerCase()) ?? cat.count}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Flash Sale */}
      <section className="py-10 px-4" style={{ backgroundColor: "#FFF5F0" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-white text-sm" style={{ backgroundColor: C.peach }}>
                <Zap className="w-3.5 h-3.5" /> FLASH SALE
              </div>
              <div className="text-lg font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Ưu đãi sốc hôm nay</div>
            </div>
            <button onClick={() => onNavigate("vouchers")} className="flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: C.peach }}>
              Xem thêm <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {isLoadingVouchers ? (
            <div className="text-sm" style={{ color: "#6B7280" }}>Đang tải voucher flash sale...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {flashSale.map((v) => (
                <VoucherCard key={v.id} voucher={v} onDetail={onVoucherDetail} onBuy={onAddToCart} isGuest />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Vouchers */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Voucher nổi bật</h2>
            <button onClick={() => onNavigate("vouchers")} className="flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: C.peach }}>
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {isLoadingVouchers ? (
            <div className="text-sm" style={{ color: "#6B7280" }}>Đang tải voucher nổi bật...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((v) => (
                <VoucherCard key={v.id} voucher={v} onDetail={onVoucherDetail} onBuy={onAddToCart} isGuest />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 px-4" style={{ backgroundColor: C.muted }}>
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Quy trình mua voucher</h2>
          <p className="text-sm mb-10" style={{ color: "#6B7280" }}>Đơn giản, nhanh chóng, an toàn</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { icon: <Search className="w-6 h-6" />, title: "Tìm voucher", desc: "Tìm kiếm và chọn voucher phù hợp với nhu cầu" },
              { icon: <Smartphone className="w-6 h-6" />, title: "Thanh toán", desc: "Thanh toán an toàn qua VNPay, MoMo, ZaloPay" },
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

      {/* Customer Reviews */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Khách hàng nói gì?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REVIEWS.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-black/4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><AppIcon name={r.avatar} className="w-5 h-5" /></div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: C.indigo }}>{r.name}</div>
                    <div className="flex gap-0.5 mt-0.5">
                      {[...Array(r.rating)].map((_, j) => (
                        <Star key={j} className="w-3 h-3 fill-current" style={{ color: C.apricot }} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#4B5563" }}>{r.text}</p>
                <div className="text-xs mt-3" style={{ color: "#9CA3AF" }}>{r.date}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4" style={{ backgroundColor: C.muted }}>
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
          <p className="text-white/80 mb-6 text-sm">Đăng ký miễn phí và nhận ngay voucher chào mừng trị giá 50,000đ</p>
          <div className="flex justify-center gap-3">
            <button onClick={onLogin} className="px-6 py-3 rounded-xl font-bold text-sm bg-white hover:bg-opacity-90 transition-all" style={{ color: C.peach }}>
              Đăng nhập
            </button>
            <button onClick={() => onNavigate("vouchers")} className="px-6 py-3 rounded-xl font-bold text-sm border-2 border-white text-white hover:bg-white/10 transition-all">
              Khám phá ngay
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function VoucherCard({ voucher: v, onDetail, onBuy, isGuest }: { voucher: Voucher; onDetail: (v: Voucher) => void; onBuy: (v: Voucher) => void; isGuest?: boolean }) {
  const pct = Math.round(((v.originalPrice - v.price) / v.originalPrice) * 100)
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onDetail(v)}>
      <div className="relative h-40 overflow-hidden">
        <img src={v.image} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs" style={{ color: "#6B7280" }}>
            <Star className="w-3 h-3 fill-current" style={{ color: C.apricot }} />
            {v.rating} ({v.reviews})
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onBuy(v) }}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: C.peach }}
          >
            + Giỏ hàng
          </button>
        </div>
      </div>
    </div>
  )
}
