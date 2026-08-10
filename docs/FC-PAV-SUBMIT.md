# FC-PAV-SUBMIT – Gửi duyệt voucher

## Thông tin chức năng

| Thuộc tính | Nội dung |
|------------|----------|
| **Mã chức năng** | FC-PAV-SUBMIT |
| **Tên chức năng** | Gửi duyệt voucher |
| **Tác nhân** | Nhân viên tạo voucher |
| **Mức độ ưu tiên** | Cao |

## Mô tả

Cho phép Nhân viên tạo voucher chuyển voucher hoàn thiện từ trạng thái **"Nháp"** sang **"Chờ duyệt"** để Quản trị viên kiểm tra trước khi voucher được công bố bán.

## Sự kiện kích hoạt

Nhân viên chọn một voucher ở trạng thái **"Nháp"** và chọn **"Gửi duyệt"**.

## Tiền điều kiện

- Nhân viên đã đăng nhập và có quyền quản lý voucher.
- Voucher tồn tại, thuộc phạm vi đối tác, đang ở trạng thái **"Nháp"** và có đầy đủ thông tin bắt buộc.

## Kết quả mong đợi

Voucher chuyển sang trạng thái **"Chờ duyệt"** và xuất hiện trong danh sách xử lý của Quản trị viên; voucher chưa được công bố bán.

---

# Luồng sự kiện chính

1. Nhân viên mở danh sách voucher và chọn voucher **"Nháp"**.
2. Hệ thống hiển thị chi tiết để nhân viên kiểm tra lại.
3. Nhân viên chọn **"Gửi duyệt"**.
4. Hệ thống kiểm tra trạng thái, các trường bắt buộc và quy tắc nghiệp vụ.
5. Hệ thống hiển thị hộp thoại xác nhận.
6. Nhân viên xác nhận **"Đồng ý"**.
7. Hệ thống chuyển voucher sang **"Chờ duyệt"**.
8. Hệ thống ghi nhận người gửi, thời gian gửi và đưa voucher vào danh sách chờ xử lý.
9. Hệ thống thông báo **"Gửi duyệt voucher thành công"**.

---

# Luồng sự kiện thay thế

## A1 – Tại bước 4: Voucher thiếu thông tin

- Hệ thống liệt kê trường cần bổ sung, giữ nguyên trạng thái và yêu cầu chỉnh sửa.

## A2 – Tại bước 4: Voucher không còn ở trạng thái "Nháp"

- Hệ thống từ chối gửi duyệt và hiển thị trạng thái hiện tại.

## A3 – Tại bước 6: Nhân viên hủy xác nhận

- Voucher giữ trạng thái **"Nháp"** và không tạo bản ghi gửi duyệt.

## A4 – Tại bước 4: Voucher vi phạm quy tắc nghiệp vụ

- Hệ thống nêu rõ lỗi giá, thời gian hoặc số lượng và yêu cầu chỉnh sửa.

## A5 – Tại bước 7: Lỗi chuyển trạng thái

- Hệ thống giữ nguyên trạng thái **"Nháp"** và yêu cầu thử lại.

---

# Hậu điều kiện

- Voucher hợp lệ ở trạng thái **"Chờ duyệt"**, được ghi nhận người và thời gian gửi, xuất hiện trong danh sách xử lý của Quản trị viên và chưa được công bố bán.

---

# Quy tắc nghiệp vụ

## BR-PAR-03

Đối tác có thể gửi voucher ở trạng thái chờ duyệt và theo dõi kết quả phê duyệt từ Quản trị viên.

## RB-01

Voucher chỉ được bán khi đã được Quản trị viên duyệt.

## RB-02

Giá bán của voucher phải nhỏ hơn giá gốc.

## RB-03

Voucher phải có thời gian bán và thời gian sử dụng rõ ràng.

## RB-04

Voucher không được bán khi hết số lượng phát hành hoặc hết thời gian bán.