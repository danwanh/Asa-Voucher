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
export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled" | "used"

// Kept for pages that still reference the old admin sub-role concept;
// no longer used on AppUser (admin_content/admin_operations/admin_security are
// full Role values now).
export type AdminSubRole = "content" | "operations" | "security"

export interface AdminUser {
  id: string
  email: string
  phone: string | null
  full_name: string
  role: Role
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export type UserQuery = {
  page?: number
  limit?: number
  search?: string
  role?: string
  is_active?: boolean
}

export type CreateUserData = {
  email: string
  password: string
  full_name: string
  phone?: string
  role: string
}

export type UpdateUserData = {
  email?: string
  full_name?: string
  phone?: string
  role?: string
  is_active?: boolean
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: Role
  partnerId?: string
  branchId?: string
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
  quantity: number
  sold: number
  status: VoucherStatus
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
  orderCode?: string
  voucherId: string
  voucherTitle: string
  partnerName: string
  amount: number
  status: OrderStatus
  paymentMethod: string
  createdAt: string
  updatedAt?: string
  code: string
  qrPayload?: string
  paymentStatus?: "pending" | "paid" | "failed" | "refunded"
  recipientId?: string
  isGift?: boolean
  giverName?: string
  complaints?: Complaint[]
  paymentExpiresAt?: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  voucherId: string
  quantity: number
  unitPrice: number
  subtotal: number
  voucherTitle?: string
  partnerName?: string
  issuedVouchers?: IssuedVoucher[]
}

export interface IssuedVoucher {
  id: string
  code: string
  qrPayload: string
  status: "active" | "used" | "expired" | "refunded"
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

export type ComplaintStatus = "open" | "under_review" | "resolved" | "closed"

export interface Complaint {
  id: string
  issuedVoucherId?: string
  reason: string
  description: string
  evidenceUrls: string[]
  status: ComplaintStatus
  resolutionNote?: string | null
  resolutionType?: string | null
  createdAt: string
  resolvedAt?: string | null
}

export interface Payment {
  id: string
  orderId: string
  method: "vnpay" | "paypal"
  amount: number
  status: "pending" | "success" | "failed" | "refunded"
  transactionRef?: string
  checkout_url?: string
}

export interface CartItem {
  voucher: Voucher
  qty: number
  cartItemId?: string
}

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
