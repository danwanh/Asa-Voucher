# API CRUD Backend - Asa Voucher

Tài liệu này liệt kê các API CRUD cơ bản cần viết cho backend dựa trên `docs/schema.md` và nghiệp vụ trong `docs/brd.md`.

## 1. Quy ước chung

### Base URL

```text
/api/v1
```

### Xác thực

- Các API công khai: xem danh mục, xem voucher đang bán, đăng ký, đăng nhập.
- Đăng nhập thành công trả `access_token` trong response body và set `refresh_token` vào cookie `HttpOnly`.
- Các API private yêu cầu header `Authorization: Bearer <access_token>`.
- `access_token` có thời gian sống ngắn, dùng để gọi API.
- `refresh_token` có thời gian sống dài hơn, chỉ lưu trong cookie `HttpOnly`, `Secure` ở production và `SameSite=Lax` hoặc `Strict`.
- Client không đọc refresh token bằng JavaScript; chỉ gửi cookie tự động khi gọi API refresh/logout.
- Token phải chứa hoặc tra được `user_id`, `role` và nếu là partner/staff thì có thông tin liên kết đối tác hoặc chi nhánh.

### Vai trò

| Role | Mô tả |
| --- | --- |
| `buyer` | Khách hàng mua voucher |
| `partner_owner` | Chủ đối tác, quản lý hồ sơ đối tác, chi nhánh và voucher |
| `partner_voucher_staff` | Nhân viên đối tác quản lý voucher sản phẩm |
| `partner_store_staff` | Nhân viên chi nhánh, xác thực/đổi voucher tại cửa hàng |
| `admin_content` | Duyệt voucher, quản lý danh mục/nội dung |
| `admin_account` | Duyệt đối tác, quản lý tài khoản |
| `admin_security` | Xem log bảo mật, log xác thực và log nghiệp vụ |

### Response chuẩn

```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

### Error response chuẩn

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": []
  }
}
```

### HTTP status cần dùng

| Status | Ý nghĩa |
| --- | --- |
| `200` | Thành công |
| `201` | Tạo mới thành công |
| `204` | Xóa thành công, không trả body |
| `400` | Dữ liệu không hợp lệ |
| `401` | Chưa đăng nhập |
| `403` | Không đủ quyền |
| `404` | Không tìm thấy dữ liệu |
| `409` | Xung đột dữ liệu hoặc vi phạm nghiệp vụ |
| `422` | Không thể xử lý do trạng thái không hợp lệ |

## 2. Auth và User APIs

### Auth

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Đăng ký tài khoản khách hàng |
| `POST` | `/auth/login` | Public | Đăng nhập, trả `access_token`, set cookie `refresh_token` HttpOnly |
| `POST` | `/auth/refresh` | Cookie `refresh_token` | Cấp lại `access_token`, có thể xoay vòng refresh token |
| `POST` | `/auth/logout` | Authenticated hoặc cookie `refresh_token` | Đăng xuất, thu hồi refresh token và clear cookie |
| `POST` | `/auth/forgot-password` | Public | Yêu cầu đặt lại mật khẩu mô phỏng |
| `POST` | `/auth/change-password` | Authenticated | Đổi mật khẩu |
| `GET` | `/auth/me` | Authenticated | Lấy thông tin người dùng hiện tại |

