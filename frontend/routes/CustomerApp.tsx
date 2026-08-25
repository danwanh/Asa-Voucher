import { startTransition, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AppIcon } from "@/components/AppIcon"
import { PopupModal } from "@/components/PopupModal"
import { toast } from "sonner"
import { CustomerLayout, type CustomerPage } from "@/layouts/CustomerLayout"
import type { RecipientInfo } from "@/pages/customer/CreateOrderPage"
import { C } from "@/utils/constants"
import { customerPagePath } from "@/utils/customerRoutes"
import type { AppUser, CartItem, CheckoutDraft, IssuedVoucher, Voucher, Order, OrderListItem, ReviewTarget } from "@/types"
import { orderService, paymentService, type OrderPaymentStatusCounts } from "@/services/orderService"
import { issuedVoucherService } from "@/services/issuedVoucherService"
import { voucherService, type VoucherDetailData } from "@/services/voucherService"
import { LoadingState } from "@/components/LoadingState"
import { isVoucherAvailable } from "@/hooks/useCart"

const pageLoading = () => <LoadingState label="Đang tải trang..." variant="page" />
const CategoryGridPage = dynamic(() => import("@/components/CategoryGridPage").then((module) => module.CategoryGridPage), { loading: pageLoading })
const HomePage = dynamic(() => import("@/pages/guest/GuestHomePage").then((module) => module.GuestHomePage), { loading: pageLoading })
const VoucherListPage = dynamic(() => import("@/pages/customer/VoucherListPage").then((module) => module.VoucherListPage), { loading: pageLoading })
const VoucherDetailPage = dynamic(() => import("@/pages/guest/GuestVoucherDetailPage").then((module) => module.GuestVoucherDetailPage), { loading: pageLoading })
const CartPage = dynamic(() => import("@/pages/customer/CartPage").then((module) => module.CartPage), { loading: pageLoading })
const CreateOrderPage = dynamic(() => import("@/pages/customer/CreateOrderPage").then((module) => module.CreateOrderPage), { loading: pageLoading })
const PaymentPage = dynamic(() => import("@/pages/customer/PaymentPage").then((module) => module.PaymentPage), { loading: pageLoading })
const CheckoutSuccessPage = dynamic(() => import("@/pages/customer/CheckoutSuccessPage").then((module) => module.CheckoutSuccessPage), { loading: pageLoading })
const MyVouchersPage = dynamic(() => import("@/pages/customer/MyVouchersPage").then((module) => module.MyVouchersPage), { loading: pageLoading })
const OrderHistoryPage = dynamic(() => import("@/pages/customer/OrderHistoryPage").then((module) => module.OrderHistoryPage), { loading: pageLoading })
const OrderDetailPage = dynamic(() => import("@/pages/customer/OrderDetailPage").then((module) => module.OrderDetailPage), { loading: pageLoading })
const ReviewPage = dynamic(() => import("@/pages/customer/ReviewPage").then((module) => module.ReviewPage), { loading: pageLoading })
const ComplaintPage = dynamic(() => import("@/pages/customer/ComplaintPage").then((module) => module.ComplaintPage), { loading: pageLoading })
const ProfilePage = dynamic(() => import("@/pages/customer/ProfilePage").then((module) => module.ProfilePage), { loading: pageLoading })
const CustomerSettingsPage = dynamic(() => import("@/pages/customer/CustomerSettingsPage").then((module) => module.CustomerSettingsPage), { loading: pageLoading })

function pageFromLocation(pathname: string, searchParams: URLSearchParams, fallback: CustomerPage = "home"): CustomerPage {
  const view = searchParams.get("view")
  if (view === "review") return "review"
  if (view === "complaint" || view === "complaints") return "complaint"
  if (pathname === "/") return "home"
  if (pathname === "/vouchers") return "vouchers"
  if (pathname.startsWith("/vouchers/")) return "detail"
  if (pathname === "/categories") return "categories"
  if (pathname === "/cart") return "cart"
  if (pathname === "/orders") return "orders"
  if (pathname.startsWith("/orders/")) return "order-detail"
  if (pathname === "/my-vouchers") return "my-vouchers"
  if (pathname === "/favorites") return "favorites"
  if (pathname === "/settings") return "settings"
  if (pathname === "/profile") return "profile"
  if (pathname === "/checkout/create-order") return "create-order"
  if (pathname.startsWith("/checkout/payment/")) return "payment"
  if (pathname === "/checkout/payment/result") return "success"
  return fallback
}

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
  checkoutDraft: CheckoutDraft | null
  checkoutCartItemIds: string[]
  checkoutItems: CartItem[]
  setCartCheckout: (items: CartItem[]) => void
  setDirectCheckout: (voucher: Voucher) => void
  clearCheckoutDraft: () => void
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

