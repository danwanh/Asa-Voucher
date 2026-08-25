import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { AppIcon } from "@/components/AppIcon"
import { PopupModal } from "@/components/PopupModal"
import { toast } from "sonner"
import { GuestLayout, type GuestPage } from "@/layouts/GuestLayout"
import type { Voucher, CartItem } from "@/types"
import { voucherService, type VoucherDetailData } from "@/services/voucherService"
import { LoadingState } from "@/components/LoadingState"
import { isVoucherAvailable } from "@/hooks/useCart"

const pageLoading = () => <LoadingState label="Đang tải trang..." variant="page" />
const CategoryGridPage = dynamic(() => import("@/components/CategoryGridPage").then((module) => module.CategoryGridPage), { loading: pageLoading })
const GuestHomePage = dynamic(() => import("@/pages/guest/GuestHomePage").then((module) => module.GuestHomePage), { loading: pageLoading })
const VoucherListPage = dynamic(() => import("@/pages/customer/VoucherListPage").then((module) => module.VoucherListPage), { loading: pageLoading })
const GuestVoucherDetailPage = dynamic(() => import("@/pages/guest/GuestVoucherDetailPage").then((module) => module.GuestVoucherDetailPage), { loading: pageLoading })
const CartPage = dynamic(() => import("@/pages/customer/CartPage").then((module) => module.CartPage), { loading: pageLoading })

interface Props {
  onLogin: () => void
  onRegister: () => void
  // Called when guest clicks "Tiến hành đặt hàng" — triggers login then redirects to create-order
  onCheckout: (items: CartItem[], kind?: "cart" | "direct") => void
  cartAdd: (v: Voucher) => Promise<CartItem | undefined>
  cartCount: number | null
  cartCountLoading?: boolean
  cart: CartItem[]
  total: number
  cartRemove: (id: string) => void
  cartUpdate: (id: string, qty: number) => void
  initialPage?: GuestPage
  initialVoucherId?: string
}

// GuestApp manages the cart display only; cart state lives in App.tsx
// We receive cartAdd/cartCount for display, but need the full cart for CartPage.
// CartPage needs remove/update too — so we also accept those via context from App.
// Simplest: GuestApp receives the full cart API.

interface FullProps {
  onLogin: () => void
  onRegister: () => void
  onCheckout: (items: CartItem[], kind?: "cart" | "direct") => void
  cartAdd: (v: Voucher) => Promise<CartItem | undefined>
  cartCount: number | null
  cartCountLoading?: boolean
  cart: CartItem[]
  total: number
  cartRemove: (id: string) => void
  cartUpdate: (id: string, qty: number) => void
  initialPage?: GuestPage
  initialVoucherId?: string
}

type VoucherListFilters = {
  categoryId: string
  partnerId: string
  area: string
  priceRange: string
  discountRange: string
  effectiveStatus: string
}

const DEFAULT_VOUCHER_FILTERS: VoucherListFilters = {
  categoryId: "all",
  partnerId: "all",
  area: "all",
  priceRange: "all",
  discountRange: "all",
  effectiveStatus: "all"
}

export function GuestApp({ onLogin, onRegister, onCheckout, cartAdd, cartCount, cartCountLoading = false, cart, total, cartRemove, cartUpdate, initialPage, initialVoucherId }: FullProps) {
  const router = useRouter()
  const [page, setPage] = useState<GuestPage>(initialPage ?? "home")
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [selectedVoucherDetail, setSelectedVoucherDetail] = useState<VoucherDetailData | null>(null)
  const [voucherSearch, setVoucherSearch] = useState("")
  const [voucherFilters, setVoucherFilters] = useState<VoucherListFilters>(DEFAULT_VOUCHER_FILTERS)

  useEffect(() => {
    setPage(initialPage ?? "home")
  }, [initialPage])

  useEffect(() => {
    if (!initialVoucherId) return
    void voucherService.getDetail(initialVoucherId).then((detail) => {
      setSelectedVoucher(detail.voucher)
      setSelectedVoucherDetail(detail)
    }).catch(() => {
      toast.error("Không thể tải chi tiết voucher.")
      router.push("/vouchers")
    })
  }, [initialVoucherId, router])

  const goDetail = (v: Voucher) => {
    router.push(`/vouchers/${v.id}`)
  }

  const navigate = (nextPage: GuestPage) => {
    setPage(nextPage)
    if (nextPage === "home") {
      setVoucherSearch("")
      setVoucherFilters(DEFAULT_VOUCHER_FILTERS)
      router.push("/")
    }
    else if (nextPage === "vouchers") router.push("/vouchers")
    else if (nextPage === "categories") router.push("/categories")
    else if (nextPage === "cart") router.push("/cart")
  }

  const handleVoucherSearchFocus = () => {
    if (page === "vouchers") return
    setPage("vouchers")
    router.push("/vouchers")
  }

  const handleAddToCart = async (v: Voucher) => {
    const item = await cartAdd(v)
    if (item) toast.success(`Đã thêm "${v.title.slice(0, 30)}..." vào giỏ hàng`)
  }

  const handleBuyNow = (v: Voucher) => {
    if (!isVoucherAvailable(v)) {
      toast.error("Voucher hiện không khả dụng.")
      return
    }
    onCheckout([{ voucher: v, qty: 1 }], "direct")
  }

  return (
    <>
    <GuestLayout
      page={page}
      onNavigate={navigate}
      onLogin={onLogin}
       onRegister={onRegister}
      cartCount={cartCount}
      cartCountLoading={cartCountLoading}
      voucherSearch={voucherSearch}
      onVoucherSearchChange={setVoucherSearch}
      onVoucherSearchFocus={handleVoucherSearchFocus}
    >
      {page === "home" && (
        <GuestHomePage
          onNavigate={(nextPage) => navigate(nextPage as GuestPage)}
          onVoucherDetail={goDetail}
          onLogin={onLogin}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onOpenArticle={(id) => router.push(`/news/${id}`)}
        />
      )}
      {page === "vouchers" && (
        <VoucherListPage
          onDetail={goDetail}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          searchQuery={voucherSearch}
          filters={voucherFilters}
          onFiltersChange={setVoucherFilters}
        />
      )}
      {page === "detail" && !selectedVoucher && <LoadingState label="Đang tải chi tiết voucher..." variant="page" />}
      {page === "detail" && selectedVoucher && (
        <GuestVoucherDetailPage
          voucher={selectedVoucher}
          detail={selectedVoucherDetail!}
          onBack={() => router.push("/vouchers")}
          onLogin={onLogin}
          onDetail={goDetail}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      )}
      {page === "cart" && (
        <CartPage
          cart={cart}
          total={total}
          onRemove={cartRemove}
          onUpdate={cartUpdate}
          onCheckout={onCheckout}
          onContinue={() => setPage("vouchers")}
        />
      )}
      {page === "categories" && (
        <CategoryGridPage
          onSelectCategory={(category) => {
            setVoucherFilters((current) => ({ ...current, categoryId: category.id }))
            navigate("vouchers")
          }}
        />
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
    <PopupModal />
    </>
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
