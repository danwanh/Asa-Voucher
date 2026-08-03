import { useState } from "react"
import { AppIcon } from "@/components/AppIcon"
import { toast } from "sonner"
import { GuestLayout, type GuestPage } from "@/layouts/GuestLayout"
import { GuestHomePage } from "@/pages/guest/GuestHomePage"
import { GuestVoucherListPage } from "@/pages/guest/GuestVoucherListPage"
import { GuestVoucherDetailPage } from "@/pages/guest/GuestVoucherDetailPage"
import { CartPage } from "@/pages/customer/CartPage"
import type { Voucher, CartItem } from "@/types"

interface Props {
  onLogin: () => void
  onRegister: () => void
  // Called when guest clicks "Tiến hành đặt hàng" — triggers login then redirects to create-order
  onCheckout: () => void
  cartAdd: (v: Voucher) => void
  cartCount: number
}

// GuestApp manages the cart display only; cart state lives in App.tsx
// We receive cartAdd/cartCount for display, but need the full cart for CartPage.
// CartPage needs remove/update too — so we also accept those via context from App.
// Simplest: GuestApp receives the full cart API.

interface FullProps {
  onLogin: () => void
  onRegister: () => void
  onCheckout: () => void
  cartAdd: (v: Voucher) => void
  cartCount: number
}

export function GuestApp({ onLogin, onRegister, onCheckout, cartAdd, cartCount }: FullProps) {
  const [page, setPage] = useState<GuestPage>("home")
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)

  const goDetail = (v: Voucher) => {
    setSelectedVoucher(v)
    setPage("detail")
  }

  const handleAddToCart = (v: Voucher) => {
    cartAdd(v)
    toast.success(`Đã thêm "${v.title.slice(0, 30)}..." vào giỏ hàng`)
  }

  const handleBuyNow = (v: Voucher) => {
    cartAdd(v)
    onCheckout()
  }

  return (
    <GuestLayout
      page={page}
      onNavigate={setPage}
      onLogin={onLogin}
       onRegister={onRegister}
      cartCount={cartCount}
    >
      {page === "home" && (
        <GuestHomePage
          onNavigate={setPage}
          onVoucherDetail={goDetail}
          onLogin={onLogin}
          onAddToCart={handleAddToCart}
        />
      )}
      {page === "vouchers" && (
        <GuestVoucherListPage
          onDetail={goDetail}
          onLogin={onLogin}
          onAddToCart={handleAddToCart}
        />
      )}
      {page === "detail" && selectedVoucher && (
        <GuestVoucherDetailPage
          voucher={selectedVoucher}
          onBack={() => setPage("vouchers")}
          onLogin={onLogin}
          onDetail={goDetail}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      )}
      {page === "cart" && (
        <GuestCartPage
          cartCount={cartCount}
          onCheckout={onCheckout}
          onContinue={() => setPage("vouchers")}
          onLogin={onLogin}
        />
      )}
      {page === "categories" && (
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-black mb-6" style={{ fontFamily: "'Nunito', sans-serif", color: "#3D405B" }}>Tất cả danh mục</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
               { icon: "gift", name: "Ẩm thực", count: 45, color: "#FDEBD0" },
               { icon: "heart", name: "Làm đẹp", count: 32, color: "#FCE4EC" },
               { icon: "location", name: "Du lịch", count: 28, color: "#E3F2FD" },
               { icon: "ticket", name: "Giải trí", count: 21, color: "#EDE7F6" },
               { icon: "shield", name: "Thể thao", count: 8, color: "#E8F5E9" },
               { icon: "document", name: "Giáo dục", count: 5, color: "#FFF8E1" },
               { icon: "shield", name: "Sức khỏe", count: 14, color: "#E0F7FA" },
               { icon: "shoppingCart", name: "Mua sắm", count: 19, color: "#F3E5F5" },
            ].map((cat) => (
              <button
                key={cat.name}
                onClick={() => setPage("vouchers")}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl hover:shadow-md transition-all"
                style={{ backgroundColor: cat.color }}
              >
                <AppIcon name={cat.icon} className="w-12 h-12" />
                <div className="font-black text-sm" style={{ color: "#3D405B" }}>{cat.name}</div>
                <div className="text-xs" style={{ color: "#6B7280" }}>{cat.count} voucher</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {page === "about" && (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <AppIcon name="ticket" className="w-16 h-16 mb-4 mx-auto" />
          <h1 className="text-3xl font-black mb-4" style={{ fontFamily: "'Nunito', sans-serif", color: "#3D405B" }}>Về ASA Voucher</h1>
          <p className="text-base leading-relaxed" style={{ color: "#4B5563" }}>
            ASA Voucher là nền tảng mua bán voucher điện tử hàng đầu Việt Nam, kết nối hàng trăm thương hiệu uy tín với hàng triệu khách hàng. Chúng tôi cung cấp trải nghiệm mua voucher đơn giản, an toàn và tiết kiệm nhất.
          </p>
        </div>
      )}
      {page === "contact" && (
        <div className="max-w-2xl mx-auto px-4 py-16">
          <h1 className="text-3xl font-black mb-8 text-center" style={{ fontFamily: "'Nunito', sans-serif", color: "#3D405B" }}>Liên hệ</h1>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-black/5">
            <div className="grid gap-4">
              {[
                { label: "Họ tên", placeholder: "Nguyễn Văn A" },
                { label: "Email", placeholder: "email@example.com" },
                { label: "Chủ đề", placeholder: "Tôi cần hỗ trợ về..." },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-sm font-bold mb-1" style={{ color: "#3D405B" }}>{f.label}</label>
                  <input placeholder={f.placeholder} className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: "#E5E7EB" }} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: "#3D405B" }}>Tin nhắn</label>
                <textarea rows={4} placeholder="Nhập tin nhắn..." className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none" style={{ borderColor: "#E5E7EB" }} />
              </div>
              <button className="w-full py-3 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: "#E07A5F" }}>Gửi tin nhắn</button>
            </div>
          </div>
        </div>
      )}
    </GuestLayout>
  )
}