type ComplaintTarget = {
  id: string
  voucherId: string
  voucherTitle: string
  partnerName: string
  issuedVoucher: IssuedVoucher
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
  checkoutDraft, checkoutCartItemIds, checkoutItems, setCartCheckout, setDirectCheckout, clearCheckoutDraft,
  initialPage, onInitialPageConsumed,
  initialOrderId,
  initialVoucherId,
  initialPaymentStatus,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const page = pageFromLocation(pathname, searchParams, initialPage ?? "home")
  const feedbackVoucherId = searchParams.get("voucherId")
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null)
  const [selectedVoucherDetail, setSelectedVoucherDetail] = useState<VoucherDetailData | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)
  const [reviewTargetOptions, setReviewTargetOptions] = useState<ReviewTarget[]>([])
  const [reviewTargetOrder, setReviewTargetOrder] = useState<Order | null>(null)
  const [reviewTargetReturnPage, setReviewTargetReturnPage] = useState<CustomerPage>("orders")
  const [complaintOrder, setComplaintOrder] = useState<Order | null>(null)
  const [complaintIssuedVoucher, setComplaintIssuedVoucher] = useState<IssuedVoucher | null>(null)
  const [complaintTargetOptions, setComplaintTargetOptions] = useState<ComplaintTarget[]>([])
  const [complaintTargetOrder, setComplaintTargetOrder] = useState<Order | null>(null)
  const [complaintTargetReturnPage, setComplaintTargetReturnPage] = useState<CustomerPage>("orders")
  const [reviewReturnPage, setReviewReturnPage] = useState<CustomerPage>("orders")
  const [lastCode, setLastCode] = useState("")
  const [lastQrPayload, setLastQrPayload] = useState("")
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null)
  const [pendingOrderLoading, setPendingOrderLoading] = useState(Boolean(initialOrderId && initialPage === "payment"))
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false)
  const [voucherSearch, setVoucherSearch] = useState("")
  const [voucherFilters, setVoucherFilters] = useState<VoucherListFilters>(DEFAULT_VOUCHER_FILTERS)
  const [myOrders, setMyOrders] = useState<OrderListItem[]>([])
  const [orderCounts, setOrderCounts] = useState<OrderPaymentStatusCounts>({ all: 0 })
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)
  const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState<string | undefined>()
  const [orderSearch, setOrderSearch] = useState("")
  const [myOrdersLoading, setMyOrdersLoading] = useState(initialPage === "orders" || initialPage === "my-vouchers")
  const ordersRequestIdRef = useRef(0)
  const feedbackSelectionRef = useRef<string | null>(null)
  const previousFeedbackPageRef = useRef<CustomerPage | null>(null)
  const [myIssuedVouchers, setMyIssuedVouchers] = useState<Order[]>([])
  const [issuedPage, setIssuedPage] = useState(1)
  const [issuedTotalPages, setIssuedTotalPages] = useState(1)
  const [issuedStatus, setIssuedStatus] = useState<string | undefined>()
  const [myIssuedVouchersLoading, setMyIssuedVouchersLoading] = useState(initialPage === "my-vouchers")

  useEffect(() => {
    if (page !== "review" && page !== "complaint") {
      if (previousFeedbackPageRef.current === "review" || previousFeedbackPageRef.current === "complaint") {
        feedbackSelectionRef.current = null
      }
    }
    previousFeedbackPageRef.current = page
    if (!initialOrderId) {
      setPendingOrderLoading(false)
      return
    }
    if (page === "order-detail" || page === "review" || page === "complaint") {
      void orderService.get(initialOrderId).then(async (order) => {
        setSelectedOrder(order)
        if (page === "review") {
          if (feedbackVoucherId) {
            const selectedTarget = (await orderService.getReviewTargets(order.id))
              .filter((target) => target.review || target.reviewable)
              .find((target) => target.id === feedbackVoucherId)
            if (selectedTarget) {
              setReviewOrder(order)
              setReviewTarget(selectedTarget)
              setReviewTargetOptions([])
              setReviewTargetOrder(null)
              setPendingOrderLoading(false)
              return
            }
          }
          if (feedbackSelectionRef.current === `review:${order.id}:${reviewTarget?.id ?? ""}` || (reviewOrder?.id === order.id && reviewTarget)) {
            setPendingOrderLoading(false)
            return
          }
          setReviewOrder(order)
          void orderService.getReviewTargets(order.id).then((targets) => {
            const availableTargets = targets.filter((target) => target.review || target.reviewable)
            if (availableTargets.length === 1) {
              setReviewTarget(availableTargets[0])
              return
            }
            if (availableTargets.length > 1) {
              setReviewTargetOptions(availableTargets)
              setReviewTargetOrder(order)
              return
            }
            toast.error("Không tìm thấy voucher đã phát hành để đánh giá.")
            router.replace(`/orders/${order.id}`)
          }).catch(() => {
            toast.error("Không thể tải danh sách voucher để đánh giá.")
            router.replace(`/orders/${order.id}`)
          })
        } else if (page === "complaint") {
          if (feedbackVoucherId) {
            const canComplaint = order.status === "confirmed" || order.status === "completed"
            const selectedTarget = (order.items ?? []).flatMap((item) => (item.issuedVouchers ?? [])
              .filter((voucher) => voucher.id === feedbackVoucherId && (voucher.complaint || canComplaint || voucher.status === "used"))
              .map((voucher) => ({
                voucherId: item.voucherId,
                voucherTitle: item.voucherTitle ?? order.voucherTitle,
                partnerName: item.partnerName ?? order.partnerName,
                issuedVoucher: voucher,
              })))[0]
            if (selectedTarget) {
              setComplaintOrder(order)
              setComplaintIssuedVoucher(selectedTarget.issuedVoucher)
              setComplaintTargetOptions([])
              setComplaintTargetOrder(null)
              setPendingOrderLoading(false)
              return
            }
          }
          if (feedbackSelectionRef.current === `complaint:${order.id}:${complaintIssuedVoucher?.id ?? ""}` || (complaintOrder?.id === order.id && complaintIssuedVoucher)) {
            setPendingOrderLoading(false)
            return
          }
          const canComplaint = order.status === "confirmed" || order.status === "completed"
          const targets = (order.items ?? []).flatMap((item) => (item.issuedVouchers ?? [])
            .filter((voucher) => voucher.complaint || canComplaint || voucher.status === "used")
            .map((voucher) => ({
              id: voucher.id,
              voucherId: item.voucherId,
              voucherTitle: item.voucherTitle ?? order.voucherTitle,
              partnerName: item.partnerName ?? order.partnerName,
              issuedVoucher: voucher,
            })))
          setComplaintOrder(order)
          if (targets.length === 1) {
            setComplaintIssuedVoucher(targets[0].issuedVoucher)
          } else if (targets.length > 1) {
            setComplaintTargetOptions(targets)
            setComplaintTargetOrder(order)
          } else {
            toast.error("Không tìm thấy voucher có thể khiếu nại.")
            router.replace(`/orders/${order.id}`)
          }
        } else if (initialPaymentStatus === "success" && (order.status === "confirmed" || order.status === "completed")) {
          toast.success("Thanh toán thành công, voucher đã được phát hành.")
        } else if (initialPaymentStatus) {
          toast.error(order.status === "cancelled"
            ? "Đơn hàng đã bị hủy. Nếu giao dịch đã thu tiền, yêu cầu hoàn tiền sẽ được xử lý."
            : "Thanh toán chưa thành công. Bạn có thể thử lại khi đơn hàng còn hạn.")
        }
      }).catch((error) => {
        const status = (error as { response?: { status?: number } }).response?.status
        toast.error(status === 403
          ? "Bạn không có quyền truy cập đơn hàng này."
          : status === 404
            ? "Không tìm thấy đơn hàng."
            : "Không thể tải chi tiết đơn hàng. Vui lòng thử lại.")
        router.replace("/orders")
      })
      setPendingOrderLoading(false)
      return
    }
    void orderService.get(initialOrderId).then((order) => {
      setPendingOrder({ id: initialOrderId, order, recipient: { name: "", identifier: "", note: "", forSelf: true } })
    }).catch(() => setPendingOrder({ id: initialOrderId, recipient: { name: "", identifier: "", note: "", forSelf: false } }))
      .finally(() => setPendingOrderLoading(false))
  }, [feedbackVoucherId, initialOrderId, initialPaymentStatus, page, router])

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

  const navigate = (p: CustomerPage) => {
    if (p === "home") {
      setVoucherSearch("")
      setVoucherFilters(DEFAULT_VOUCHER_FILTERS)
    }
    const path = customerPagePath(p, user.role)
    if (path) {
      onInitialPageConsumed?.()
      startTransition(() => router.push(path))
      return
    }
    onInitialPageConsumed?.()
  }

  const handleVoucherSearchChange = (value: string) => {
    setVoucherSearch(value)
  }

  const handleVoucherSearchFocus = () => {
    if (page === "vouchers") return
    onInitialPageConsumed?.()
    router.push("/vouchers")
  }

  const goDetail = (v: Voucher) => startTransition(() => router.push(`/vouchers/${v.id}`))
  const goOrderDetail = (o: OrderListItem) => {
    startTransition(() => router.push(`/orders/${o.id}`))
  }

  const openReview = (order: Order, target: ReviewTarget, returnPage: CustomerPage) => {
    feedbackSelectionRef.current = `review:${order.id}:${target.id}`
    setReviewOrder(order)
    setReviewTarget(target)
    setReviewReturnPage(returnPage)
    setReviewTargetOptions([])
    setReviewTargetOrder(null)
    router.push(`/orders/${order.id}?view=review&voucherId=${encodeURIComponent(target.id)}`)
  }

  const goReview = async (o: Order | OrderListItem, issuedVoucher?: IssuedVoucher, returnPage: CustomerPage = "orders") => {
    if (issuedVoucher) {
      const order = o as Order
      const item = order.items?.find((candidate) => candidate.issuedVouchers?.some((voucher) => voucher.id === issuedVoucher.id))
      openReview(order, {
        id: issuedVoucher.id,
        voucherId: item?.voucherId ?? order.voucherId,
        voucherTitle: item?.voucherTitle ?? order.voucherTitle,
        partnerName: item?.partnerName ?? order.partnerName,
        code: issuedVoucher.code,
        amount: item?.unitPrice,
        reviewable: !issuedVoucher.review,
        review: issuedVoucher.review,
      }, returnPage)
      return
    }

    if (o.userId !== user.id) {
      toast.error("Chỉ người mua đơn hàng mới có thể đánh giá từ lịch sử.")
      return
    }
    const [detailResult, targetResult] = await Promise.allSettled([
      orderService.get(o.id),
      orderService.getReviewTargets(o.id),
    ])
    const detail = detailResult.status === "fulfilled" ? detailResult.value : null
    if (!detail) {
      toast.error("Không thể tải thông tin đánh giá. Vui lòng thử lại.")
      return
    }
    if (targetResult.status === "rejected") {
      toast.error("Không thể tải danh sách voucher để đánh giá. Vui lòng thử lại.")
      return
    }
    const targets = targetResult.value
    const availableTargets = targets.filter((target) => target.review || target.reviewable)
    if (availableTargets.length === 0) {
      toast.error("Không tìm thấy voucher đã phát hành để đánh giá.")
      return
    }
    if (availableTargets.length > 1) {
      setReviewTargetOptions(availableTargets)
      setReviewTargetOrder(detail)
      setReviewTargetReturnPage(returnPage)
      return
    }
    openReview(detail, availableTargets[0], returnPage)
  }

  const goComplaint = async (o: Order | OrderListItem, issuedVoucher?: IssuedVoucher, returnPage: CustomerPage = "orders") => {
    const detail = issuedVoucher ? o as Order : await orderService.get(o.id).catch(() => null)
    if (!detail) {
      toast.error("Không thể tải thông tin khiếu nại. Vui lòng thử lại.")
      return
    }
    if (!issuedVoucher && detail.userId !== user.id) {
      toast.error("Chỉ người mua đơn hàng mới có thể gửi khiếu nại từ lịch sử.")
      return
    }
    if (!issuedVoucher) {
      const canComplaint = detail.status === "confirmed" || detail.status === "completed"
      const targets = (detail.items ?? []).flatMap((item) => (item.issuedVouchers ?? [])
        .filter((voucher) => voucher.complaint || canComplaint || voucher.status === "used")
        .map((voucher) => ({
          id: voucher.id,
          voucherId: item.voucherId,
          voucherTitle: item.voucherTitle ?? detail.voucherTitle,
          partnerName: item.partnerName ?? detail.partnerName,
          issuedVoucher: voucher,
        })))
      if (targets.length > 1) {
        setComplaintTargetOptions(targets)
        setComplaintTargetOrder(detail)
        setComplaintTargetReturnPage(returnPage)
        return
      }
      if (targets.length === 1) issuedVoucher = targets[0].issuedVoucher
    }
    setComplaintOrder(detail)
    setComplaintIssuedVoucher(issuedVoucher ?? null)
    feedbackSelectionRef.current = `complaint:${detail.id}:${issuedVoucher?.id ?? ""}`
    setReviewReturnPage(returnPage)
    router.push(`/orders/${detail.id}?view=complaint&voucherId=${encodeURIComponent(issuedVoucher?.id ?? "")}`)
  }

  const handleAddToCart = async (voucher: Voucher) => {
    const item = await add(voucher)
    if (item) toast.success(`Đã thêm "${voucher.title.slice(0, 30)}..." vào giỏ hàng`)
  }

  const handleBuyNow = (v: Voucher) => {
    if (!isVoucherAvailable(v)) {
      toast.error("Voucher hiện không khả dụng.")
      return
    }
    setDirectCheckout(v)
    router.push("/checkout/create-order")
  }

  const selectedCart = checkoutItems
  const selectedTotal = selectedCart.reduce((sum, item) => sum + item.voucher.price * item.qty, 0)

  const handleCreateOrder = async (info: RecipientInfo) => {
    setIsRedirectingToPayment(true)
    try {
      const order = await orderService.createFromCart({
        cartItemIds: checkoutDraft?.kind === "cart" ? checkoutCartItemIds : undefined,
        items: checkoutDraft?.kind === "direct"
          ? selectedCart.map((item) => ({ voucherId: item.voucher.id, quantity: item.qty }))
          : undefined,
        recipientIdentifier: info.identifier,
        isGift: !info.forSelf,
        note: info.note,
        expectedPrices: Object.fromEntries(selectedCart.map((item) => [item.voucher.id, item.voucher.price])),
      })
      if (checkoutDraft?.kind === "cart") removeMany(checkoutCartItemIds)
      clearCheckoutDraft()
      setPendingOrder({ id: order.id, recipient: info })
      router.push(`/checkout/payment/${order.id}`)
    } catch (error) {
      setIsRedirectingToPayment(false)
       const apiError = error as { response?: { data?: { error?: { code?: string } } } }
       const code = apiError.response?.data?.error?.code
       if (code === "RECIPIENT_NOT_FOUND" || code === "RECIPIENT_REQUIRED") {
         toast.error("Không tìm thấy tài khoản người nhận. Vui lòng kiểm tra lại email hoặc số điện thoại.")
       } else if (code === "RECIPIENT_IS_SELF") {
         toast.error("Không thể tặng voucher cho chính mình.")
       } else {
          toast.error(code === "PRICE_CHANGED"
            ? "Giá voucher đã thay đổi. Vui lòng kiểm tra lại giỏ hàng."
            : "Không thể tạo đơn hàng. Vui lòng kiểm tra giỏ hàng và tồn kho.")
          if (checkoutDraft?.kind === "cart") navigate("cart")
       }
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

  const handlePayAgain = (order: Order | OrderListItem) => {
    setSelectedOrder(null)
    router.push(`/checkout/payment/${order.id}`)
  }

  const handlePaymentBack = () => {
    // Order stays alive as pending — go to orders list
    navigate("orders")
  }

  const reloadIssuedVouchers = () => {
    setMyIssuedVouchersLoading(true)
    void issuedVoucherService.listMine({ page: issuedPage, limit: 20, status: issuedStatus }).then((result) => {
      setMyIssuedVouchers(result.items)
      setIssuedTotalPages(result.totalPages)
    }).catch(() => undefined).finally(() => setMyIssuedVouchersLoading(false))
  }

  const returnFromFeedback = () => {
    const feedbackOrderId = page === "review" ? reviewOrder?.id : complaintOrder?.id
    orderService.invalidate(feedbackOrderId)
    issuedVoucherService.invalidateMine()
    if (reviewReturnPage === "order-detail" && selectedOrder) {
      void orderService.get(selectedOrder.id, { force: true }).then(setSelectedOrder).catch(() => undefined)
    }
    const returnPath = customerPagePath(reviewReturnPage, user.role)
    if (returnPath) router.push(returnPath)
    setReviewOrder(null)
    setReviewTarget(null)
    setComplaintOrder(null)
    setComplaintIssuedVoucher(null)
    setComplaintTargetOptions([])
    setComplaintTargetOrder(null)
    onInitialPageConsumed?.()
  }

  useEffect(() => {
    if (page !== "orders") return
    setMyOrdersLoading(true)
    const requestId = ++ordersRequestIdRef.current
    void orderService.list({ page: ordersPage, limit: 20, payment_status: orderPaymentStatusFilter, search: orderSearch || undefined }).then((result) => {
      if (requestId !== ordersRequestIdRef.current) return
      setMyOrders(result.items)
      setOrderCounts(result.countsByPaymentStatus)
      setOrdersTotalPages(result.totalPages)
    }).catch(() => {
      if (requestId !== ordersRequestIdRef.current) return
      toast.error("Không thể tải đơn hàng. Vui lòng thử lại.")
    }).finally(() => {
      if (requestId === ordersRequestIdRef.current) setMyOrdersLoading(false)
    })
  }, [page, ordersPage, orderPaymentStatusFilter, orderSearch])

  useEffect(() => {
    if (page !== "my-vouchers") return
    reloadIssuedVouchers()
  }, [page, issuedPage, issuedStatus])

  return (
    <>
    <CustomerLayout
      user={user}
      page={page}
      cartCount={cartCount}
      cartCountLoading={cartCountLoading}
      voucherSearch={voucherSearch}
      onVoucherSearchChange={handleVoucherSearchChange}
      onVoucherSearchFocus={handleVoucherSearchFocus}
      onNavigate={navigate}
      onLogout={onLogout}
    >
      {page === "home" && <HomePage viewer="customer" onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} onVoucherDetail={goDetail} onNavigate={(nextPage) => navigate(nextPage as CustomerPage)} onOpenArticle={(id) => router.push(`/news/${id}`)} />}
      {page === "vouchers" && (
        <VoucherListPage
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onDetail={goDetail}
          searchQuery={voucherSearch}
          filters={voucherFilters}
          onFiltersChange={setVoucherFilters}
        />
      )}
      {page === "detail" && selectedVoucher && (
        <VoucherDetailPage
          viewer="customer"
          voucher={selectedVoucher}
          detail={selectedVoucherDetail!}
          onDetail={goDetail}
          onAddToCart={() => handleAddToCart(selectedVoucher)}
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
             setCartCheckout(items)
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
          onBack={() => checkoutDraft?.kind === "direct" ? router.back() : navigate("cart")}
           loading={(checkoutDraft?.kind === "cart" && cartLoading) || isRedirectingToPayment}
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
            canPay={pendingOrder.order.userId === user.id}
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
             setOrderPaymentStatusFilter(status)
             setOrderSearch(search ?? "")
           }}
          pendingOrderId={pendingOrder?.id}
          onDetail={goOrderDetail}
           onReview={(o) => goReview(o)}
           onComplaint={(o) => goComplaint(o, undefined, "orders")}
            onPayAgain={handlePayAgain}
            currentUserId={user.id}
        />
      )}
      {page === "order-detail" && selectedOrder && (
          <OrderDetailPage order={selectedOrder} onBack={() => navigate("orders")} onReview={(o, issuedVoucher) => goReview(o, issuedVoucher, "order-detail")} onComplaint={(o, issuedVoucher) => goComplaint(o, issuedVoucher, "order-detail")} onPayAgain={handlePayAgain} currentUserId={user.id} />
      )}
       {page === "review" && reviewOrder && reviewTarget && (
         <ReviewPage
           order={reviewOrder}
            target={reviewTarget}
            onBack={returnFromFeedback}
            onSubmit={returnFromFeedback}
         />
       )}
        {reviewTargetOrder && reviewTargetOptions.length > 1 && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="presentation" onClick={() => { setReviewTargetOptions([]); setReviewTargetOrder(null) }}>
           <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="review-target-title" onClick={(event) => event.stopPropagation()}>
             <h2 id="review-target-title" className="text-lg font-black" style={{ color: C.indigo }}>Chọn voucher để đánh giá</h2>
             <p className="mt-1 text-sm" style={{ color: "#8A8DA8" }}>Mỗi voucher có thể nhận một đánh giá riêng từ bạn.</p>
             <div className="mt-5 max-h-80 space-y-2 overflow-y-auto">
               {reviewTargetOptions.map((target, index) => (
                 <button key={target.id} onClick={() => openReview(reviewTargetOrder, target, reviewTargetReturnPage)} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-gray-50" style={{ borderColor: "#E2DFC8" }}>
                   <div className="h-12 w-14 flex-shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: C.eggshell }}>{target.image ? <img src={target.image} alt="" className="h-full w-full object-cover" /> : <AppIcon name="gift" className="m-auto h-full w-5" />}</div>
                   <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold" style={{ color: C.indigo }}>{target.voucherTitle}</div><div className="text-xs" style={{ color: "#8A8DA8" }}>{target.partnerName} · Voucher {index + 1}</div></div>
                   <span className="text-xs font-bold" style={{ color: target.review ? C.teal : C.peach }}>{target.review ? "Xem" : "Đánh giá"}</span>
                 </button>
               ))}
             </div>
             <button onClick={() => { setReviewTargetOptions([]); setReviewTargetOrder(null) }} className="mt-5 w-full rounded-xl border py-2.5 text-sm font-bold" style={{ borderColor: "#E2DFC8", color: C.indigo }}>Hủy</button>
           </div>
         </div>
        )}
        {complaintTargetOrder && complaintTargetOptions.length > 1 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="presentation" onClick={() => { setComplaintTargetOptions([]); setComplaintTargetOrder(null) }}>
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="complaint-target-title" onClick={(event) => event.stopPropagation()}>
              <h2 id="complaint-target-title" className="text-lg font-black" style={{ color: C.indigo }}>Chọn voucher để khiếu nại</h2>
              <p className="mt-1 text-sm" style={{ color: "#8A8DA8" }}>Mỗi voucher có thể có một khiếu nại riêng từ bạn.</p>
              <div className="mt-5 max-h-80 space-y-2 overflow-y-auto">
                {complaintTargetOptions.map((target, index) => (
                  <button key={target.id} onClick={() => { setComplaintTargetOptions([]); setComplaintTargetOrder(null); void goComplaint(complaintTargetOrder, target.issuedVoucher, complaintTargetReturnPage) }} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-gray-50" style={{ borderColor: "#E2DFC8" }}>
                    <div className="flex h-12 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: C.eggshell }}><AppIcon name="gift" className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold" style={{ color: C.indigo }}>{target.voucherTitle}</div><div className="text-xs" style={{ color: "#8A8DA8" }}>{target.partnerName} · Voucher {index + 1}</div></div>
                    <span className="text-xs font-bold" style={{ color: target.issuedVoucher.complaint ? "#2563EB" : C.peach }}>{target.issuedVoucher.complaint ? "Xem" : "Khiếu nại"}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => { setComplaintTargetOptions([]); setComplaintTargetOrder(null) }} className="mt-5 w-full rounded-xl border py-2.5 text-sm font-bold" style={{ borderColor: "#E2DFC8", color: C.indigo }}>Hủy</button>
            </div>
          </div>
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
        <CategoryGridPage
          title="Danh mục"
          onSelectCategory={(category) => {
            setVoucherFilters((current) => ({ ...current, categoryId: category.id }))
            navigate("vouchers")
          }}
        />
      )}
    </CustomerLayout>
    <PopupModal />
    </>
  )
}