### Users

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/users` | `admin_account` | Danh sách người dùng, lọc theo role/trạng thái |
| `POST` | `/users` | `admin_account` | Tạo tài khoản nội bộ hoặc tài khoản đối tác |
| `GET` | `/users/{id}` | Owner hoặc `admin_account` | Xem chi tiết người dùng |
| `PATCH` | `/users/{id}` | Owner hoặc `admin_account` | Cập nhật hồ sơ, trạng thái, role |
| `DELETE` | `/users/{id}` | `admin_account` | Khóa/xóa mềm tài khoản |

### Nghiệp vụ chính

- Email là duy nhất.
- Mật khẩu phải được hash, không trả `password_hash` ra API.
- Người dùng chỉ được cập nhật hồ sơ của chính mình, trừ admin.
- Admin có thể khóa tài khoản bằng `is_active = false`.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Đăng ký thành công | `POST /auth/register` với email mới | Trả `201`, tạo user role `buyer`, không lộ `password_hash` |
| Trùng email | Gửi lại email đã tồn tại | Trả `409` |
| Đăng nhập đúng | `POST /auth/login` đúng email/password | Trả token và thông tin user |
| Đăng nhập sai | Sai password | Trả `401` |
| User sửa hồ sơ người khác | Buyer gọi `PATCH /users/{id-khac}` | Trả `403` |

## 3. Partner APIs

### Partners

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/partners` | `admin_account` | Danh sách đối tác, lọc trạng thái duyệt/trạng thái hoạt động |
| `POST` | `/partners` | `partner_owner` hoặc `admin_account` | Đăng ký/tạo đối tác |
| `GET` | `/partners/{id}` | Partner owner hoặc `admin_account` | Xem chi tiết đối tác |
| `PATCH` | `/partners/{id}` | Partner owner hoặc `admin_account` | Cập nhật thông tin đối tác |
| `DELETE` | `/partners/{id}` | `admin_account` | Đóng hoặc xóa mềm đối tác |
| `PATCH` | `/partners/{id}/approval` | `admin_account` | Duyệt hoặc từ chối đối tác |
| `PATCH` | `/partners/{id}/status` | `admin_account` | Kích hoạt, tạm khóa hoặc đóng đối tác |

### Partner branches

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/partners/{partnerId}/branches` | Partner owner, staff, admin | Danh sách chi nhánh |
| `POST` | `/partners/{partnerId}/branches` | Partner owner hoặc `admin_account` | Tạo chi nhánh |
| `GET` | `/branches/{id}` | Partner owner, staff, admin | Chi tiết chi nhánh |
| `PATCH` | `/branches/{id}` | Partner owner hoặc `admin_account` | Cập nhật chi nhánh |
| `DELETE` | `/branches/{id}` | Partner owner hoặc `admin_account` | Xóa mềm/tắt hoạt động chi nhánh |

### Nghiệp vụ chính

- Đối tác mới mặc định `approval_status = pending`.
- Chỉ `admin_account` được duyệt đối tác.
- Đối tác bị `suspended` hoặc `closed` không được tạo voucher mới.
- Partner chỉ được quản lý dữ liệu thuộc đối tác của mình.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Tạo đối tác | `POST /partners` với business code mới | Trả `201`, trạng thái duyệt `pending` |
| Trùng business code | Gửi business code đã tồn tại | Trả `409` |
| Buyer duyệt đối tác | Buyer gọi `/partners/{id}/approval` | Trả `403` |
| Admin duyệt đối tác | Admin gọi `PATCH /partners/{id}/approval` | `approval_status = approved`, có `approved_by`, `approved_at` |
| Partner sửa đối tác khác | Partner A sửa partner B | Trả `403` |

## 4. Category APIs

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/categories` | Public | Danh sách danh mục dạng cây hoặc phẳng |
| `POST` | `/categories` | `admin_content` | Tạo danh mục |
| `GET` | `/categories/{id}` | Public | Chi tiết danh mục |
| `PATCH` | `/categories/{id}` | `admin_content` | Cập nhật danh mục |
| `DELETE` | `/categories/{id}` | `admin_content` | Xóa danh mục nếu chưa có voucher đang dùng |

### Nghiệp vụ chính

- `slug` là duy nhất.
- Không cho xóa danh mục đang có voucher sản phẩm.
- Danh mục có thể có `parent_id` để tạo cây.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Public xem danh mục | `GET /categories` không token | Trả `200` |
| Tạo danh mục trùng slug | `POST /categories` cùng slug | Trả `409` |
| Buyer tạo danh mục | Buyer gọi `POST /categories` | Trả `403` |
| Xóa danh mục đang dùng | `DELETE /categories/{id}` có voucher | Trả `409` |

