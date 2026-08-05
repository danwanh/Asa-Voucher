import { useState } from "react"
import { AppIcon } from "@/components/AppIcon"
import { toast } from "sonner"
import { CustomerLayout, type CustomerPage } from "@/layouts/CustomerLayout"
import { HomePage } from "@/pages/customer/HomePage"
import { VoucherListPage } from "@/pages/customer/VoucherListPage"
import { VoucherDetailPage } from "@/pages/customer/VoucherDetailPage"
import { CartPage } from "@/pages/customer/CartPage"
import { CreateOrderPage, type RecipientInfo } from "@/pages/customer/CreateOrderPage"
import { PaymentPage } from "@/pages/customer/PaymentPage"
import { CheckoutSuccessPage } from "@/pages/customer/CheckoutSuccessPage"
import { MyVouchersPage } from "@/pages/customer/MyVouchersPage"
import { OrderHistoryPage } from "@/pages/customer/OrderHistoryPage"
import { OrderDetailPage } from "@/pages/customer/OrderDetailPage"
import { ReviewPage } from "@/pages/customer/ReviewPage"
import { ProfilePage } from "@/pages/customer/ProfilePage"
import { NotificationsPage } from "@/pages/customer/NotificationsPage"
import { CustomerSettingsPage } from "@/pages/customer/CustomerSettingsPage"
import { ORDERS } from "@/data/mock"
import { C } from "@/utils/constants"
import type { AppUser, CartItem, Voucher, Order } from "@/types"

interface Props {
  user: AppUser
  onLogout: () => void
  // Cart is lifted to App.tsx so it survives guest → auth transition
  cart: CartItem[]
  total: number
  count: number
  add: (v: Voucher) => void
  remove: (id: string) => void
  update: (id: string, qty: number) => void
  clear: () => void
  // When set, start directly at this page (e.g. "create-order" after guest checkout redirect)
  initialPage?: CustomerPage
  onInitialPageConsumed?: () => void
}

