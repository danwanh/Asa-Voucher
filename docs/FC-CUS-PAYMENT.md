# FC-CUS-PAYMENT - Thanh toan

## Provider

Phien ban hien tai dung sandbox that cua:

- VNPay (`vnpay`)
- PayPal (`paypal`)

- VNPay tao URL ky HMAC-SHA512 va xac thuc `vnp_SecureHash` tai return URL.
- PayPal dung REST API sandbox de tao order va capture tai return URL.
- Khong dung IPN/webhook trong moi truong localhost.

## Luong thanh cong

1. Tao payment pending cho order.
2. Tao URL sandbox PayPal/VNPay va redirect nguoi dung.
3. Xac thuc return URL tai backend, khong tin ket qua tu frontend.
4. Kiem tra order chua het han thanh toan.
5. Kiem tra ton kho trong transaction bang cap nhat co dieu kien.
6. Tru `remaining_quantity`.
7. Sinh mot voucher code va QR payload duy nhat cho moi quantity.
8. Gan `issued_vouchers.owner_id = orders.recipient_id`.
9. Cap nhat payment `success`, order `payment_status = paid`, status `confirmed`.

Frontend tao QR image that tu URL `FRONTEND_URL/voucher/verify?code={voucher_code}` bang thu vien QR. Moi quantity co mot code va QR rieng. QR duoc quet boi `partner_store_staff`.

Chi `partner_store_staff` duoc redeem. He thong bat buoc voucher thuoc doi tac va chi nhanh ma nhan vien dang phu trach.

## Luong loi

- Payment fail: payment thanh `failed`, order van `pending` va `payment_status = pending` de retry.
- Het ton kho do xu ly dong thoi: order thanh `cancelled`, khong phat hanh voucher.
- Qua 15 phut: order thanh `cancelled`, tra `ORDER_PAYMENT_EXPIRED`.
- Retry payment da thanh cong: tra loi `PAYMENT_ALREADY_COMPLETED`, khong tru kho/phat hanh lai.
- Don pending con han hien thi nut thanh toan lai trong Lich su don hang.

## Route frontend

- `/checkout/payment/[orderId]`
- `/orders`
- `/orders/[orderId]`
- `/my-vouchers`
