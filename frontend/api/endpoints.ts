// Base URL — thay bằng URL backend thật khi tích hợp
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api"

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

  // ── Vouchers ────────────────────────────────────────────────
  // GET  /vouchers           ?category=&search=&sort= → Voucher[]
  VOUCHERS: `${BASE_URL}/vouchers`,
  // GET  /vouchers/:id       → Voucher
  VOUCHER: (id: string) => `${BASE_URL}/vouchers/${id}`,
  // POST /vouchers           (Partner) { ...VoucherPayload } → Voucher
  VOUCHER_CREATE: `${BASE_URL}/vouchers`,
  // PUT  /vouchers/:id       (Partner) → Voucher
  VOUCHER_UPDATE: (id: string) => `${BASE_URL}/vouchers/${id}`,
  // DELETE /vouchers/:id     (Partner/Admin)
  VOUCHER_DELETE: (id: string) => `${BASE_URL}/vouchers/${id}`,
  // POST /vouchers/:id/submit-review   (Partner) gửi duyệt
  VOUCHER_SUBMIT: (id: string) => `${BASE_URL}/vouchers/${id}/submit-review`,
  // POST /vouchers/:id/approve         (Admin)
  VOUCHER_APPROVE: (id: string) => `${BASE_URL}/vouchers/${id}/approve`,
  // POST /vouchers/:id/reject          (Admin) { reason }
  VOUCHER_REJECT: (id: string) => `${BASE_URL}/vouchers/${id}/reject`,

  // ── Orders ──────────────────────────────────────────────────
  // GET  /orders             (Customer) → Order[]
  ORDERS: `${BASE_URL}/orders`,
  // GET  /orders/admin       (Admin) ?status=&page= → Order[]
  ORDERS_ADMIN: `${BASE_URL}/orders/admin`,
  // POST /orders             { voucherId, qty, paymentMethod } → Order
  ORDER_CREATE: `${BASE_URL}/orders`,
  // GET  /orders/:id         → Order
  ORDER: (id: string) => `${BASE_URL}/orders/${id}`,
  // POST /orders/:id/cancel  (Customer)
  ORDER_CANCEL: (id: string) => `${BASE_URL}/orders/${id}/cancel`,

  // ── Voucher Code Verification ────────────────────────────────
  // POST /vouchers/verify    (Partner) { code } → { order, valid }
  VOUCHER_VERIFY: `${BASE_URL}/vouchers/verify`,
  // POST /vouchers/redeem    (Partner) { code } → Order (status=used)
  VOUCHER_REDEEM: `${BASE_URL}/vouchers/redeem`,

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
