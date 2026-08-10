# FC-PAO-STAFF – Xem và cập nhật tài khoản nhân viên

## Thông tin chức năng

| Thuộc tính | Nội dung |
|---|---|
| **Mã chức năng** | FC-PAO-STAFF |
| **Tên chức năng** | Xem và cập nhật tài khoản nhân viên |
| **Tác nhân** | Đối tác (chủ tài khoản) |
| **Mức độ ưu tiên** | Cao |

## Mô tả

Cho phép chủ tài khoản đối tác xem danh sách nhân viên thuộc doanh nghiệp và cập nhật các thông tin được phép, bao gồm thông tin liên hệ, vai trò nghiệp vụ và chi nhánh phụ trách.

Chủ tài khoản đối tác không được tạo mới, xóa, khóa hoặc mở khóa tài khoản nhân viên. Các thao tác quản trị vòng đời tài khoản này thuộc phạm vi của Quản trị viên vận hành.

## Sự kiện kích hoạt

Đối tác chọn chức năng **“Quản lý nhân viên”**.

## Tiền điều kiện

- Đối tác đã đăng nhập bằng tài khoản chủ sở hữu.
- Phiên đăng nhập còn hiệu lực.
- Hồ sơ đối tác đã được phê duyệt và đang hoạt động.
- Hệ thống xác định được doanh nghiệp thuộc tài khoản đối tác hiện tại.

## Kết quả mong đợi

- Danh sách nhân viên thuộc đúng doanh nghiệp được hiển thị.
- Thông tin nhân viên được cập nhật đúng vai trò và phạm vi chi nhánh.
- Đối tác không thể truy cập hoặc cập nhật nhân viên thuộc doanh nghiệp khác.
- Các thay đổi được ghi nhận để kiểm tra và truy vết.

# Luồng sự kiện chính

1. Đối tác mở chức năng **“Quản lý nhân viên”**.
2. Hệ thống kiểm tra phiên đăng nhập, quyền chủ tài khoản và phạm vi doanh nghiệp.
3. Hệ thống hiển thị danh sách nhân viên thuộc doanh nghiệp, bao gồm:
   - Họ tên;
   - Email;
   - Số điện thoại;
   - Vai trò;
   - Chi nhánh phụ trách;
   - Trạng thái tài khoản.
4. Đối tác chọn một nhân viên hiện có để xem chi tiết hoặc cập nhật.
5. Hệ thống hiển thị thông tin hiện tại của nhân viên.
6. Đối tác cập nhật các trường được phép:
   - Họ tên;
   - Số điện thoại;
   - Vai trò nghiệp vụ;
   - Chi nhánh phụ trách.
7. Hệ thống kiểm tra định dạng dữ liệu, vai trò và phạm vi chi nhánh.
8. Đối tác chọn **“Lưu”** và xác nhận thao tác.
9. Hệ thống cập nhật thông tin nhân viên.
10. Hệ thống ghi nhận người thực hiện, thời gian và nội dung thay đổi.
11. Hệ thống thông báo cập nhật thành công và tải lại danh sách nhân viên.

# Luồng sự kiện thay thế

## A1 – Tại bước 3: Không có nhân viên thuộc doanh nghiệp

- Hệ thống hiển thị trạng thái trống.
- Hệ thống không tạo dữ liệu giả.
- Hệ thống không hiển thị chức năng tạo tài khoản nhân viên cho Partner Owner.

## A2 – Tại bước 4: Nhân viên không thuộc doanh nghiệp

- Hệ thống từ chối truy cập.
- Hệ thống thông báo người dùng không có quyền xem hoặc cập nhật nhân viên này.

## A3 – Tại bước 7: Thông tin không hợp lệ

- Hệ thống đánh dấu trường thiếu hoặc sai định dạng.
- Hệ thống không lưu thay đổi và yêu cầu đối tác chỉnh sửa.

## A4 – Tại bước 7: Vai trò không hợp lệ

- Hệ thống chỉ chấp nhận các vai trò nhân viên đối tác được quy định, gồm:
  - Nhân viên tạo voucher;
  - Nhân viên cửa hàng.
- Hệ thống từ chối các vai trò nằm ngoài phạm vi doanh nghiệp.

## A5 – Tại bước 7: Chi nhánh không hợp lệ

- Hệ thống không cho phép gán chi nhánh không thuộc doanh nghiệp hiện tại.

## A6 – Tại bước 8: Đối tác hủy xác nhận

- Hệ thống không lưu thay đổi.
- Dữ liệu trước đó được giữ nguyên.

## A7 – Đối tác yêu cầu tạo, xóa, khóa hoặc mở khóa tài khoản

- Hệ thống không cung cấp các thao tác này trong giao diện Partner Owner.
- Việc tạo, xóa, khóa hoặc mở khóa tài khoản nhân viên do Quản trị viên vận hành thực hiện.

# Hậu điều kiện

- Thông tin, vai trò và phạm vi chi nhánh của nhân viên được cập nhật đúng dữ liệu đã xác nhận.
- Không có tài khoản nhân viên nào được tạo hoặc xóa bởi Partner Owner.
- Trạng thái hoạt động của tài khoản không bị thay đổi bởi Partner Owner.
- Hệ thống ghi nhận tài khoản thực hiện, thời gian và nội dung cập nhật.

# Quy tắc nghiệp vụ

## BR-PAO-02

Partner Owner chỉ được xem và cập nhật nhân viên thuộc phạm vi doanh nghiệp của mình.

Vai trò và chi nhánh được gán phải thuộc phạm vi được phép của doanh nghiệp.

## BR-PAO-STAFF-01

Partner Owner không được tạo mới, xóa, khóa hoặc mở khóa tài khoản nhân viên. Các thao tác này thuộc trách nhiệm của Quản trị viên vận hành.