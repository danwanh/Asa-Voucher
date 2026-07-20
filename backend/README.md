# Asa Voucher Backend

Express.js REST API for protected Asa Voucher workflows.

## Yêu cầu môi trường

- Node.js LTS, khuyến nghị Node.js 20 hoặc mới hơn.
- Supabase project.
- npm, dùng thống nhất với frontend.

## Cài đặt

```bash
cd backend
npm install
```

## Cấu hình môi trường

Tạo `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Biến môi trường cần thiết:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Runtime connection for Prisma Client. Use Supabase pooler when deploying the app.
DATABASE_URL="postgresql://postgres.example:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct/session connection for Prisma migrations.
# Copy from Supabase Dashboard > Project Settings > Database > Connection string > URI,
# or use Supabase's session pooler if direct db.example.supabase.co is not reachable.
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.example.supabase.co:5432/postgres"

SUPABASE_URL=https://example.supabase.co
SUPABASE_ANON_KEY=example-anon-key
SUPABASE_SERVICE_ROLE_KEY=example-service-role-key

JWT_SECRET=replace-with-local-development-secret
JWT_EXPIRES_IN=7d
```

`DATABASE_URL` và `DIRECT_URL` phải là PostgreSQL connection string bắt đầu bằng `postgresql://`, không phải `SUPABASE_URL` dạng `https://...supabase.co`. Prisma Client dùng `DATABASE_URL`; Prisma migrate dùng `DIRECT_URL`.

Không đưa `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` hoặc secret thật lên Git.

## Chạy development

```bash
npm run dev
```

## Build và chạy production

```bash
npm run build
npm run start
```

## Chạy test

```bash
npm run test
```

## Kiểm tra mã nguồn

```bash
npm run lint
npm run type-check
```

## Database

- Backend dùng Prisma với Supabase Postgres qua `DATABASE_URL` trong `backend/.env`; không cần cấu hình database local.
- Prisma schema nằm ở `backend/prisma/schema.prisma` và đang dùng `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.
- Migration schema ứng dụng: chỉnh `backend/prisma/schema.prisma`, tạo migration bằng Prisma và deploy lên Supabase bằng `prisma migrate deploy`.
- Các file SQL trong `supabase/migrations/` là legacy/baseline Supabase SQL; migration mới nên đặt dưới `backend/prisma/migrations/`.
- Seed dữ liệu: đặt script hoặc SQL seed trong `supabase/seed/`, không hard-code secret.
- Tài khoản admin mẫu: tạo bằng Supabase Auth hoặc seed script riêng, sau đó gán role admin phù hợp trong bảng hồ sơ người dùng.
- Cấu hình Supabase: dùng `SUPABASE_URL`, `SUPABASE_ANON_KEY`, và chỉ dùng `SUPABASE_SERVICE_ROLE_KEY` ở backend cho tác vụ tin cậy.
- Row Level Security: bật RLS cho bảng chứa dữ liệu người dùng/đối tác/voucher; policy phải khớp với RBAC backend nếu dùng Supabase Auth trực tiếp.

## Chạy migration và seed

Nếu dùng Supabase hosted project với Prisma:

Nếu database đã có schema từ SQL/Supabase migration cũ nhưng chưa có bảng `_prisma_migrations`, baseline một lần trước:

```bash
npm --workspace backend run prisma:migrate:baseline
```

Sau đó deploy các migration Prisma còn lại:

```bash
npm --workspace backend run prisma:migrate:deploy
```

Để tạo migration mới sau khi chỉnh `prisma/schema.prisma`:

```bash
npm run prisma:migrate:dev -- --name <migration_name> --create-only
```

Sau đó review file trong `prisma/migrations/` rồi deploy bằng `npm run prisma:migrate:deploy`.


Seed users dùng chung mật khẩu:

```text
Password123!
```

Tài khoản seed chính:

| Email | Role |
| --- | --- |
| `buyer@asa.test` | `buyer` |
| `partner.owner@asa.test` | `partner_owner` |
| `voucher.staff@asa.test` | `partner_voucher_staff` |
| `store.staff@asa.test` | `partner_store_staff` |
| `admin.content@asa.test` | `admin_content` |
| `admin.account@asa.test` | `admin_account` |
| `admin.security@asa.test` | `admin_security` |

## Chạy API và test nhanh

Chạy backend:

```bash
npm run dev
```

Base URL mặc định:

```text
http://localhost:5000/api/v1
```

Đăng nhập lấy access token:

```bash
curl -i -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@asa.test","password":"Password123!"}'
```

Gọi API private:

```bash
curl http://localhost:5000/api/v1/cart \
  -H "Authorization: Bearer <access_token>"
```

Refresh token được lưu bằng cookie `HttpOnly` từ response login. Khi test bằng Postman/Insomnia, bật cookie jar và gọi:

```bash
POST http://localhost:5000/api/v1/auth/refresh
```

## Kiến trúc backend

- `controllers`: nhận request và trả response.
- `services`: xử lý nghiệp vụ như đơn hàng, thanh toán mô phỏng, phát hành voucher, xác thực voucher, audit log.
- `repositories`: truy cập Supabase/PostgreSQL.
- `routes`: khai báo endpoint và gắn middleware.
- `validations`: Zod schemas kiểm tra dữ liệu đầu vào.
- `middlewares`: xác thực, phân quyền, logging, validation và xử lý lỗi tập trung.