## 5. Voucher Product APIs

### Voucher products

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/voucher-products` | Public | Danh sách voucher đang bán, có lọc/search/sort |
| `POST` | `/voucher-products` | `partner_owner` hoặc `partner_voucher_staff` | Tạo voucher ở trạng thái nháp hoặc chờ duyệt |
| `GET` | `/voucher-products/{id}` | Public hoặc owner/admin | Chi tiết voucher |
| `PATCH` | `/voucher-products/{id}` | Owner partner | Cập nhật voucher khi chưa được bán |
| `DELETE` | `/voucher-products/{id}` | Owner partner hoặc `admin_content` | Xóa mềm/ngừng bán voucher |
| `PATCH` | `/voucher-products/{id}/submit` | Owner partner | Gửi voucher chờ duyệt |
| `PATCH` | `/voucher-products/{id}/approval` | `admin_content` | Duyệt hoặc từ chối voucher |
| `PATCH` | `/voucher-products/{id}/status` | Owner partner hoặc `admin_content` | Công bố, tạm ngưng, ngừng bán |

### Voucher product images

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/voucher-products/{id}/images` | Public | Danh sách hình ảnh voucher |
| `POST` | `/voucher-products/{id}/images` | Owner partner | Thêm hình ảnh |
| `PATCH` | `/voucher-product-images/{imageId}` | Owner partner | Cập nhật ảnh chính/thứ tự |
| `DELETE` | `/voucher-product-images/{imageId}` | Owner partner | Xóa ảnh |

### Voucher product branches

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/voucher-products/{id}/branches` | Public | Danh sách chi nhánh áp dụng |
| `POST` | `/voucher-products/{id}/branches` | Owner partner | Gán chi nhánh áp dụng |
| `DELETE` | `/voucher-products/{id}/branches/{branchId}` | Owner partner | Gỡ chi nhánh áp dụng |

### Nghiệp vụ chính

- Voucher chỉ được bán khi `approval_status = approved`, `status = active`, trong thời gian bán và `remaining_quantity > 0`.
- `selling_price` không được lớn hơn `original_price`.
- `discount_rate` có thể tính từ `original_price` và `selling_price`.
- `remaining_quantity` không được âm.
- Partner chỉ quản lý voucher thuộc đối tác của mình.
- Voucher đã có đơn hàng không nên xóa vật lý, chỉ cập nhật trạng thái.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Tạo voucher hợp lệ | Partner approved gọi `POST /voucher-products` | Trả `201`, có `remaining_quantity = total_quantity` |
| Giá bán lớn hơn giá gốc | `selling_price > original_price` | Trả `400` |
| Partner chưa duyệt tạo voucher | Partner `pending` gọi API | Trả `403` hoặc `422` |
| Public chỉ thấy voucher được bán | `GET /voucher-products` | Chỉ trả voucher `approved + active + còn hạn bán` |
| Duyệt voucher | Admin content gọi approval | Cập nhật `approval_status`, `approved_by`, `approved_at` |
| Partner sửa voucher của đối tác khác | Partner A sửa voucher B | Trả `403` |

## 6. Cart, Order và Payment APIs

### Carts

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/cart` | `buyer` | Lấy hoặc khởi tạo giỏ hàng hiện tại kèm danh sách item |
| `POST` | `/cart/items` | `buyer` | Thêm voucher product vào giỏ hàng hoặc gộp số lượng nếu đã tồn tại |
| `PATCH` | `/cart/items/{id}` | Owner buyer | Cập nhật số lượng item trong giỏ |
| `DELETE` | `/cart/items/{id}` | Owner buyer | Xóa một item khỏi giỏ hàng |
| `DELETE` | `/cart/items` | `buyer` | Xóa toàn bộ item trong giỏ hàng hiện tại |
| `POST` | `/cart/checkout` | `buyer` | Tạo đơn hàng từ các item trong giỏ hàng |

