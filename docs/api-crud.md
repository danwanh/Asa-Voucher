# API CRUD Backend - Asa Voucher

Tài liệu này liệt kê các API CRUD cơ bản cần viết cho backend dựa trên `docs/schema.md` và nghiệp vụ trong `docs/brd.md`.

## 1. Quy ước chung

### Base URL

```text
/api/v1
```

### Xác thực

- Các API công khai: xem danh mục, xem voucher đang bán, đăng ký, đăng nhập.
- Các API còn lại yêu cầu `Authorization: Bearer <access_token>`.
- Token phải chứa `user_id`, `role` và nếu là partner/staff thì có thông tin liên kết đối tác hoặc chi nhánh.

### Vai trò

| Role | Mô tả |
| --- | --- |
| `buyer` | Khách hàng mua voucher |
| `partner_manager` | Quản lý đối tác, chi nhánh, voucher của đối tác |
| `store_staff` | Nhân viên chi nhánh, xác thực voucher |
| `admin_content` | Duyệt voucher, quản lý danh mục/nội dung |
| `admin_account` | Duyệt đối tác, quản lý tài khoản |
| `admin_security` | Xem audit log, log xác thực |

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
| `POST` | `/auth/login` | Public | Đăng nhập |
| `POST` | `/auth/logout` | Authenticated | Đăng xuất |
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
| `POST` | `/partners` | `partner_manager` hoặc `admin_account` | Đăng ký/tạo đối tác |
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
| `POST` | `/voucher-products` | `partner_manager` | Tạo voucher ở trạng thái nháp hoặc chờ duyệt |
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

## 6. Order và Payment APIs

### Orders

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/orders` | Buyer owner, partner liên quan, admin | Danh sách đơn hàng theo quyền |
| `POST` | `/orders` | `buyer` | Tạo đơn hàng từ danh sách voucher |
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

- Khi tạo đơn phải snapshot giá vào `order_items`.
- Tổng tiền đơn hàng tính từ `order_items`, không tin dữ liệu giá từ client.
- Chỉ cho mua voucher đang bán hợp lệ.
- Số lượng mua không vượt `remaining_quantity`.
- Khi thanh toán thành công: cập nhật `payment_status = paid`, `status = confirmed/completed`, giảm tồn kho và phát hành voucher điện tử.
- Thanh toán thật nằm ngoài phạm vi, chỉ cần mô phỏng.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
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
| `POST` | `/issued-vouchers/validate` | `store_staff`, partner manager, admin | Kiểm tra voucher code hoặc QR payload |
| `POST` | `/issued-vouchers/{id}/redeem` | `store_staff`, partner manager | Xác nhận sử dụng voucher |
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

## 10. Audit Log APIs

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/audit-logs` | `admin_security` | Danh sách audit log, lọc user/action/entity/date |
| `GET` | `/audit-logs/{id}` | `admin_security` | Chi tiết audit log |

### Nghiệp vụ chính

- Không cho client tạo/sửa/xóa audit log trực tiếp.
- Backend tự ghi audit log cho các hành động quan trọng: login, tạo đơn, thanh toán, phát hành voucher, redeem, duyệt partner, duyệt voucher, xử lý complaint.

### Test và điều kiện đạt

| Test case | Cách test | Điều kiện đạt |
| --- | --- | --- |
| Admin security xem log | `GET /audit-logs` | Trả `200` |
| Role khác xem log | Buyer hoặc partner gọi API | Trả `403` |
| Redeem tạo log | Redeem voucher thành công | Có audit log action `redeem` |

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
| 1 | Đăng ký buyer và partner manager | Tạo được user đúng role |
| 2 | Partner tạo hồ sơ đối tác | Partner ở trạng thái `pending` |
| 3 | Admin duyệt đối tác | Partner thành `approved` và `active` |
| 4 | Partner tạo chi nhánh | Branch active, thuộc đúng partner |
| 5 | Admin tạo danh mục | Category có slug duy nhất |
| 6 | Partner tạo voucher | Voucher có quantity, giá, thời hạn, branch áp dụng |
| 7 | Partner submit voucher | Voucher chuyển `approval_status = pending` |
| 8 | Admin content duyệt voucher | Voucher `approved`, có `approved_by` |
| 9 | Partner publish voucher | Voucher `status = active` |
| 10 | Buyer tạo đơn hàng | Order pending, item snapshot giá chính xác |
| 11 | Buyer thanh toán mô phỏng thành công | Order paid, payment success, issued voucher được sinh |
| 12 | Staff validate voucher | Voucher active, đúng chi nhánh áp dụng |
| 13 | Staff redeem voucher | Voucher thành `used`, có `voucher_usages` |
| 14 | Buyer review | Review được tạo với rating 1-5 |
| 15 | Buyer tạo complaint | Complaint `open`, gắn đúng order/voucher |
| 16 | Admin resolve complaint | Complaint `resolved`, có ghi chú xử lý |
| 17 | Admin security xem audit log | Có log cho các hành động quan trọng |
| 18 | Partner/Admin xem report | Báo cáo phản ánh đúng order đã paid |

## 13. Điều Kiện Đạt Chung

- API CRUD trả đúng HTTP status và response format.
- Validate đầy đủ field bắt buộc, enum, unique key, foreign key.
- Không trả dữ liệu nhạy cảm như `password_hash`.
- Phân quyền đúng theo role và quyền sở hữu dữ liệu.
- Không cho thao tác trái nghiệp vụ: mua voucher chưa duyệt, redeem voucher hết hạn, redeem voucher đã dùng, thanh toán lại sinh trùng voucher.
- Các trường suy diễn được tính ở backend: `discount_rate`, `remaining_quantity`, `subtotal`, `total_amount`, `expired_date`.
- Tất cả hành động quan trọng có audit log.
- Dữ liệu sau mỗi luồng tích hợp nhất quán giữa order, payment, issued voucher, usage, review, complaint và report.
