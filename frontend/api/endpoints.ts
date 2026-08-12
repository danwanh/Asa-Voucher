const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1"

export const API = {
  // ── Auth ────────────────────────────────────────────────────
  // POST /auth/login        { email, password } → { token, user }
  AUTH_LOGIN: `${BASE_URL}/auth/login`,
  // POST /auth/register     { name, email, password, phone }
  AUTH_REGISTER: `${BASE_URL}/auth/register`,
  // POST /auth/logout
  AUTH_LOGOUT: `${BASE_URL}/auth/logout`,
  // GET  /auth/me            → AppUser
  AUTH_ME: `${BASE_URL}/auth/me`,

  // ── Voucher Products ────────────────────────────────────────
  // GET  /voucher-products           ?category=&search=&sort= → VoucherProduct[]
  VOUCHERS: `${BASE_URL}/voucher-products`,
  // GET  /voucher-products/:id       → VoucherProduct
  VOUCHER: (id: string) => `${BASE_URL}/voucher-products/${id}`,
  // POST /voucher-products           (Partner) { ...VoucherPayload } → VoucherProduct
  VOUCHER_CREATE: `${BASE_URL}/voucher-products`,
  // PATCH /voucher-products/:id      (Partner) → VoucherProduct
  VOUCHER_UPDATE: (id: string) => `${BASE_URL}/voucher-products/${id}`,
  // DELETE /voucher-products/:id     (Partner/Admin)
  VOUCHER_DELETE: (id: string) => `${BASE_URL}/voucher-products/${id}`,
  // PATCH /voucher-products/:id/submit   (Partner) gửi duyệt
  VOUCHER_SUBMIT: (id: string) => `${BASE_URL}/voucher-products/${id}/submit`,
  // PATCH /voucher-products/:id/approval (Admin) approve/reject
  VOUCHER_APPROVE: (id: string) => `${BASE_URL}/voucher-products/${id}/approval`,
  // PATCH /voucher-products/:id/status   (Admin) update status
  VOUCHER_REJECT: (id: string) => `${BASE_URL}/voucher-products/${id}/status`,

  // ── Orders ──────────────────────────────────────────────────
  // GET  /orders             (Customer) → Order[]
  ORDERS: `${BASE_URL}/orders`,
  // GET  /orders/admin       (Admin) ?status=&page= → Order[]
  ORDERS_ADMIN: `${BASE_URL}/orders/admin`,
  // POST /orders             { cart_item_ids, recipient_identifier, is_gift, payment_method } → Order
  ORDER_CREATE: `${BASE_URL}/orders`,
  // GET  /orders/:id         → Order
  ORDER: (id: string) => `${BASE_URL}/orders/${id}`,
  // POST /orders/:id/cancel  (Customer)
  ORDER_CANCEL: (id: string) => `${BASE_URL}/orders/${id}/cancel`,
  ORDER_PAYMENTS: (id: string) => `${BASE_URL}/orders/${id}/payments`,
  PAYMENT_SUCCESS: (id: string) => `${BASE_URL}/payments/${id}/simulate-success`,
  PAYMENT_FAILED: (id: string) => `${BASE_URL}/payments/${id}/simulate-failed`,

  // ── Voucher Code Verification ────────────────────────────────
  // POST /issued-vouchers/validate    (Partner) { code } → { order, valid }
  VOUCHER_VERIFY: `${BASE_URL}/issued-vouchers/validate`,
  // POST /issued-vouchers/:id/redeem  (Partner) → Order (status=used)
  VOUCHER_REDEEM: (id: string) => `${BASE_URL}/issued-vouchers/${id}/redeem`,

  // ── Users ────────────────────────────────────────────────────
  // GET  /users              (Admin) ?role=&status= → User[]
  USERS: `${BASE_URL}/users`,
  // GET  /users/:id          → User
  USER: (id: string) => `${BASE_URL}/users/${id}`,
  // PUT  /users/:id          (Admin/Owner) → User
  USER_UPDATE: (id: string) => `${BASE_URL}/users/${id}`,
  // POST /users/:id/ban      (Admin)
  USER_BAN: (id: string) => `${BASE_URL}/users/${id}/ban`,
  // POST /users/:id/unban    (Admin)
  USER_UNBAN: (id: string) => `${BASE_URL}/users/${id}/unban`,

  // ── Partners ────────────────────────────────────────────────
  // GET  /partners           (Admin) ?status= → Partner[]
  PARTNERS: `${BASE_URL}/partners`,
  // GET  /partners/:id       → Partner
  PARTNER: (id: string) => `${BASE_URL}/partners/${id}`,
  // POST /partners           đăng ký đối tác
  PARTNER_CREATE: `${BASE_URL}/partners`,
  // PUT  /partners/:id       (Partner/Admin) → Partner
  PARTNER_UPDATE: (id: string) => `${BASE_URL}/partners/${id}`,
  // POST /partners/:id/approve  (Admin)
  PARTNER_APPROVE: (id: string) => `${BASE_URL}/partners/${id}/approve`,
  // POST /partners/:id/reject   (Admin) { reason }
  PARTNER_REJECT: (id: string) => `${BASE_URL}/partners/${id}/reject`,

  // ── Reports ─────────────────────────────────────────────────
  // GET  /reports/revenue    (Admin/Partner) ?from=&to= → RevenueData[]
  REPORT_REVENUE: `${BASE_URL}/reports/revenue`,
  // GET  /reports/vouchers   (Admin/Partner) → VoucherStats[]
  REPORT_VOUCHERS: `${BASE_URL}/reports/vouchers`,

  // ── System Logs ─────────────────────────────────────────────
  // GET  /logs               (Admin) ?level=&type=&page= → Log[]
  LOGS: `${BASE_URL}/logs`,
} as const