### Orders

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/orders` | Buyer owner, partner liên quan, admin | Danh sách đơn hàng theo quyền |
| `POST` | `/orders` | `buyer` | Tạo đơn hàng trực tiếp từ danh sách voucher hoặc từ `cart_item_ids` |
| `GET` | `/orders/{id}` | Owner, partner liên quan, admin | Chi tiết đơn hàng |
| `PATCH` | `/orders/{id}` | Owner hoặc admin | Cập nhật ghi chú/trạng thái phù hợp |
| `DELETE` | `/orders/{id}` | Owner hoặc admin | Hủy đơn nếu chưa thanh toán |
| `PATCH` | `/orders/{id}/cancel` | Owner hoặc admin | Hủy đơn hàng |

### Order items

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/orders/{orderId}/items` | Owner, partner liên quan, admin | Danh sách item trong đơn |
| `GET` | `/order-items/{id}` | Owner, partner liên quan, admin | Chi tiết item |

Không khuyến nghị viết API sửa/xóa `order_items` sau khi đơn đã tạo. Nếu cần thay đổi, hủy đơn và tạo đơn mới.

### Payments

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/orders/{orderId}/payments` | Owner hoặc admin | Lịch sử thanh toán của đơn |
| `POST` | `/orders/{orderId}/payments` | Owner | Tạo thanh toán mô phỏng |
| `PATCH` | `/payments/{id}/simulate-success` | Owner hoặc admin | Mô phỏng thanh toán thành công |
| `PATCH` | `/payments/{id}/simulate-failed` | Owner hoặc admin | Mô phỏng thanh toán thất bại |
| `GET` | `/payments/{id}` | Owner hoặc admin | Chi tiết thanh toán |

### Nghiệp vụ chính

- Mỗi buyer có một giỏ hàng hiện hành trong `carts`, tham chiếu `carts.user_id -> users.id`.
- Mỗi dòng giỏ hàng lưu voucher dự định mua trong `cart_items`, tham chiếu `cart_items.cart_id -> carts.id` và `cart_items.voucher_product_id -> voucher_products.id`.
- Không cho thêm voucher chưa bán hợp lệ vào giỏ hàng; vẫn phải kiểm tra lại tồn kho và trạng thái voucher khi checkout.
- Cùng một voucher product trong một giỏ hàng nên gộp số lượng thay vì tạo nhiều dòng trùng.
- `cart_items.quantity` phải là số nguyên dương và không vượt `voucher_products.remaining_quantity` tại thời điểm thêm/cập nhật/checkout.
- Khi checkout thành công từ giỏ hàng, backend tạo `orders` và `order_items`, sau đó xóa các `cart_items` đã checkout.
- Khi tạo đơn phải snapshot giá vào `order_items`.
- Tổng tiền đơn hàng tính từ `order_items`, không tin dữ liệu giá từ client.
- Chỉ cho mua voucher đang bán hợp lệ.
- Số lượng mua không vượt `remaining_quantity`.
- Khi thanh toán thành công: cập nhật `payment_status = paid`, `status = confirmed/completed`, giảm tồn kho và phát hành voucher điện tử.
- Thanh toán thật nằm ngoài phạm vi, chỉ cần mô phỏng.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Thêm vào giỏ hợp lệ | Buyer gọi `POST /cart/items` với voucher active còn hàng | Trả `201` hoặc `200`, tạo/cập nhật `cart_items` đúng `cart_id`, `voucher_product_id` |
| Thêm voucher không bán | Thêm voucher `draft/pending/expired` vào giỏ | Trả `422` |
| Cập nhật số lượng giỏ | `PATCH /cart/items/{id}` với quantity hợp lệ | Cập nhật số lượng, không vượt tồn kho hiện tại |
| Cập nhật item không thuộc giỏ | Buyer A sửa `cart_items.id` của Buyer B | Trả `403` hoặc `404` |
| Xóa toàn bộ giỏ | `DELETE /cart/items` | Xóa các item thuộc giỏ hiện tại, không ảnh hưởng giỏ user khác |
| Checkout từ giỏ | `POST /cart/checkout` | Tạo order và order_items từ cart_items, xóa item đã checkout |
| Tạo đơn hợp lệ | Buyer mua voucher active còn hàng | Trả `201`, tạo order và order_items snapshot giá |
| Mua quá tồn kho | Quantity lớn hơn `remaining_quantity` | Trả `409` |
| Mua voucher chưa duyệt | Tạo order với voucher `pending` | Trả `422` |
| Hủy đơn chưa thanh toán | `PATCH /orders/{id}/cancel` | Trạng thái `cancelled` |
| Thanh toán thành công | `PATCH /payments/{id}/simulate-success` | Payment `success`, order `paid`, phát hành đủ voucher code |
| Thanh toán lại đơn đã paid | Gọi simulate-success lần 2 | Trả `409` hoặc idempotent không phát hành trùng |

## 7. Issued Voucher và Redemption APIs

### Issued vouchers

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/issued-vouchers` | Owner, partner liên quan, admin | Danh sách voucher đã phát hành |
| `GET` | `/issued-vouchers/{id}` | Owner, partner liên quan, admin | Chi tiết voucher đã phát hành |
| `PATCH` | `/issued-vouchers/{id}/status` | Admin | Cập nhật trạng thái đặc biệt như refund/expired |