// Lightweight guest cart page — shows item count and prompts login at checkout
function GuestCartPage({
  cartCount,
  onCheckout,
  onContinue,
  onLogin,
}: {
  cartCount: number
  onCheckout: () => void
  onContinue: () => void
  onLogin: () => void
}) {
  const C_indigo = "#3D405B"
  const C_peach = "#E07A5F"
  const C_teal = "#81B29A"

  if (cartCount === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AppIcon name="shoppingCart" className="w-16 h-16 mb-4 mx-auto" />
        <h2 className="text-xl font-black mb-2" style={{ color: C_indigo }}>Giỏ hàng trống</h2>
        <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>Hãy khám phá và thêm voucher bạn yêu thích vào giỏ hàng</p>
        <button onClick={onContinue} className="px-6 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: C_peach }}>
          Mua sắm ngay
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <AppIcon name="shoppingCart" className="w-16 h-16 mb-4 mx-auto" />
      <h2 className="text-2xl font-black mb-2" style={{ color: C_indigo }}>Giỏ hàng của bạn</h2>
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl mb-6 font-bold text-sm"
        style={{ backgroundColor: C_peach + "18", color: C_peach }}
      >
        {cartCount} sản phẩm đã thêm
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 mb-6">
        <div className="text-sm mb-4" style={{ color: "#6B7280" }}>
          Đăng nhập để tiến hành đặt hàng. Giỏ hàng của bạn sẽ được giữ nguyên sau khi đăng nhập.
        </div>
        <button
          onClick={onCheckout}
          className="w-full py-3.5 rounded-2xl font-black text-white mb-3 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: C_peach }}
        >
          Đăng nhập &amp; Tiến hành đặt hàng
        </button>
        <button
          onClick={onLogin}
          className="w-full py-3 rounded-2xl font-bold border-2 text-sm"
          style={{ borderColor: C_indigo, color: C_indigo }}
        >
          Chỉ đăng nhập
        </button>
      </div>

      <button onClick={onContinue} className="text-sm font-semibold hover:underline" style={{ color: "#8A8DA8" }}>
        Tiếp tục mua sắm
      </button>
    </div>
  )
}
