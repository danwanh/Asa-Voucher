import { Coffee, QrCode, Star, TrendingDown, UserRound, Zap } from "lucide-react"

import { C } from "../utils/constants"

interface AsaHeroProps {
  onNavigate: (page: "vouchers") => void
}

export function AsaHero({ onNavigate }: AsaHeroProps) {
  const goToVouchers = () => onNavigate("vouchers")
  const stats = [
    { value: "5,000+", label: "Voucher" },
    { value: "200+", label: "Thương hiệu" },
    { value: "50K+", label: "Khách hàng" },
  ]

  return (
    <section className="relative overflow-hidden bg-white">
      <style>{`
        @keyframes vFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        @keyframes vFloat2 { 0%,100% { transform: translateY(0) rotate(-2deg) } 50% { transform: translateY(-9px) rotate(2deg) } }
        @keyframes vFloat3 { 0%,100% { transform: translateY(0) rotate(1deg) } 50% { transform: translateY(-11px) rotate(-1deg) } }
        @keyframes vFloat4 { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
        .vf1 { animation: vFloat 4s ease-in-out infinite }
        .vf2 { animation: vFloat2 5s ease-in-out infinite .6s }
        .vf3 { animation: vFloat3 3.8s ease-in-out infinite 1.1s }
        .vf4 { animation: vFloat4 6s ease-in-out infinite 1.8s }
        @media (prefers-reduced-motion: reduce) { .vf1,.vf2,.vf3,.vf4 { animation: none } }
      `}</style>

      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${C.apricot}28 0%, transparent 70%)`, transform: "translate(-30%, -30%)" }} />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full" style={{ background: `radial-gradient(circle, ${C.teal}18 0%, transparent 70%)`, transform: "translate(25%, 30%)" }} />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:px-10 md:py-24 lg:gap-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold" style={{ borderColor: `${C.peach}55`, color: C.peach, backgroundColor: `${C.peach}10` }}>
            <Zap aria-hidden="true" className="h-3 w-3" /> Ưu đãi mỗi ngày — 5,000+ voucher đang chờ
          </div>
          <h1 className="mb-5 text-5xl font-black leading-[1.08] tracking-tight md:text-6xl" style={{ color: C.indigo, fontFamily: "'Montserrat', sans-serif" }}>
            Voucher xịn,<br /><span style={{ color: C.peach }}>giá tốt hơn.</span>
          </h1>
          <p className="mb-9 max-w-md text-base leading-relaxed" style={{ color: "#6B7280" }}>
            Mua voucher điện tử từ 200+ thương hiệu uy tín — Highlands Coffee, Gong Cha, CGV và nhiều hơn nữa. Thanh toán nhanh, dùng ngay tại cửa hàng.
          </p>
          <div className="mb-10 flex flex-wrap gap-3">
            <button type="button" onClick={goToVouchers} className="rounded-xl px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:opacity-90" style={{ backgroundColor: C.peach, boxShadow: `0 6px 20px ${C.peach}50` }}>Khám phá voucher</button>
            <button type="button" onClick={goToVouchers} className="rounded-xl border-2 px-7 py-3.5 text-sm font-bold transition-all hover:bg-slate-50" style={{ borderColor: `${C.indigo}30`, color: C.indigo }}>Xem ưu đãi nổi bật →</button>
          </div>
          <div className="flex gap-8 pt-2">
            {stats.map((stat, index) => <div key={stat.label} className="flex items-start gap-0">
              {index > 0 && <div className="mr-8 h-10 w-px self-center" style={{ backgroundColor: "#E5E7EB" }} />}
              <div><div className="text-xl font-black" style={{ color: C.indigo, fontFamily: "'Montserrat', sans-serif" }}>{stat.value}</div><div className="mt-0.5 text-xs" style={{ color: "#9CA3AF" }}>{stat.label}</div></div>
            </div>)}
          </div>
        </div>

        <div className="relative hidden items-center justify-center md:flex" style={{ minHeight: 480 }}>
          <div className="absolute inset-0 mx-auto max-w-[440px] rounded-3xl" style={{ backgroundColor: "#F3F4F6", left: "50%", transform: "translateX(-50%)" }} />
          <div className="vf1 relative z-10 w-72 overflow-hidden rounded-2xl shadow-2xl" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <div className="relative overflow-hidden px-5 pb-4 pt-5" style={{ background: "linear-gradient(135deg, #00563B 0%, #007A52 100%)" }}>
              <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white opacity-10" style={{ transform: "translate(35%,-35%)" }} /><div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-white opacity-10" style={{ transform: "translate(-40%,40%)" }} />
              <div className="relative z-10 mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm"><Coffee aria-hidden="true" className="h-4 w-4" style={{ color: "#00563B" }} /></div><span className="text-sm font-bold tracking-tight text-white">Highlands Coffee</span></div><div className="rounded-full px-2 py-0.5 text-xs font-black" style={{ backgroundColor: C.apricot, color: "#6B4A00" }}>-15%</div></div>
              <div className="relative z-10"><div className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/60">Voucher điện tử</div><div className="text-3xl font-black leading-none text-white">100.000đ</div><div className="mt-1 flex items-center gap-2"><span className="text-xs text-white/50 line-through">118.000đ</span><span className="text-xs font-bold" style={{ color: C.apricot }}>Chỉ từ 85.000đ</span></div></div>
            </div>
            <div className="bg-white px-5 py-4"><div className="mb-3.5 flex gap-1.5"><span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: "#E8F5E9", color: "#1B5E20" }}>Ẩm thực</span><span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: "#FFF8E1", color: "#E65100" }}>Còn 48</span></div><div className="flex items-center justify-between"><div><div className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>Mã voucher</div><div className="text-sm font-bold tracking-widest" style={{ color: C.indigo, fontFamily: "'Courier New', monospace" }}>ASA-HL-2026</div></div><div className="flex h-12 w-12 items-center justify-center rounded-lg border-2" style={{ borderColor: "#E5E7EB" }}><QrCode aria-hidden="true" className="h-9 w-9" style={{ color: C.indigo }} /></div></div><div className="mt-3.5 flex items-center justify-between border-t border-gray-100 pt-3.5"><div className="text-xs" style={{ color: "#9CA3AF" }}>HSD: 31/12/2026</div><div className="flex items-center gap-0.5">{[0, 1, 2, 3, 4].map((star) => <Star aria-hidden="true" key={star} className="h-2.5 w-2.5 fill-current" style={{ color: C.apricot }} />)}<span className="ml-1 text-xs font-bold" style={{ color: "#6B7280" }}>4.9</span></div></div></div>
          </div>

          <div className="vf2 absolute right-4 top-6 z-20 w-44 rounded-2xl border border-black/5 bg-white px-3.5 py-3 shadow-lg"><div className="mb-1.5 flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100"><UserRound aria-hidden="true" className="h-3.5 w-3.5" style={{ color: C.peach }} /></div><div><div className="text-xs font-bold leading-none" style={{ color: C.indigo }}>Nguyễn Thị Lan</div><div className="mt-0.5 flex gap-0.5">{[0, 1, 2, 3, 4].map((star) => <Star aria-hidden="true" key={star} className="h-2.5 w-2.5 fill-current" style={{ color: C.apricot }} />)}</div></div></div><p className="text-[11px] leading-relaxed" style={{ color: "#6B7280" }}>&quot;Tiết kiệm thật sự, dùng là nghiền!&quot;</p></div>
          <div className="vf3 absolute bottom-10 left-0 z-20 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-lg"><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: C.teal }}><TrendingDown aria-hidden="true" className="h-4 w-4" /></div><div><div className="text-[10px] font-semibold" style={{ color: "#9CA3AF" }}>Tiết kiệm hôm nay</div><div className="text-base font-black leading-none" style={{ color: C.indigo }}>-33.000đ</div></div></div></div>
          <div className="vf4 absolute bottom-6 right-2 z-20 flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-3.5 py-2.5 shadow-lg"><div className="flex -space-x-1.5">{[0, 1, 2].map((avatar) => <div key={avatar} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-100"><UserRound aria-hidden="true" className="h-3 w-3 text-gray-400" /></div>)}</div><div className="text-[11px] font-bold" style={{ color: C.indigo }}>1,200+ đánh giá</div></div>
          <div className="vf2 absolute left-3 top-12 z-20 flex h-12 w-12 rotate-[-8deg] items-center justify-center rounded-2xl text-sm font-black text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${C.peach}, #C96A4C)` }}>70%</div>
        </div>
      </div>
    </section>
  )
}