### Voucher validation and usage

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `POST` | `/issued-vouchers/validate` | `partner_store_staff`, `partner_owner`, admin | Kiểm tra voucher code hoặc QR payload |
| `POST` | `/issued-vouchers/{id}/redeem` | `partner_store_staff`, `partner_owner` | Xác nhận sử dụng voucher |
| `GET` | `/issued-vouchers/{id}/usages` | Owner, partner liên quan, admin/security | Lịch sử sử dụng voucher |
| `GET` | `/voucher-usages` | Partner, admin/security | Danh sách log xác thực |

### Nghiệp vụ chính

- Voucher code chỉ phát hành sau thanh toán thành công.
- Mỗi voucher code thuộc duy nhất một khách hàng.
- Voucher `expired`, `used`, `refunded` không được redeem.
- Voucher đã dùng không được dùng lại.
- Store staff chỉ được redeem tại chi nhánh được phân công.
- Chi nhánh redeem phải nằm trong danh sách chi nhánh áp dụng của voucher product.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Validate voucher active | Gửi voucher_code hợp lệ | Trả thông tin voucher, trạng thái có thể dùng |
| Redeem thành công | Staff đúng chi nhánh gọi `/redeem` | Tạo `voucher_usages`, issued voucher thành `used` |
| Redeem lần 2 | Gọi `/redeem` lại | Trả `409` |
| Redeem voucher hết hạn | Set expired rồi redeem | Trả `422` |
| Staff sai chi nhánh | Staff branch A redeem voucher chỉ áp dụng branch B | Trả `403` |

## 8. Review APIs

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/voucher-products/{id}/reviews` | Public | Danh sách review đã publish |
| `POST` | `/reviews` | `buyer` | Tạo đánh giá sau khi dùng voucher |
| `GET` | `/reviews/{id}` | Public hoặc owner/admin | Chi tiết review |
| `PATCH` | `/reviews/{id}` | Owner hoặc `admin_content` | Cập nhật comment/media hoặc trạng thái publish |
| `DELETE` | `/reviews/{id}` | Owner hoặc `admin_content` | Xóa mềm/ẩn review |
| `POST` | `/reviews/{id}/responses` | Partner owner hoặc admin | Phản hồi review |
| `GET` | `/reviews/{id}/responses` | Public | Danh sách phản hồi review |

### Nghiệp vụ chính

- Chỉ được review khi `issued_voucher.status = used`.
- `rating` từ 1 đến 5.
- Một issued voucher chỉ nên có một review.
- Review public chỉ hiển thị khi `is_published = true`.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Review voucher đã dùng | Buyer tạo review với issued voucher `used` | Trả `201` |
| Review voucher chưa dùng | Tạo review với voucher `active` | Trả `422` |
| Rating ngoài 1-5 | Gửi rating `0` hoặc `6` | Trả `400` |
| Review trùng issued voucher | Tạo review lần 2 | Trả `409` |
| Public xem review | `GET /voucher-products/{id}/reviews` | Chỉ trả review published |

## 9. Complaint APIs

### Complaints

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/complaints` | Owner, partner liên quan, admin | Danh sách khiếu nại theo quyền |
| `POST` | `/complaints` | `buyer` | Tạo khiếu nại |
| `GET` | `/complaints/{id}` | Owner, partner liên quan, admin | Chi tiết khiếu nại |
| `PATCH` | `/complaints/{id}` | Owner khi open hoặc admin | Cập nhật mô tả/bằng chứng/trạng thái xử lý |
| `DELETE` | `/complaints/{id}` | Owner khi open hoặc admin | Đóng/xóa mềm khiếu nại |
| `PATCH` | `/complaints/{id}/assign` | Admin | Gán người xử lý |
| `PATCH` | `/complaints/{id}/resolve` | Admin | Hoàn tất xử lý khiếu nại |

