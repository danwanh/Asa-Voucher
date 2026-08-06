# FC-PAO-STAFF – Quản lý tài khoản nhân viên

## Thông tin chức năng

| Thuộc tính | Nội dung |
|------------|----------|
| **Mã chức năng** | FC-PAO-STAFF |
| **Tên chức năng** | Quản lý tài khoản nhân viên |
| **Tác nhân** | Đối tác (chủ tài khoản) |
| **Mức độ ưu tiên** | Cao |

---

## Mô tả

Cho phép chủ tài khoản đối tác tạo, cập nhật, phân quyền, gán chi nhánh và khóa/mở khóa tài khoản nhân viên thuộc doanh nghiệp.

---

## Sự kiện kích hoạt

Đối tác chọn chức năng **"Quản lý nhân viên"**.

---

## Tiền điều kiện

- Đối tác đã đăng nhập bằng tài khoản chủ sở hữu.
- Hồ sơ đối tác đã được phê duyệt và đang hoạt động.

---

## Kết quả mong đợi

Tài khoản nhân viên được tạo hoặc cập nhật đúng vai trò, trạng thái và phạm vi chi nhánh; các thay đổi quan trọng được ghi nhận.

---

# Luồng sự kiện chính

### Bước 1

Đối tác mở chức năng **"Quản lý nhân viên"**.

### Bước 2

Hệ thống kiểm tra phiên đăng nhập và quyền chủ tài khoản.

### Bước 3

Hệ thống hiển thị danh sách nhân viên gồm thông tin liên hệ, vai trò, chi nhánh và trạng thái.

### Bước 4

Đối tác chọn **"Thêm nhân viên"** hoặc chọn một nhân viên hiện có.

### Bước 5

Hệ thống hiển thị biểu mẫu tạo mới hoặc thông tin hiện tại để cập nhật.

### Bước 6

Đối tác nhập thông tin, chọn vai trò nhân viên và chi nhánh phụ trách.

### Bước 7

Hệ thống kiểm tra email, số điện thoại, vai trò và phạm vi chi nhánh.

### Bước 8

Đối tác chọn **"Lưu"** và xác nhận thao tác.

### Bước 9

Hệ thống tạo mới hoặc cập nhật tài khoản nhân viên.

### Bước 10

Hệ thống ghi nhận người thực hiện, thời gian và nội dung thay đổi.

### Bước 11

Nếu là tài khoản mới, hệ thống tạo thông tin đăng nhập theo cơ chế được cấu hình.

### Bước 12

Hệ thống thông báo thành công và tải lại danh sách nhân viên.

---

# Luồng sự kiện thay thế

## A1 – Tại bước 7: Email hoặc số điện thoại đã tồn tại

- Hệ thống không tạo tài khoản và yêu cầu nhập thông tin khác.

---

## A2 – Tại bước 7: Vai trò không hợp lệ

- Hệ thống từ chối vai trò ngoài phạm vi **Nhân viên tạo voucher** hoặc **Nhân viên cửa hàng**.

---

## A3 – Tại bước 7: Chi nhánh không hợp lệ

- Hệ thống không cho gán chi nhánh không thuộc doanh nghiệp.

---

## A4 – Tại bước 8: Đối tác hủy xác nhận

- Hệ thống không thay đổi dữ liệu và đóng hộp thoại xác nhận.

---

## A5 – Tại bước 4: Khóa hoặc mở khóa tài khoản

- Đối tác chọn trạng thái mới, xác nhận thao tác; hệ thống cập nhật trạng thái và ghi nhận lý do, người thực hiện, thời gian.

---

## Hậu điều kiện

- Tài khoản nhân viên có thông tin, vai trò, trạng thái và phạm vi chi nhánh chính xác.
- Thay đổi được lưu để kiểm tra và truy vết.

---

## Mức độ ưu tiên

**Cao**

---

## Quy tắc nghiệp vụ

### BR-PAO-02

Phân quyền nhân viên phải giới hạn trong phạm vi doanh nghiệp và chi nhánh được gán.