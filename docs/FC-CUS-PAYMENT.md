# FC-CUS-PAYMENT - Thanh toan

## Provider

Phien ban hien tai dung adapter thanh toan mo phong cho:

- VNPay (`vnpay`)
- PayPal (`paypal`)

Khong goi cong thanh toan that khi cac bien moi truong provider de trong.

## Luong thanh cong

1. Tao payment pending cho order.
2. Kiem tra order chua het han thanh toan.
3. Kiem tra ton kho trong transaction bang cap nhat co dieu kien.
4. Tru `remaining_quantity`.
5. Sinh mot voucher code va QR payload duy nhat cho moi quantity.
6. Gan `issued_vouchers.owner_id = orders.recipient_id`.
7. Cap nhat payment `success`, order `payment_status = paid`, status `confirmed`.

Frontend tao QR image that tu URL `FRONTEND_URL/voucher/verify?code={voucher_code}` bang thu vien QR. Moi quantity co mot code va QR rieng. QR duoc quet boi `partner_store_staff`.

Chi `partner_store_staff` duoc redeem. He thong bat buoc voucher thuoc doi tac va chi nhanh ma nhan vien dang phu trach.

## Luong loi

- Payment fail: payment thanh `failed`, order van `pending`.
- Het ton kho do xu ly dong thoi: order thanh `cancelled`, khong phat hanh voucher.
- Qua 15 phut: order thanh `cancelled`, tra `ORDER_PAYMENT_EXPIRED`.
- Retry payment da thanh cong: tra loi `PAYMENT_ALREADY_COMPLETED`, khong tru kho/phat hanh lai.

## Route frontend

- `/checkout/payment/[orderId]`
- `/orders`
- `/orders/[orderId]`
- `/my-vouchers`
