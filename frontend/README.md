# Asa Voucher Frontend

Next.js App Router application for Asa Voucher user interfaces.

## Yêu cầu môi trường

- Node.js LTS, khuyến nghị Node.js 20 hoặc mới hơn.
- npm, dùng thống nhất cho toàn bộ dự án.

## Cài đặt

```bash
cd frontend
npm install
```

## Cấu hình môi trường

Tạo `.env.local` từ `.env.example`:

```bash
cp .env.example .env.local
```

Biến môi trường:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=example-anon-key
```

Không ghi secret thật vào repository.

## Chạy development

```bash
npm run dev
```

## Build production

```bash
npm run build
npm run start
```

## Kiểm tra mã nguồn

```bash
npm run lint
npm run type-check
```

## Cấu trúc frontend

- `app`: route, layout, page và metadata của Next.js App Router.
- `components`: UI component dùng chung.
- `features`: module theo nghiệp vụ như voucher, cart, order, partner, admin.
- `services`: Axios clients và hàm gọi backend API.
- `hooks`: React hooks dùng chung.
- `stores`: Zustand hoặc Context state dùng chung.
- `lib`: tiện ích cấu hình, constants, helpers.
- `types`: TypeScript types dùng chung cho frontend.
