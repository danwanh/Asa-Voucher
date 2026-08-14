import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
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
import { ComplaintPage } from "@/pages/customer/ComplaintPage"
import { ProfilePage } from "@/pages/customer/ProfilePage"
import { NotificationsPage } from "@/pages/customer/NotificationsPage"
import { CustomerSettingsPage } from "@/pages/customer/CustomerSettingsPage"
import { C } from "@/utils/constants"
import { customerPagePath } from "@/utils/customerRoutes"
import type { AppUser, CartItem, IssuedVoucher, Voucher, Order } from "@/types"
import { orderService, paymentService, type OrderStatusCounts } from "@/services/orderService"
import { issuedVoucherService } from "@/services/issuedVoucherService"
import { voucherService, type VoucherDetailData } from "@/services/voucherService"
import { LoadingState } from "@/components/LoadingState"

interface Props {
  user: AppUser
  onLogout: () => void
  // Cart is lifted to App.tsx so it survives guest → auth transition
  cart: CartItem[]
  total: number
  count: number
  cartCount: number | null
  cartCountLoading: boolean
  add: (v: Voucher) => Promise<CartItem | undefined>
  remove: (id: string) => void
  update: (id: string, qty: number) => void
  removeMany: (cartItemIds: string[]) => void
  cartLoading: boolean
  checkoutSelectionIds: string[] | null
  checkoutItems: CartItem[]
  setCheckoutSelection: (cartItemIds: string[]) => void
  clearCheckoutSelection: () => void
  // When set, start directly at this page (e.g. "create-order" after guest checkout redirect)
  initialPage?: CustomerPage
  initialOrderId?: string
  initialVoucherId?: string
  initialPaymentStatus?: string
  onInitialPageConsumed?: () => void
}