interface PendingOrder {
  id: string
  recipient: RecipientInfo
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

export function CustomerApp({
  user, onLogout,
  cart, total, count, add, remove, update, clear,
  initialPage, onInitialPageConsumed,
}: Props) {
  const [page, setPage] = useState<CustomerPage>(initialPage ?? "home")
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null)
  const [reviewExisting, setReviewExisting] = useState<{ rating: number; content: string } | undefined>()
  const [lastCode, setLastCode] = useState("")
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null)
  const [voucherSearch, setVoucherSearch] = useState("")
  const [voucherFilters, setVoucherFilters] = useState<VoucherListFilters>(DEFAULT_VOUCHER_FILTERS)

  const navigate = (p: CustomerPage) => {
    setPage(p)
    onInitialPageConsumed?.()
  }

  const handleVoucherSearchChange = (value: string) => {
    setVoucherSearch(value)
    if (page !== "vouchers") setPage("vouchers")
  }

  const handleVoucherSearchFocus = () => {
    if (page !== "vouchers") setPage("vouchers")
  }

  const goDetail = (v: Voucher) => { setSelectedVoucher(v); navigate("detail") }
  const goOrderDetail = (o: Order) => { setSelectedOrder(o); navigate("order-detail") }

  const goReview = (o: Order, existing?: { rating: number; content: string }) => {
    setReviewOrder(o)
    setReviewExisting(existing)
    navigate("review")
  }

  const handleBuyNow = (v: Voucher) => {
    add(v)
    navigate("create-order")
  }

  const handleCreateOrder = (info: RecipientInfo) => {
    const orderId = "DH" + Date.now().toString().slice(-6)
    setPendingOrder({ id: orderId, recipient: info })
    navigate("payment")
  }

  const handlePaymentSuccess = (code: string) => {
    setLastCode(code)
    clear()
    setPendingOrder(null)
    navigate("success")
  }

  const handlePaymentBack = () => {
    // Order stays alive as pending — go to orders list
    navigate("orders")
  }

  const myOrders = ORDERS.filter((o) => o.userId === "u01")

  return (
    <CustomerLayout
      user={user}
      page={page}
      cartCount={count}
      voucherSearch={voucherSearch}
      onVoucherSearchChange={handleVoucherSearchChange}
      onVoucherSearchFocus={handleVoucherSearchFocus}
      onNavigate={navigate}
      onLogout={onLogout}
    >
      {page === "home" && <HomePage onBuy={add} onDetail={goDetail} onNavigate={navigate} />}
      {page === "vouchers" && (
        <VoucherListPage
          onBuy={add}
          onDetail={goDetail}
          searchQuery={voucherSearch}
          filters={voucherFilters}
          onFiltersChange={setVoucherFilters}
        />
      )}
      {page === "detail" && selectedVoucher && (
        <VoucherDetailPage
          voucher={selectedVoucher}
          onBuy={() => {
            add(selectedVoucher)
            toast.success(`Đã thêm "${selectedVoucher.title.slice(0, 30)}..." vào giỏ hàng`)
          }}
          onBuyNow={() => handleBuyNow(selectedVoucher)}
          onBack={() => navigate("vouchers")}
        />
      )}
      {page === "cart" && (
        <CartPage
          cart={cart}
          total={total}
          onRemove={remove}
          onUpdate={update}
          onCheckout={() => navigate("create-order")}
          onContinue={() => navigate("vouchers")}
        />
      )}
      {page === "create-order" && (
        <CreateOrderPage
          cart={cart}
          total={total}
          onCreateOrder={handleCreateOrder}
          onBack={() => navigate("cart")}
        />
      )}
      {page === "payment" && pendingOrder && (
        <PaymentPage
          cart={cart}
          total={total}
          orderId={pendingOrder.id}
          onSuccess={handlePaymentSuccess}
          onBack={handlePaymentBack}
        />
      )}
      {page === "payment" && !pendingOrder && (
        <div className="max-w-md mx-auto px-4 py-20 text-center">
           <AppIcon name="shoppingCart" className="w-14 h-14 mb-4 mx-auto" />
          <p className="font-bold" style={{ color: C.indigo }}>Không có đơn hàng đang chờ thanh toán.</p>
          <button onClick={() => navigate("orders")} className="mt-4 px-6 py-3 rounded-xl font-bold text-white" style={{ backgroundColor: C.peach }}>
            Xem đơn hàng
          </button>
        </div>
      )}
      {page === "success" && <CheckoutSuccessPage code={lastCode} onDone={() => navigate("my-vouchers")} />}
      {page === "my-vouchers" && <MyVouchersPage orders={myOrders} />}
      {page === "orders" && (
        <OrderHistoryPage
          orders={myOrders}
          pendingOrderId={pendingOrder?.id}
          onDetail={goOrderDetail}
          onReview={(o) => goReview(o)}
        />
      )}
      {page === "order-detail" && selectedOrder && (
        <OrderDetailPage order={selectedOrder} onBack={() => navigate("orders")} onReview={(o) => goReview(o)} />
      )}
      {page === "review" && reviewOrder && (
        <ReviewPage
          order={reviewOrder}
          existingReview={reviewExisting}
          onBack={() => navigate("order-detail")}
          onSubmit={() => navigate("orders")}
        />
      )}
      {page === "profile" && <ProfilePage user={user} onLogout={onLogout} />}
      {page === "notifications" && <NotificationsPage />}
      {page === "settings" && <CustomerSettingsPage onLogout={onLogout} />}
      {page === "favorites" && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Yêu thích</h1>
          <div className="text-center py-20 bg-white rounded-2xl">
             <AppIcon name="heart" className="w-14 h-14 mb-4 mx-auto" />
            <div className="font-bold text-lg" style={{ color: C.indigo }}>Chưa có voucher yêu thích</div>
            <div className="text-sm mt-2" style={{ color: "#8A8DA8" }}>Nhấn biểu tượng trái tim để lưu voucher</div>
          </div>
        </div>
      )}
      {page === "categories" && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Danh mục</h1>
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
              <button key={cat.name} onClick={() => navigate("vouchers")} className="flex flex-col items-center gap-2 p-5 rounded-2xl hover:shadow-md transition-all" style={{ backgroundColor: cat.color }}>
                <AppIcon name={cat.icon} className="w-10 h-10" />
                <div className="font-black text-sm" style={{ color: C.indigo }}>{cat.name}</div>
                <div className="text-xs" style={{ color: "#8A8DA8" }}>{cat.count} voucher</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}
