# FC-PAV-CREATE – Tạo voucher

## Thông tin chức năng

| Thuộc tính | Nội dung |
|------------|----------|
| **Mã chức năng** | FC-PAV-CREATE |
| **Tên chức năng** | Tạo voucher |
| **Tác nhân** | Nhân viên tạo voucher |
| **Mức độ ưu tiên** | Cao |

## Mô tả

Cho phép Nhân viên tạo voucher tạo chương trình voucher với tên, mô tả, giá, thời gian bán/sử dụng, chi nhánh áp dụng, điều kiện sử dụng và số lượng phát hành. Voucher mới được lưu ở trạng thái **"Nháp"**.

## Sự kiện kích hoạt

Nhân viên chọn chức năng **"Tạo voucher"**.

## Tiền điều kiện

- Nhân viên đã đăng nhập, tài khoản đang hoạt động và có quyền tạo voucher.
- Nhân viên thuộc một đối tác đã được phê duyệt và đang hoạt động.

## Kết quả mong đợi

Voucher hợp lệ được lưu ở trạng thái **"Nháp"**, thuộc đúng đối tác và ghi nhận đúng người tạo; voucher chưa được bán trước khi được phê duyệt.

---

# Luồng sự kiện chính

1. Nhân viên chọn chức năng **"Tạo voucher"**.
2. Hệ thống kiểm tra phiên đăng nhập và quyền tạo voucher.
3. Hệ thống hiển thị biểu mẫu tạo voucher.
4. Nhân viên nhập tên, mô tả, giá gốc và giá bán.
5. Nhân viên nhập thời gian bán và thời gian sử dụng.
6. Nhân viên chọn chi nhánh áp dụng, nhập số lượng phát hành và điều kiện sử dụng.
7. Hệ thống kiểm tra trường bắt buộc, định dạng, giá bán, thời gian và số lượng.
8. Nhân viên chọn **"Lưu"** và xác nhận thao tác.
9. Hệ thống tạo voucher ở trạng thái **"Nháp"**.
10. Hệ thống ghi nhận người tạo, thời gian tạo, đối tác sở hữu và thông báo thành công.

---

# Luồng sự kiện thay thế

## A1 – Tại bước 7: Thiếu thông tin bắt buộc

- Hệ thống đánh dấu trường lỗi và chưa tạo voucher.

## A2 – Tại bước 7: Giá bán không hợp lệ

- Giá bán lớn hơn hoặc bằng giá gốc; hệ thống yêu cầu điều chỉnh.

## A3 – Tại bước 7: Thời gian không hợp lệ

- Hệ thống không cho lưu nếu thời gian bán hoặc sử dụng thiếu, đảo ngược hoặc không phù hợp.

## A4 – Tại bước 8: Nhân viên hủy xác nhận

- Hệ thống không tạo voucher mới.

## A5 – Tại bước 9: Lỗi lưu dữ liệu

- Hệ thống giữ dữ liệu đã nhập, không báo thành công và cho phép thử lại.

---

# Hậu điều kiện

- Voucher được lưu ở trạng thái **"Nháp"**, thuộc đúng đối tác, ghi nhận người tạo và chưa được phép công bố bán hoặc phát hành mã.

---

# Quy tắc nghiệp vụ

## BR-PAV-01 (tham chiếu BR-PAR-02)

Đối tác có thể tạo mới voucher với các thông tin giá, mô tả, thời gian bán, thời gian sử dụng, chi nhánh áp dụng và số lượng phát hành.

## RB-02

Giá bán của voucher phải nhỏ hơn giá gốc.

## RB-03

Voucher phải có thời gian bán và thời gian sử dụng rõ ràng.

## RB-04

Voucher không được bán khi hết số lượng phát hành hoặc hết thời gian bán.

## RB-11

Số lượng bán ra không được vượt quá số lượng phát hành.