// Must match backend/src/types/role.ts UserRole exactly.
export type Role =
  | "buyer"
  | "partner_owner"
  | "partner_voucher_staff"
  | "partner_store_staff"
  | "admin_content"
  | "admin_operations"
  | "admin_security"
export type VoucherStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "selling"
  | "active"
  | "sold_out"
  | "expired"
  | "locked"
  | "cancelled"
  | "used"
export type OrderStatus = "pending_payment" | "payment_failed" | "confirmed" | "cancelled" | "refunded"
export type OrderPaymentStatus = "pending" | "paid" | "failed" | "refunded"

// Kept for pages that still reference the old admin sub-role concept;
// no longer used on AppUser (admin_content/admin_operations/admin_security are
// full Role values now).
export type AdminSubRole = "content" | "operations" | "security" | "system-hr" | "biz-ops" | "content-tech"

export interface AdminUser {
  id: string
  email: string
  phone: string | null
  full_name: string
  role: Role
  is_active: boolean
  is_verified: boolean
  partner_id: string | null
  partner_branches_id: string | null
  created_at: string
  updated_at: string
}

export type UserQuery = {
  page?: number
  limit?: number
  search?: string
  full_name?: string
  email?: string
  phone?: string
  role?: Role
  is_active?: boolean
}

export type CreateUserData = {
  email: string
  password: string
  full_name: string
  phone?: string
  role: string
  partner_id?: string
  partner_branches_id?: string
}

export type UpdateUserData = {
  email?: string
  full_name?: string
  phone?: string
  role?: string
  is_active?: boolean
  partner_id?: string | null
  partner_branches_id?: string | null
}

export interface AppUser {
  id: string
  name: string
  avatarUrl?: string
  email: string
  role: Role
  partnerId?: string
  branchId?: string
  branchName?: string
}

export interface Voucher {
  id: string
  partnerId: string
  partnerName: string
  partnerLogo: string
  title: string
  category: string
  categoryId?: string
  discount: number
  discountType: "percent" | "fixed"
  minOrder: number
  price: number
  originalPrice: number
  validFrom: string
  validTo: string
  createdAt?: string
  quantity: number
  sold: number
  status: VoucherStatus
  rejection_reason?: string | null
  rating: number
  reviews: number
  description: string
  image: string
  tags: string[]
  applicableArea?: string | null
}

export interface Partner {
  id: string
  name: string
  logo: string
  category: string
  address: string
  taxCode?: string
  representative?: string
  website?: string
  description?: string
  branches: number
  status: "approved" | "pending" | "rejected"
  joinDate: string
}

export interface Branch {
  id: string
  partnerId: string
  name: string
  address: string
  city: string
  district: string
  phone: string
  email: string
  openTime: string
  closeTime: string
  status: "active" | "inactive"
}

export interface StaffMember {
  id: string
  partnerId: string
  branchId: string
  branchName: string
  name: string
  email: string
  phone: string
  username: string
  status: "active" | "banned"
  joinDate: string
  staffRole?: "voucher-creator" | "store-staff"
}

export interface Order {
  id: string
  userId: string
  userName?: string
  orderCode?: string
  voucherId: string
  voucherTitle: string
  partnerId?: string
  partnerName: string
  amount: number
  refundAmount?: number
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  paymentMethod: string
  refundRef?: string
  refundedAt?: string
  createdAt: string
  updatedAt?: string
  code: string
  qrPayload?: string
  recipientId?: string
  isGift?: boolean
  giverName?: string
  complaints?: Complaint[]
  paymentExpiresAt?: string
  items?: OrderItem[]
  payments?: Payment[]
  note?: string
}

export interface OrderListItem {
  id: string
  userId: string
  userName?: string
  orderCode: string
  code: string
  voucherId: string
  voucherTitle: string
  partnerName: string
  amount: number
  refundAmount?: number
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  paymentMethod: string
  createdAt: string
  recipientId?: string
  isGift: boolean
  paymentExpiresAt?: string
  hasComplaint: boolean
  items: OrderListProduct[]
}

export interface OrderListProduct {
  voucherId: string
  quantity: number
  voucherTitle: string
  partnerName: string
  issuedCount: number
  invalidatedCount?: number
  hasReview: boolean
}

export interface OrderItem {
  id: string
  voucherId: string
  quantity: number
  unitPrice: number
  subtotal: number
  voucherTitle?: string
  partnerName?: string
  image?: string
  issuedVouchers?: IssuedVoucher[]
}

export interface IssuedVoucher {
  id: string
  code: string
  qrPayload: string
  status: "active" | "used" | "expired" | "revoked" | "cancelled" | "refunded"
  expiredDate?: string
  review?: Review
  complaint?: Complaint
}

export interface Review {
  id: string
  issuedVoucherId?: string
  rating: number
  comment: string | null
  mediaUrls: string[]
  createdAt: string
}

export interface ReviewTarget {
  id: string
  voucherId: string
  voucherTitle: string
  partnerName: string
  image?: string
  code?: string
  amount?: number
  reviewable: boolean
  review?: Review
}

