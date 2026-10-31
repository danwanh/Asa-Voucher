# FC-CUS-HISTORY – Xem lịch sử đơn hàng

| Thuộc tính | Nội dung |
|---|---|
| **Mã chức năng** | FC-CUS-HISTORY |
| **Tên chức năng** | Xem lịch sử đơn hàng |
| **Mô tả** | Cho phép khách hàng xem lại danh sách các đơn hàng đã tạo, trạng thái thanh toán và xem mã voucher code (đối với các đơn thành công). |
| **Tác nhân** | Khách hàng |
| **Sự kiện kích hoạt** | Khách hàng bấm vào mục **“Lịch sử đơn hàng”** trên thanh điều hướng. |
| **Tiền điều kiện** | Người dùng đã đăng nhập vào hệ thống với vai trò Khách hàng. |
| **Kết quả mong đợi (Expected result)** | Danh sách đơn hàng được hiển thị chính xác theo thứ tự thời gian từ mới nhất đến cũ nhất. |

## Luồng sự kiện chính

1. Khách hàng chọn chức năng **“Lịch sử đơn hàng”**.
2. Hệ thống truy xuất dữ liệu các đơn hàng của khách hàng này trong cơ sở dữ liệu.
3. Hệ thống hiển thị danh sách đơn hàng gồm: Mã đơn, Ngày tạo, Tổng tiền, Trạng thái đơn hàng (Đã thanh toán, Chờ thanh toán, Đã sử dụng, Đã hủy).
4. Khách hàng bấm vào một đơn hàng cụ thể để xem chi tiết.
5. Hệ thống hiển thị chi tiết đơn: Thông tin voucher, số lượng và Voucher Code/mã QR nếu đơn đã thanh toán thành công.

## Luồng sự kiện thay thế

### A3: Lọc đơn hàng theo trạng thái

1. Khách hàng chọn bộ lọc trạng thái sau khi hệ thống hiển thị danh sách đơn hàng.
2. Hệ thống tái truy vấn cơ sở dữ liệu và chỉ hiển thị các đơn hàng thỏa mãn điều kiện lọc.

### A4: Xem chi tiết đơn hàng đã hủy

1. Khách hàng chọn xem chi tiết một đơn hàng có trạng thái **“Đã hủy”**.
2. Hệ thống hiển thị lý do hủy hoặc thời gian hủy, đồng thời không hiển thị Voucher Code/mã QR vì đơn hàng đã hủy và không còn giá trị sử dụng.

## Luồng ngoại lệ

### E0: Phiên đăng nhập hết hạn

Nếu trong quá trình xem lịch sử đơn hàng token đăng nhập hết hạn, hệ thống tự động chuyển hướng khách hàng về trang đăng nhập và hiển thị thông báo: **“Phiên làm việc đã hết hạn, vui lòng đăng nhập lại”**.

### E1: Không tìm thấy dữ liệu

Nếu khách hàng chưa từng phát sinh đơn hàng, hệ thống không hiển thị bảng trống mà hiển thị thông báo **“Bạn chưa có lịch sử đơn hàng nào”** kèm nút **“Tiếp tục mua sắm”** dẫn về trang chủ.

## Hậu điều kiện

Không làm thay đổi trạng thái dữ liệu hệ thống.

## Mức độ ưu tiên (Priority)

Cao.

## Yêu cầu/Quy tắc nghiệp vụ liên quan

**BR-CUS-07:** Sau thanh toán thành công, khách hàng xem được voucher code, QR mô phỏng, trạng thái sử dụng và lịch sử đơn hàng.