interface PendingOrder {
  id: string
  recipient: RecipientInfo
  order?: Order
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
  cart, total, count, cartCount, cartCountLoading, add, remove, update, removeMany, cartLoading,
  checkoutSelectionIds, checkoutItems, setCheckoutSelection, clearCheckoutSelection,
  initialPage, onInitialPageConsumed,
  initialOrderId,
  initialVoucherId,
  initialPaymentStatus,
}: Props) {
  const router = useRouter()
  const [page, setPage] = useState<CustomerPage>(() => initialPage ?? "home")
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [selectedVoucherDetail, setSelectedVoucherDetail] = useState<VoucherDetailData | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null)
  const [reviewIssuedVoucher, setReviewIssuedVoucher] = useState<IssuedVoucher | null>(null)
  const [complaintOrder, setComplaintOrder] = useState<Order | null>(null)
  const [complaintIssuedVoucher, setComplaintIssuedVoucher] = useState<IssuedVoucher | null>(null)
  const [reviewReturnPage, setReviewReturnPage] = useState<CustomerPage>("orders")
  const [lastCode, setLastCode] = useState("")
  const [lastQrPayload, setLastQrPayload] = useState("")
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null)
  const [pendingOrderLoading, setPendingOrderLoading] = useState(Boolean(initialOrderId && initialPage === "payment"))
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false)
  const [voucherSearch, setVoucherSearch] = useState("")
  const [voucherFilters, setVoucherFilters] = useState<VoucherListFilters>(DEFAULT_VOUCHER_FILTERS)
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [orderCounts, setOrderCounts] = useState<OrderStatusCounts>({ all: 0 })
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)
  const [orderStatusFilter, setOrderStatusFilter] = useState<string | undefined>()
  const [orderSearch, setOrderSearch] = useState("")
  const [myOrdersLoading, setMyOrdersLoading] = useState(initialPage === "orders" || initialPage === "my-vouchers")
  const ordersRequestIdRef = useRef(0)
  const [myIssuedVouchers, setMyIssuedVouchers] = useState<Order[]>([])
  const [issuedPage, setIssuedPage] = useState(1)
  const [issuedTotalPages, setIssuedTotalPages] = useState(1)
  const [issuedStatus, setIssuedStatus] = useState<string | undefined>()
  const [issuedSearch, setIssuedSearch] = useState("")
  const [myIssuedVouchersLoading, setMyIssuedVouchersLoading] = useState(initialPage === "my-vouchers")

  useEffect(() => {
    if (initialPage) setPage(initialPage)
  }, [initialPage])

  useEffect(() => {
    if (!initialOrderId) {
      setPendingOrderLoading(false)
      return
    }
    if (initialPage === "orders") {
      void orderService.get(initialOrderId).then((order) => {
        setSelectedOrder(order)
        setPage("order-detail")
      }).catch(() => undefined)
      return
    }
    void orderService.get(initialOrderId).then((order) => {
      setPendingOrder({ id: initialOrderId, order, recipient: { name: "", identifier: "", note: "", forSelf: true } })
    }).catch(() => setPendingOrder({ id: initialOrderId, recipient: { name: "", identifier: "", note: "", forSelf: false } }))
      .finally(() => setPendingOrderLoading(false))
  }, [initialOrderId, initialPage])

  useEffect(() => {
    if (!initialVoucherId) return
    void voucherService.getDetail(initialVoucherId).then((detail) => {
      setSelectedVoucher(detail.voucher)
      setSelectedVoucherDetail(detail)
      setPage("detail")
    }).catch(() => {
      toast.error("Không thể tải chi tiết voucher.")
      router.push("/vouchers")
    })
  }, [initialVoucherId, router])

  useEffect(() => {
    if (initialPaymentStatus === "success") toast.success("Thanh toán thành công, voucher đã được phát hành.")
    if (initialPaymentStatus === "failed") toast.error("Thanh toán thất bại. Đơn hàng vẫn được giữ để bạn thanh toán lại.")
  }, [initialPaymentStatus])

  const navigate = (p: CustomerPage) => {
    const path = customerPagePath(p, user.role)
    if (path) {
      onInitialPageConsumed?.()
      router.push(path)
      return
    }
    setPage(p)
    onInitialPageConsumed?.()
  }

  const handleVoucherSearchChange = (value: string) => {
    setVoucherSearch(value)
  }

  const goDetail = (v: Voucher) => router.push(`/vouchers/${v.id}`)
  const goOrderDetail = (o: Order) => {
    setSelectedOrder(o)
    router.push(`/orders/${o.id}`)
  }

  const goReview = (o: Order, issuedVoucher?: IssuedVoucher, returnPage: CustomerPage = "orders") => {
    const selected = issuedVoucher ?? o.items?.flatMap((item) => item.issuedVouchers ?? [])[0]
    if (!selected) {
      toast.error("Không tìm thấy voucher đã phát hành để đánh giá.")
      return
    }
    setReviewOrder(o)
    setReviewIssuedVoucher(selected)
    setReviewReturnPage(returnPage)
    navigate("review")
  }

  const goComplaint = (o: Order, issuedVoucher?: IssuedVoucher, returnPage: CustomerPage = "orders") => {
    setComplaintOrder(o)
    setComplaintIssuedVoucher(issuedVoucher ?? null)
    setReviewReturnPage(returnPage)
    navigate("complaint")
  }

  const handleBuyNow = async (v: Voucher) => {
    const item = await add(v)
    if (!item?.cartItemId) {
      toast.error("Không thể chuẩn bị sản phẩm để đặt hàng. Vui lòng thử lại.")
      return
    }
    setCheckoutSelection([item.cartItemId])
    router.push("/checkout/create-order")
  }

  const checkoutCartItemIds = checkoutSelectionIds ?? []
  const selectedCart = checkoutItems
  const selectedTotal = selectedCart.reduce((sum, item) => sum + item.voucher.price * item.qty, 0)

  const handleCreateOrder = async (info: RecipientInfo) => {
    setIsRedirectingToPayment(true)
    try {
      const order = await orderService.createFromCart({
        cartItemIds: checkoutCartItemIds,
        recipientIdentifier: info.identifier,
        isGift: !info.forSelf,
        note: info.note,
        expectedPrices: Object.fromEntries(selectedCart.map((item) => [item.voucher.id, item.voucher.price])),
      })
      removeMany(checkoutCartItemIds)
       clearCheckoutSelection()
      setPendingOrder({ id: order.id, recipient: info })
      router.push(`/checkout/payment/${order.id}`)
    } catch (error) {
      setIsRedirectingToPayment(false)
      const apiError = error as { response?: { data?: { code?: string } } }
      toast.error(apiError.response?.data?.code === "PRICE_CHANGED"
        ? "Giá voucher đã thay đổi. Vui lòng kiểm tra lại giỏ hàng."
        : "Không thể tạo đơn hàng. Vui lòng kiểm tra email người nhận, giỏ hàng và tồn kho.")
      navigate("cart")
    }
  }

  const handlePaymentSuccess = async () => {
    if (!pendingOrder) return
    try {
      const order = await orderService.get(pendingOrder.id)
      const issued = order.items?.flatMap((item) => item.issuedVouchers ?? []) ?? []
      setLastCode(issued.map((item) => item.code).join(", ") || order.code)
      setLastQrPayload(issued[0]?.qrPayload ?? order.qrPayload ?? "")
    } catch {
      setLastCode(pendingOrder.id)
    }
    setPendingOrder(null)
    navigate("success")
  }

  const handlePayment = async (method: "vnpay" | "paypal") => {
    if (!pendingOrder) return
    const payment = await paymentService.create(pendingOrder.id, method)
    window.location.assign(payment.checkout_url)
  }

  const handlePayAgain = (order: Order) => {
    setPendingOrder({ id: order.id, order, recipient: { name: "", identifier: "", note: "", forSelf: true } })
    setSelectedOrder(null)
    router.push(`/checkout/payment/${order.id}`)
  }

  const handlePaymentBack = () => {
    // Order stays alive as pending — go to orders list
    navigate("orders")
  }

  const reloadOrders = () => {
    const requestId = ++ordersRequestIdRef.current
    void orderService.list({ page: ordersPage, limit: 20, status: orderStatusFilter, search: orderSearch || undefined }).then((result) => {
      if (requestId !== ordersRequestIdRef.current) return
      setMyOrders(result.items)
      setOrderCounts(result.countsByStatus)
      setOrdersTotalPages(result.totalPages)
    }).catch(() => undefined)
  }

  const reloadIssuedVouchers = () => {
    setMyIssuedVouchersLoading(true)
    void issuedVoucherService.listMine({ page: issuedPage, limit: 20, status: issuedStatus }).then((result) => {
      setMyIssuedVouchers(result.items)
      setIssuedTotalPages(result.totalPages)
    }).catch(() => undefined).finally(() => setMyIssuedVouchersLoading(false))
  }

  const returnFromFeedback = () => {
    if (reviewReturnPage === "my-vouchers") reloadIssuedVouchers()
    else reloadOrders()
    setPage(reviewReturnPage)
    onInitialPageConsumed?.()
  }

  useEffect(() => {
    if (page === "my-vouchers") {
      reloadIssuedVouchers()
      return
    }
    if (page !== "orders") return
    setMyOrdersLoading(true)
    const requestId = ++ordersRequestIdRef.current
    void orderService.list({ page: ordersPage, limit: 20, status: orderStatusFilter, search: orderSearch || undefined }).then((result) => {
      if (requestId !== ordersRequestIdRef.current) return
      setMyOrders(result.items)
      setOrderCounts(result.countsByStatus)
      setOrdersTotalPages(result.totalPages)
    }).catch(() => {
      if (requestId !== ordersRequestIdRef.current) return
      toast.error("Không thể tải đơn hàng. Vui lòng thử lại.")
    }).finally(() => {
      if (requestId === ordersRequestIdRef.current) setMyOrdersLoading(false)
    })
  }, [page, ordersPage, issuedPage, orderStatusFilter, orderSearch, issuedStatus, issuedSearch])

  return (
    <CustomerLayout
      user={user}
      page={page}
      cartCount={cartCount}
      cartCountLoading={cartCountLoading}
      voucherSearch={voucherSearch}
      onVoucherSearchChange={handleVoucherSearchChange}
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
          detail={selectedVoucherDetail!}
          onBuy={() => {
            add(selectedVoucher)
            toast.success(`Đã thêm "${selectedVoucher.title.slice(0, 30)}..." vào giỏ hàng`)
          }}
          onBuyNow={() => handleBuyNow(selectedVoucher)}
           onBack={() => router.push("/vouchers")}
        />
      )}
      {page === "cart" && (
        <CartPage
          cart={cart}
          total={total}
          onRemove={remove}
          onUpdate={update}
           onCheckout={(items) => {
             const cartItemIds = items.map((item) => item.cartItemId).filter((id): id is string => Boolean(id))
             setCheckoutSelection(cartItemIds)
             router.push("/checkout/create-order")
           }}
          onContinue={() => navigate("vouchers")}
          loading={cartLoading}
        />
      )}
      {page === "create-order" && (
        <CreateOrderPage
          cart={selectedCart}
          total={selectedTotal}
          userName={user.name}
          userEmail={user.email}
          onCreateOrder={handleCreateOrder}
          onBack={() => navigate("cart")}
           loading={cartLoading || isRedirectingToPayment}
         />
       )}
       {page === "payment" && pendingOrderLoading && (
          <LoadingState label="Đang tải đơn hàng..." variant="page" />
        )}
       {page === "payment" && !pendingOrderLoading && pendingOrder?.order && (
         <PaymentPage
           total={pendingOrder.order.amount}
           orderId={pendingOrder.id}
           order={pendingOrder.order}
           onPay={handlePayment}
           onBack={handlePaymentBack}
         />
       )}
       {page === "payment" && !pendingOrderLoading && !pendingOrder?.order && (
        <div className="max-w-md mx-auto px-4 py-20 text-center">
           <AppIcon name="shoppingCart" className="w-14 h-14 mb-4 mx-auto" />
          <p className="font-bold" style={{ color: C.indigo }}>Không có đơn hàng đang chờ thanh toán.</p>
          <button onClick={() => navigate("orders")} className="mt-4 px-6 py-3 rounded-xl font-bold text-white" style={{ backgroundColor: C.peach }}>
            Xem đơn hàng
          </button>
        </div>
      )}
       {page === "success" && <CheckoutSuccessPage code={lastCode} qrPayload={lastQrPayload} onDone={() => router.push("/my-vouchers")} />}
       {page === "my-vouchers" && (
         <MyVouchersPage
              orders={myIssuedVouchers}
              page={issuedPage}
              totalPages={issuedTotalPages}
              onPageChange={setIssuedPage}
              onFilterChange={(status) => {
                setIssuedPage(1)
                setIssuedStatus(status)
              }}
             ownerId={user.id}
             loading={myIssuedVouchersLoading}
           onReview={(order, issuedVoucher) => goReview(order, issuedVoucher, "my-vouchers")}
            onComplaint={(order, issuedVoucher) => goComplaint(order, issuedVoucher, "my-vouchers")}
         />
       )}
      {page === "orders" && (
          <OrderHistoryPage
            orders={myOrders}
            countsByStatus={orderCounts}
            loading={myOrdersLoading}
            page={ordersPage}
           totalPages={ordersTotalPages}
           onPageChange={setOrdersPage}
           onFilterChange={(status, search) => {
             setOrdersPage(1)
             setOrderStatusFilter(status)
             setOrderSearch(search ?? "")
           }}
          pendingOrderId={pendingOrder?.id}
          onDetail={goOrderDetail}
           onReview={(o) => goReview(o)}
           onComplaint={(o) => goComplaint(o, undefined, "orders")}
          onPayAgain={handlePayAgain}
        />
      )}
      {page === "order-detail" && selectedOrder && (
          <OrderDetailPage order={selectedOrder} onBack={() => navigate("orders")} onReview={(o) => goReview(o)} onComplaint={(o) => goComplaint(o, undefined, "order-detail")} onPayAgain={handlePayAgain} />
      )}
       {page === "review" && reviewOrder && reviewIssuedVoucher && (
        <ReviewPage
          order={reviewOrder}
           issuedVoucher={reviewIssuedVoucher}
            onBack={returnFromFeedback}
            onSubmit={returnFromFeedback}
         />
       )}
       {page === "complaint" && complaintOrder && (
         <ComplaintPage
           order={complaintOrder}
           issuedVoucher={complaintIssuedVoucher ?? undefined}
           onBack={returnFromFeedback}
           onSubmit={returnFromFeedback}
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
