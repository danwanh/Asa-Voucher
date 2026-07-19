# Asa Voucher Bruno Tests

Collection này test các API trong `backend/docs/api-crud.md` mục 2-6.

## Chuẩn bị

1. Chạy migration và seed trước.
2. Chạy backend bằng `npm run dev` trong thư mục `backend`.
3. Mở collection `backend/bruno` bằng Bruno.
4. Chọn environment `Local`.
5. Chạy folder `00 Auth` trước để lấy token vào environment variables.
6. Sau đó có thể chạy toàn bộ collection theo thứ tự folder.

Seed password cho tất cả user: `Password123!`.

## Biến chính

- `baseUrl`: mặc định `http://localhost:5000/api/v1`
- `buyerToken`, `partnerToken`, `voucherStaffToken`, `adminContentToken`, `adminAccountToken`: được set tự động sau login.
- Các ID seed nằm trong `collection.bru`.

Một số request tạo mới dùng pre-request script để tạo suffix theo timestamp và lưu ID response cho request sau.

## Chạy bằng Bruno CLI

Nếu đã cài Bruno CLI:

```bash
bru run backend/bruno --env Local
```

Hoặc chạy từ thư mục `backend`:

```bash
bru run bruno --env Local
```