### Complaint responses

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/complaints/{id}/responses` | Người liên quan hoặc admin | Danh sách trao đổi |
| `POST` | `/complaints/{id}/responses` | Người liên quan hoặc admin | Thêm phản hồi |

### Nghiệp vụ chính

- Buyer chỉ khiếu nại đơn/voucher thuộc về mình.
- Complaint mới mặc định `status = open`.
- Chỉ admin được `assign` và `resolve`.
- Khi resolve phải có `resolution_note`, `resolution_type`, `resolved_at`.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Tạo complaint hợp lệ | Buyer tạo complaint cho order của mình | Trả `201`, status `open` |
| Khiếu nại order người khác | Buyer A tạo complaint order buyer B | Trả `403` |
| Admin assign | `PATCH /complaints/{id}/assign` | Có `assigned_to`, status có thể thành `under_review` |
| Resolve thiếu ghi chú | Gọi resolve không có `resolution_note` | Trả `400` |
| Thêm response | Người liên quan gọi `POST /responses` | Trả `201`, lưu đúng `responder_role` |

## 10. Log APIs

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/authentication-logs` | `admin_security` | Log đăng nhập, đăng xuất, đổi/reset mật khẩu, đăng nhập thất bại; lọc user/action/status/date |
| `GET` | `/authentication-logs/{id}` | `admin_security` | Chi tiết log xác thực |
| `GET` | `/admin-logs` | `admin_security` | Log thao tác quản trị; lọc admin/target_user/target_partner/target_voucher/action/date |
| `GET` | `/admin-logs/{id}` | `admin_security` | Chi tiết log quản trị |
| `GET` | `/order-logs` | `admin_security` | Log đặt đơn, hủy đơn, đổi trạng thái đơn; lọc order/user/action/date |
| `GET` | `/order-logs/{id}` | `admin_security` | Chi tiết log đơn hàng |
| `GET` | `/payment-logs` | `admin_security` | Log thanh toán thành công/thất bại, hoàn tiền; lọc payment/order/user/status/date |
| `GET` | `/payment-logs/{id}` | `admin_security` | Chi tiết log thanh toán |

### Nghiệp vụ chính

- Không cho client tạo/sửa/xóa log trực tiếp.
- Backend tự ghi `authentication_logs` cho đăng nhập, đăng xuất, đổi/reset mật khẩu và đăng nhập thất bại.
- Backend tự ghi `admin_logs` khi admin duyệt partner, duyệt voucher, quản lý tài khoản, xử lý complaint hoặc thực hiện thao tác quản trị khác.
- Backend tự ghi `order_logs` khi tạo đơn, hủy đơn hoặc thay đổi trạng thái đơn.
- Backend tự ghi `payment_logs` khi tạo thanh toán, thanh toán thành công/thất bại hoặc hoàn tiền.
- Lịch sử xác thực/redeem voucher lưu trong bảng nghiệp vụ `voucher_usages`, không dùng bảng log riêng.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Admin security xem log xác thực | `GET /authentication-logs` | Trả `200` |
| Role khác xem log | Buyer hoặc partner gọi API | Trả `403` |
| Redeem tạo lịch sử sử dụng | Redeem voucher thành công | Có bản ghi `voucher_usages` đúng `issued_voucher_id`, `branch_id`, `staff_id` |

