// Base URL — thay bằng URL backend thật khi tích hợp
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1"

export const API = {
  // ── Auth ────────────────────────────────────────────────────
  AUTH_LOGIN: `${BASE_URL}/auth/login`,
  AUTH_REGISTER: `${BASE_URL}/auth/register`,
  AUTH_LOGOUT: `${BASE_URL}/auth/logout`,
  AUTH_ME: `${BASE_URL}/auth/me`,

  // ── Voucher Products (FC-PAV-MANAGE) ───────────────────────
  // GET  /voucher-products            ?category_id=&partner_id=&search=&page=&limit=
  VOUCHERS: `${BASE_URL}/voucher-products`,
  // GET  /voucher-products/:id        (public if approved+active, else owner/admin only)
  VOUCHER: (id: string) => `${BASE_URL}/voucher-products/${id}`,
  // POST /voucher-products            (partner_owner | partner_voucher_staff)
  VOUCHER_CREATE: `${BASE_URL}/voucher-products`,
  // PATCH /voucher-products/:id       (owner/admin only)
  VOUCHER_UPDATE: (id: string) => `${BASE_URL}/voucher-products/${id}`,
  // DELETE /voucher-products/:id      (soft-delete → status=paused)
  VOUCHER_DELETE: (id: string) => `${BASE_URL}/voucher-products/${id}`,
  // PATCH /voucher-products/:id/submit   (partner) → approval_status=pending
  VOUCHER_SUBMIT: (id: string) => `${BASE_URL}/voucher-products/${id}/submit`,
  // PATCH /voucher-products/:id/approval (admin_content) → approval_status=approved|rejected
  VOUCHER_APPROVE: (id: string) => `${BASE_URL}/voucher-products/${id}/approval`,
  // PATCH /voucher-products/:id/status   (owner/admin) → status change
  VOUCHER_STATUS: (id: string) => `${BASE_URL}/voucher-products/${id}/status`,
  // GET  /voucher-products/:id/images
  VOUCHER_IMAGES: (id: string) => `${BASE_URL}/voucher-products/${id}/images`,
  // POST /voucher-products/:id/images
  VOUCHER_IMAGE_CREATE: (id: string) => `${BASE_URL}/voucher-products/${id}/images`,
  // PATCH /voucher-product-images/:imageId
  VOUCHER_IMAGE_UPDATE: (imageId: string) => `${BASE_URL}/voucher-product-images/${imageId}`,
  // DELETE /voucher-product-images/:imageId
  VOUCHER_IMAGE_DELETE: (imageId: string) => `${BASE_URL}/voucher-product-images/${imageId}`,
  // GET  /voucher-products/:id/branches
  VOUCHER_BRANCHES: (id: string) => `${BASE_URL}/voucher-products/${id}/branches`,
  // POST /voucher-products/:id/branches
  VOUCHER_BRANCH_CREATE: (id: string) => `${BASE_URL}/voucher-products/${id}/branches`,
  // DELETE /voucher-products/:id/branches/:branchId
  VOUCHER_BRANCH_DELETE: (id: string, branchId: string) => `${BASE_URL}/voucher-products/${id}/branches/${branchId}`,

  // ── Orders ──────────────────────────────────────────────────
  ORDERS: `${BASE_URL}/orders`,
  ORDERS_ADMIN: `${BASE_URL}/orders/admin`,
  ORDER_CREATE: `${BASE_URL}/orders`,
  ORDER: (id: string) => `${BASE_URL}/orders/${id}`,
  ORDER_CANCEL: (id: string) => `${BASE_URL}/orders/${id}/cancel`,

  // ── Voucher Code Verification ────────────────────────────────
  VOUCHER_VERIFY: `${BASE_URL}/issued-vouchers/validate`,
  VOUCHER_REDEEM: `${BASE_URL}/issued-vouchers/redeem`,

  // ── Users ────────────────────────────────────────────────────
  USERS: `${BASE_URL}/users`,
  USER: (id: string) => `${BASE_URL}/users/${id}`,
  USER_UPDATE: (id: string) => `${BASE_URL}/users/${id}`,
  USER_BAN: (id: string) => `${BASE_URL}/users/${id}/ban`,
  USER_UNBAN: (id: string) => `${BASE_URL}/users/${id}/unban`,

  // ── Partners ────────────────────────────────────────────────
  PARTNERS: `${BASE_URL}/partners`,
  PARTNER: (id: string) => `${BASE_URL}/partners/${id}`,
  PARTNER_CREATE: `${BASE_URL}/partners`,
  PARTNER_UPDATE: (id: string) => `${BASE_URL}/partners/${id}`,
  PARTNER_APPROVE: (id: string) => `${BASE_URL}/partners/${id}/approve`,
  PARTNER_REJECT: (id: string) => `${BASE_URL}/partners/${id}/reject`,

  // ── Reports ─────────────────────────────────────────────────
  REPORT_REVENUE: `${BASE_URL}/reports/revenue`,
  REPORT_VOUCHERS: `${BASE_URL}/reports/vouchers`,

  // ── System Logs ─────────────────────────────────────────────
  LOGS: `${BASE_URL}/admin-logs`,
} as const
