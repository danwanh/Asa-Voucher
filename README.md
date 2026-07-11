# Asa Voucher Platform

Asa Voucher là nền tảng thương mại điện tử chuyên bán **voucher điện tử** trực tuyến, kết nối khách hàng, đối tác doanh nghiệp và nhân viên cửa hàng trong một hệ sinh thái quản lý voucher toàn diện.

---

## Tổng quan dự án

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 14+, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth / JWT |
| Storage | Supabase Storage |

---

## Vai trò người dùng

| Vai trò | Mô tả |
|---|---|
| `customer` | Khách hàng mua voucher |
| `partner_manager` | Nhân viên quản lý của đối tác |
| `partner_staff` | Nhân viên cửa hàng xác thực voucher |
| `admin_content` | Quản trị nội dung và duyệt voucher |
| `admin_account` | Quản trị tài khoản và đối tác |
| `admin_security` | Quản trị log và bảo mật |

---

## Luồng nghiệp vụ chính

```
1. Đối tác đăng ký tài khoản doanh nghiệp
2. Admin duyệt đối tác
3. Nhân viên đối tác tạo voucher
4. Admin nội dung duyệt voucher
5. Voucher được công bố bán trên hệ thống
6. Khách hàng tìm kiếm, thêm vào giỏ hàng và mua voucher
7. Hệ thống xử lý thanh toán mô phỏng
8. Hệ thống phát hành voucher code / QR code
9. Nhân viên cửa hàng xác thực voucher
10. Hệ thống tổng hợp báo cáo và audit log
```

---

## Yêu cầu môi trường

- **Node.js** >= 20 LTS
- **npm** >= 10
- **Supabase** project (URL + keys)

---

## Cài đặt toàn bộ dự án

```bash
# Clone repository
git clone https://github.com/your-org/asa-voucher-platform.git
cd asa-voucher-platform

# Cài đặt dependencies cho cả frontend và backend
npm run install:all
```

---

## Chạy Frontend

```bash
cd frontend
cp .env.example .env.local
# Điền giá trị thực vào .env.local
npm run dev
```

Frontend chạy tại: http://localhost:3000

---

## Chạy Backend

```bash
cd backend
cp .env.example .env
# Điền giá trị thực vào .env
npm run dev
```

Backend chạy tại: http://localhost:5000

---

## Biến môi trường cần thiết

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
```

> ⚠️ **Không đưa các secret thật lên Git.** Chỉ commit file `.env.example`.

---

## Cấu trúc thư mục tổng quan

```
asa-voucher-platform/
├── frontend/          # Next.js App Router (React + TypeScript)
├── backend/           # Express.js REST API (Node.js + TypeScript)
├── docs/              # Tài liệu dự án, ERD, API spec
├── .gitignore
├── package.json       # Root monorepo scripts
└── README.md
```

Xem chi tiết trong:
- [`frontend/README.md`](./frontend/README.md)
- [`backend/README.md`](./backend/README.md)