## 11. Report APIs Cơ Bản

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/reports/revenue` | Partner owner hoặc admin | Báo cáo doanh thu theo thời gian |
| `GET` | `/reports/orders` | Partner owner hoặc admin | Thống kê đơn hàng |
| `GET` | `/reports/vouchers` | Partner owner hoặc admin | Thống kê voucher bán ra, còn lại, đã dùng |
| `GET` | `/reports/partners` | Admin | Thống kê đối tác |

### Nghiệp vụ chính

- Partner chỉ xem dữ liệu của đối tác mình.
- Admin xem toàn hệ thống.
- Báo cáo doanh thu chỉ tính đơn đã thanh toán thành công.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Partner xem doanh thu | Partner gọi `/reports/revenue` | Chỉ trả dữ liệu của partner đó |
| Admin xem tổng | Admin gọi `/reports/revenue` | Trả dữ liệu toàn hệ thống hoặc theo filter |
| Buyer xem report | Buyer gọi report | Trả `403` |
| Đơn chưa paid | Tạo order pending rồi xem doanh thu | Không cộng vào doanh thu |

## 12. Checklist Test Tích Hợp Theo Luồng Nghiệp Vụ

Thực hiện lần lượt các bước sau bằng Postman, Insomnia, REST Client hoặc test tự động.

| Bước | API cần test | Điều kiện đạt |
| --- | --- | --- |
| 1 | Đăng ký buyer và partner owner | Tạo được user đúng role |
| 2 | Partner tạo hồ sơ đối tác | Partner ở trạng thái `pending` |
| 3 | Admin duyệt đối tác | Partner thành `approved` và `active` |
| 4 | Partner tạo chi nhánh | Branch active, thuộc đúng partner |
| 5 | Admin tạo danh mục | Category có slug duy nhất |
| 6 | Partner tạo voucher | Voucher có quantity, giá, thời hạn, branch áp dụng |
| 7 | Partner submit voucher | Voucher chuyển `approval_status = pending` |
| 8 | Admin content duyệt voucher | Voucher `approved`, có `approved_by` |
| 9 | Partner publish voucher | Voucher `status = active` |
| 10 | Buyer thêm voucher vào giỏ hàng | `cart_items` tham chiếu đúng `carts.id` và `voucher_products.id` |
| 11 | Buyer checkout giỏ hàng | Order pending, order_items snapshot giá chính xác, item đã checkout được xóa khỏi giỏ |
| 12 | Buyer thanh toán mô phỏng thành công | Order paid, payment success, issued voucher được sinh |
| 13 | Staff validate voucher | Voucher active, đúng chi nhánh áp dụng |
| 14 | Staff redeem voucher | Voucher thành `used`, có `voucher_usages` |
| 15 | Buyer review | Review được tạo với rating 1-5 |
| 16 | Buyer tạo complaint | Complaint `open`, gắn đúng order/voucher |
| 17 | Admin resolve complaint | Complaint `resolved`, có ghi chú xử lý |
| 18 | Admin security xem log hệ thống | Có log cho các hành động quan trọng |
| 19 | Partner/Admin xem report | Báo cáo phản ánh đúng order đã paid |

## 13. Điều Kiện Đạt Chung

- API CRUD trả đúng HTTP status và response format.
- Validate đầy đủ field bắt buộc, enum, unique key, foreign key.
- Không trả dữ liệu nhạy cảm như `password_hash`.
- Phân quyền đúng theo role và quyền sở hữu dữ liệu.
- Không cho thao tác trái nghiệp vụ: mua voucher chưa duyệt, redeem voucher hết hạn, redeem voucher đã dùng, thanh toán lại sinh trùng voucher.
- Các trường suy diễn được tính ở backend: `discount_rate`, `remaining_quantity`, `subtotal`, `total_amount`, `expired_date`.
- Các hành động auth/admin/order/payment có log đúng bảng chuyên biệt; lịch sử redeem nằm trong `voucher_usages`.
- Dữ liệu sau mỗi luồng tích hợp nhất quán giữa cart, order, payment, issued voucher, usage, review, complaint và report.

## 14. Middleware Cần Viết

Mục này chỉ liệt kê middleware tối giản vừa đủ cho CRUD và các luồng nghiệp vụ chính. Các kiểm tra quá đặc thù nên đặt trong service/use case để tránh middleware phình to và khó tái sử dụng.

### Danh sách middleware tối thiểu

| Middleware | Trạng thái | Dùng cho | Mục đích |
| --- | --- | --- | --- |
| `requestLogger` | Đã có | Toàn bộ request | Ghi log request cơ bản; không log password, access token, refresh token |
| `errorHandler` | Đã có, cần chuẩn hóa response | Cuối pipeline Express | Trả error response chuẩn cho `HttpError`, `ZodError`, lỗi hệ thống |
| `validateBody(schema)` | Đã có | API tạo/sửa dữ liệu | Validate body bằng Zod |
| `validateParams(schema)` | Cần viết | API có path params | Validate `{id}`, `{partnerId}`, `{orderId}` |
| `validateQuery(schema)` | Cần viết | API danh sách/report | Validate pagination, filter, sort, search |
| `requireAuth` | Đã có stub, cần hoàn thiện | API private | Verify `access_token`, gắn `req.user`, chặn user không active |
| `requireRole(roles)` | Đã có, cần dùng `req.user.role` | API theo role | Chặn role không được phép; không tin `x-user-role` từ client |
| `requireOwnerOrRole(checkOwner, roles)` | Cần viết | API owner hoặc admin/partner | Gom kiểm tra owner và role cho user, partner, order, voucher, complaint |
| `notFoundHandler` | Cần viết | Sau tất cả routes | Trả `404` chuẩn cho route không tồn tại |
| `rateLimitAuth` | Nên viết | `/auth/login`, `/auth/refresh`, `/auth/forgot-password` | Giới hạn brute force và lạm dụng refresh token |

### Thứ tự gắn middleware khuyến nghị

```text
helmet/cors/bodyParser/requestLogger
-> route
-> validateParams/validateQuery/validateBody
-> requireAuth
-> requireRole
-> requireOwnerOrRole nếu endpoint cần kiểm tra sở hữu dữ liệu
-> controller
-> notFoundHandler
-> errorHandler
```

Các rule nghiệp vụ như voucher có bán được không, order có thanh toán được không, issued voucher có redeem được không nên đặt trong service/use case để dễ test và dễ dùng lại khi gọi từ nhiều endpoint.

### Điều kiện đạt cho middleware

| Test case | Điều kiện đạt |
| --- | --- |
| Request thiếu token vào API private | Trả `401` theo error response chuẩn |
| Token hợp lệ nhưng user bị khóa | Trả `403` hoặc `401`, không cho đi tiếp controller |
| Role không đủ quyền | Trả `403` |
| Owner truy cập dữ liệu của mình | Cho đi tiếp controller |
| Owner truy cập dữ liệu người khác | Trả `403` hoặc `404` theo chính sách che giấu dữ liệu |
| Query/body/params sai schema | Trả `400` với details validate |
| Login thành công | Response có `access_token`, cookie có `refresh_token` với `HttpOnly` |
| Refresh token hợp lệ | `/auth/refresh` trả `access_token` mới |
| Refresh token thiếu hoặc hết hạn | `/auth/refresh` trả `401` và không cấp access token |
| Logout | Thu hồi refresh token và clear cookie |
| Controller ném lỗi không xử lý | `errorHandler` trả `500` chuẩn, không lộ stack trace |
