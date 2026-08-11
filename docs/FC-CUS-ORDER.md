# FC-CUS-ORDER - Tao don hang

## Pham vi trien khai

Khach hang tao don tu cac item trong gio hang. `orders.user_id` la tai khoan tao don; `orders.recipient_id` la tai khoan se so huu voucher.

## Nguoi nhan

- Mua cho ban than: `recipient_id = user_id`, `is_gift = false`.
- Tang nguoi khac: frontend gui `recipient_identifier` la email hoac so dien thoai; backend tim trong `users`.
- Email/so dien thoai khong ton tai: khong tao don, tra `RECIPIENT_NOT_FOUND`.
- Frontend hien thi ten tai khoan sau khi lookup thanh cong.
- Khong yeu cau dia chi va khong luu ten, email, so dien thoai hoac dia chi snapshot vao `orders`.

## Kiem tra va trang thai

- Voucher phai duoc duyet, dang active, dang trong thoi gian ban va con du ton kho.
- Gia duoc snapshot vao `order_items` tai thoi diem tao don.
- Don moi tao co `status = pending_payment`.
- `payment_expires_at` duoc dat bang thoi diem tao don cong 15 phut.
- Backend ghi log `CREATE_ORDER`.

## Route frontend

- `/cart`
- `/checkout/create-order`
- `/checkout/payment/[orderId]`

Màn hình tặng người khác dùng một ô nhập email hoặc số điện thoại, gọi `/users/recipient-lookup` và hiển thị tên tài khoản tìm thấy. Không có trường địa chỉ.
