// Must match backend/src/types/role.ts UserRole exactly.
export type Role =
  | "buyer"
  | "partner_owner"
  | "partner_voucher_staff"
  | "partner_store_staff"
  | "admin_content"
  | "admin_account"
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
// no longer used on AppUser (admin_content/admin_account/admin_security are
// full Role values now).
export type AdminSubRole = "content" | "account" | "security"

export interface AppUser {
  id: string
  name: string
  email: string
  role: Role
  partnerId?: string
  branchId?: string
}

// ── VoucherProduct: matches backend Prisma voucher_products table ─────
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

// ── Field locking rules (FC-PAV-MANAGE) ────────────────────────────
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

// ── Legacy Voucher interface (kept for existing page compatibility) ──
export interface Voucher {
  id: string
  partnerId: string
  partnerName: string
  partnerLogo: string
  title: string
  category: string
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
}

// ── Converter: VoucherProduct → legacy Voucher ──────────────────────
export function toLegacyVoucher(vp: VoucherProduct, partnerName?: string): Voucher {
  return {
    id: vp.id,
    partnerId: vp.partner_id,
    partnerName: partnerName ?? "",
    partnerLogo: "",
    title: vp.name,
    category: vp.category_id,
    discount: vp.discount_rate,
    discountType: vp.selling_price < vp.original_price ? "percent" : "fixed",
    minOrder: 0,
    price: vp.selling_price,
    originalPrice: vp.original_price,
    validFrom: vp.sale_start_date,
    validTo: vp.sale_end_date,
    quantity: vp.total_quantity,
    sold: vp.total_quantity - vp.remaining_quantity,
    status: vp.status as VoucherStatus,
    rating: 0,
    reviews: 0,
    description: vp.description ?? "",
    image: vp.thumbnail_url ?? "",
    tags: [],
  }
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
