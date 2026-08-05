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
export type OrderStatus = "pending" | "completed" | "cancelled" | "used"

// Kept for pages that still reference the old admin sub-role concept;
// no longer used on AppUser (admin_content/admin_operations/admin_security are
// full Role values now).
export type AdminSubRole = "content" | "operations" | "security"

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
  voucherId: string
  voucherTitle: string
  partnerName: string
  amount: number
  status: OrderStatus
  paymentMethod: string
  createdAt: string
  code: string
}

export interface CartItem {
  voucher: Voucher
  qty: number
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
