# Asa Voucher Platform

Hệ thống quản lý và bán voucher ASA.

---

# Yêu cầu môi trường

- **Node.js** >= 20 LTS
- **npm** >= 10
- **Git**
- Tài khoản **Supabase** (https://supabase.com)

Kiểm tra phiên bản:

```bash
node -v
npm -v
git --version
```

---

# Cài đặt dự án

Clone repository:

```bash
git clone https://github.com/your-org/asa-voucher-platform.git
cd asa-voucher-platform
```

Cài đặt toàn bộ dependencies:

```bash
npm run install:all
```

Hoặc nếu script chưa có:

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

---

# Cấu hình biến môi trường

Mỗi project đều có file mẫu.

## Frontend

```bash
cd frontend
cp .env.example .env.local
```

Mở `.env.local` và điền giá trị.

---

## Backend

```bash
cd backend
cp .env.example .env
```

Mở `.env` và điền giá trị.

---

# Chạy Frontend

```bash
cd frontend
npm run dev
```

Mặc định:

```
http://localhost:3000
```

---

# Chạy Backend

```bash
cd backend
npm run dev
```

Mặc định:

```
http://localhost:5000
```

---

# Biến môi trường

## Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Backend (`backend/.env`)

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

---

# Hướng dẫn lấy các biến môi trường

## 1. Tạo project Supabase

1. Truy cập https://supabase.com
2. Đăng nhập.
3. Chọn **New Project**.
4. Đặt tên project.
5. Chọn mật khẩu database.
6. Chọn Region.
7. Chờ khoảng 1–2 phút để project được tạo.

---

## 2. Lấy `SUPABASE_URL`

Vào:

```
Project
└── Settings
    └── API
```

Hoặc giao diện mới:

```
Project Settings
└── Data API
```

Copy giá trị:

```
Project URL
```

Ví dụ:

```text
https://abcdefghijk.supabase.co
```

Dùng cho:

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_URL=...
```

---

## 3. Lấy `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Trong cùng trang API, tìm:

```
Project API Keys
```

Copy:

```
Publishable key (anon)
```

Dùng cho:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_ANON_KEY=...
```

Đây là key dành cho client nên có thể sử dụng ở frontend.

---

## 4. Lấy `SUPABASE_SERVICE_ROLE_KEY`

Trong cùng trang API.

Copy:

```
Secret key (service_role)
```

Hoặc trên một số project cũ:

```
service_role
```

Dùng cho:

```env
SUPABASE_SERVICE_ROLE_KEY=...
```

⚠ **Không sử dụng key này ở frontend.**

⚠ **Không commit lên GitHub.**

---

## 5. Tạo `JWT_SECRET`

`JWT_SECRET` **không lấy từ Supabase**.

Đây là chuỗi bí mật dùng để ký JWT của backend.

Có thể tạo bằng Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ví dụ:

```text
7c9e9d5f1a5a9d5a2c5b7d8e9f0123456789abcdef0123456789abcdef012345
```

Đưa vào:

```env
JWT_SECRET=7c9e9d5f1a5a9d5a2c5b7d8e9f0123456789abcdef0123456789abcdef012345
```

Hoặc sử dụng bất kỳ chuỗi ngẫu nhiên đủ dài nào.

---

# Cấu trúc chạy dự án

Mở **2 terminal**.

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Sau khi cả hai server khởi động thành công:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

# Lưu ý

- Chỉ commit `.env.example`.
- Không commit `.env` hoặc `.env.local`.
- Không chia sẻ `SUPABASE_SERVICE_ROLE_KEY`.
- Không chia sẻ `JWT_SECRET`.
- Đảm bảo backend đang chạy trước khi sử dụng frontend để tránh lỗi kết nối API.