export type ComplaintStatus = "open" | "contacting_partner" | "reissued" | "refunded" | "rejected"

export interface Complaint {
  id: string
  issuedVoucherId?: string
  reason: string
  description: string
  evidenceUrls: string[]
  status: ComplaintStatus
  resolutionNote?: string | null
  resolutionType?: string | null
  resolutionTypes?: string[]
  createdAt: string
  resolvedAt?: string | null
}

export interface Payment {
  id: string
  orderId: string
  method: "vnpay" | "paypal"
  amount: number
  status: "pending" | "processing" | "success" | "failed" | "refunded"
  transactionRef?: string
  paidAt?: string
  refundRef?: string
  refundedAt?: string
  gatewayResponse?: string
  checkout_url?: string
  createdAt?: string
}

export interface CartItem {
  voucher: Voucher
  qty: number
  cartItemId?: string
}

export type CheckoutDraft =
  | { kind: "cart"; voucherIds: string[]; cartItemIds: string[] }
  | { kind: "direct"; items: CartItem[] }

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: "customer" | "admin"
  status: "active" | "banned"
  joinDate: string
  orders: number
}

export interface Category {
  id: string
  name: string
  icon: string
  description: string
  status: "active" | "inactive"
  voucherCount: number
}

export interface Feedback {
  id: string
  userId: string
  userName: string
  content: string
  createdAt: string
  status: "open" | "replied" | "closed"
  reply?: string
}

export interface VerificationRecord {
  id: string
  voucherCode: string
  voucherTitle: string
  customerName: string
  branchName: string
  staffName: string
  verifiedAt: string
  status: "valid" | "invalid" | "used"
}

// ── FC-PAV-MANAGE: VoucherProduct types (match backend Prisma) ──────
export interface VoucherProduct {
  id: string
  partner_id: string
  category_id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  original_price: number
  selling_price: number
  discount_rate: number
  applicable_area: string | null
  total_quantity: number
  remaining_quantity: number
  terms_and_conditions: unknown | null
  usage_instructions: unknown | null
  sale_start_date: string
  sale_end_date: string
  validity_days: number
  status: VoucherProductStatus
  approval_status: ApprovalStatus
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type VoucherProductStatus = "draft" | "active" | "paused" | "sold_out" | "expired"
export type ApprovalStatus = "pending" | "approved" | "rejected"

export interface VoucherProductImage {
  id: string
  voucher_product_id: string
  image_url: string
  is_primary: boolean
  sort_order: number
}

export interface VoucherProductBranch {
  id: string
  voucher_product_id: string
  branch_id: string
  partner_branches?: {
    id: string
    branch_name: string
    address: string
    city: string
    district: string | null
    phone: string | null
  }
}

// ── FC-PAV-MANAGE: Field locking rules ─────────────────────────────
export const LOCKED_FIELDS_BY_STATUS: Record<string, string[]> = {
  draft: [],
  pending: [],
  approved: ["total_quantity", "remaining_quantity"],
  active: ["total_quantity", "remaining_quantity", "original_price", "selling_price"],
  sold_out: ["total_quantity", "remaining_quantity", "original_price", "selling_price", "name", "category_id"],
  expired: ["*"],
}

export function getLockedFields(status: string): string[] {
  return LOCKED_FIELDS_BY_STATUS[status] ?? ["*"]
}

export function isFieldLocked(status: string, field: string): boolean {
  const locked = getLockedFields(status)
  if (locked.includes("*")) return true
  return locked.includes(field)
}

// ── FC-PAV-REPORT: Staff voucher report type ───────────────────────
export interface StaffVoucherReportItem {
  voucher_product_id: string;
  program_name: string;
  category_name: string;
  total_quantity: number;
  sold_quantity: number;
  used_quantity: number;
  usage_rate: number;
  revenue: number;
  effectiveness_score: number;
}

// ── FC-PAS-CHECK: Voucher check result type ───────────────────────
export interface CheckVoucherResult {
  issued_voucher: {
    id: string
    voucher_code: string
    qr_code_payload: string
    status: string
    expired_date: string
    issued_date: string
    created_at: string
    owner_id: string
    voucher_products: {
      id: string
      name: string
      partner_id: string
      thumbnail_url: string | null
      remaining_quantity: number | null
      partners: { business_name: string }
    }
    order_items?: {
      id: string
      quantity: number | null
      orders?: {
        id: string
        order_code: string | null
        total_amount: number
        payment_method: string
        status: string
        created_at: string
        users: { full_name: string }
      } | null
    } | null
    reviews?: { id: string; rating: number; comment: string | null; media_urls: string[]; created_at: string }[]
    complaints?: { id: string; reason: string; status: string; created_at: string }[]
  }
  eligible_branch_ids: string[]
  eligible_branches?: { id: string; branch_name: string }[]
  is_test?: boolean
}

// ── FC-ADC-CONTENT: CMS Content type ─────────────────────────────
export interface CmsContent {
  id: string
  content_type: string
  title: string
  content: string | null
  image_url: string | null
  status: string
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}
