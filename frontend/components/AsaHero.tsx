import { ArrowRight, Clock3, QrCode, ShieldCheck, Ticket } from "lucide-react"

interface AsaHeroProps {
  onNavigate: (page: "vouchers") => void
}

const testimonials = [
  { position: "top-left", quote: "Mua nhanh, dùng voucher rất tiện.", name: "Minh Anh" },
  { position: "top-right", quote: "Giá tốt hơn mua trực tiếp.", name: "Hoàng Nam" },
  { position: "bottom-left", quote: "Nhiều thương hiệu để lựa chọn.", name: "Thu Trang" },
  { position: "bottom-right", quote: "Thanh toán xong là có mã ngay.", name: "Đức Minh" },
]

export function AsaHero({ onNavigate }: AsaHeroProps) {
  const goToVouchers = () => onNavigate("vouchers")

  return (
    <section className="asa-hero" aria-labelledby="asa-hero-title">
      <div className="asa-hero__inner">
        <div className="asa-hero__copy">
          <div className="asa-hero__eyebrow"><span className="asa-hero__eyebrow-dot" /> Ưu đãi mỗi ngày</div>
          <h1 id="asa-hero-title">Voucher xịn,<span> giá tốt hơn.</span></h1>
          <p>ASA giúp bạn tìm thấy voucher từ những thương hiệu uy tín cho ăn uống, mua sắm, giải trí, làm đẹp và du lịch — tiện lợi hơn, tiết kiệm hơn.</p>
          <div className="asa-hero__actions">
            <button type="button" className="asa-hero__primary" onClick={goToVouchers}>Khám phá voucher <ArrowRight aria-hidden="true" size={18} /></button>
            <button type="button" className="asa-hero__secondary" onClick={goToVouchers}>Xem ưu đãi nổi bật</button>
          </div>
          <div className="asa-hero__trust"><span><ShieldCheck aria-hidden="true" size={16} /> Đối tác uy tín</span><span><Ticket aria-hidden="true" size={16} /> Nhận mã tức thì</span></div>
        </div>

        <div className="asa-hero__visual" aria-label="Voucher Highlands Coffee nổi bật trên ASA">
          {/* <div className="asa-hero__visual-label"><span /> Gợi ý hôm nay</div> */}
          <div className="asa-hero__orbit orbit-one" /><div className="asa-hero__orbit orbit-two" />
          {testimonials.map((testimonial, index) => (
            <article key={testimonial.name} className={`asa-testimonial asa-testimonial--${testimonial.position} asa-testimonial--delay-${index}`}>
              <div className="asa-testimonial__stars" aria-label="5 sao">★★★★★</div>
              <p>“{testimonial.quote}”</p><span>— {testimonial.name}</span>
            </article>
          ))}
          <article className="asa-voucher">
            <div className="asa-voucher__topline"><div className="asa-voucher__brand"><span className="asa-voucher__brand-mark">H</span> Highlands Coffee</div><span className="asa-voucher__asa-mark">ASA</span></div>
            <div className="asa-voucher__image"><div className="asa-voucher__coffee-glow" /><div className="asa-voucher__cup"><span>H</span></div><div className="asa-voucher__image-copy">Một chút<br /><strong>thảnh thơi</strong></div><span className="asa-voucher__discount">-15%</span></div>
            <div className="asa-voucher__body"><div><p className="asa-voucher__label">VOUCHER ĐIỆN TỬ</p><h2>Voucher 100.000đ</h2><p className="asa-voucher__price">Chỉ từ <strong>85.000đ</strong></p></div><QrCode aria-hidden="true" className="asa-voucher__qr" size={42} /></div>
            <div className="asa-voucher__footer"><span><Clock3 aria-hidden="true" size={13} /> Hạn dùng: 30/06/2026</span><span>Mã: ASA15</span></div>
          </article>
          <div className="asa-hero__category-chip chip-hot">Ăn uống</div><div className="asa-hero__category-chip chip-hot">★ Bán chạy</div>
        </div>
      </div>
    </section>
  )
}
