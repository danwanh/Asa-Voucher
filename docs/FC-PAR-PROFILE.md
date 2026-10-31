# FC-PAO-PROFILE – Đăng ký và quản lý hồ sơ đối tác

## Thông tin chức năng

| Thuộc tính | Nội dung |
|------------|----------|
| **Mã chức năng** | FC-PAO-PROFILE |
| **Tên chức năng** | Đăng ký và quản lý hồ sơ đối tác |
| **Tác nhân** | Đối tác (Chủ tài khoản) |
| **Độ ưu tiên** | Cao |

---

## Mô tả

Cho phép chủ tài khoản đối tác:

- Đăng ký hồ sơ doanh nghiệp.
- Cập nhật thông tin pháp lý.
- Cập nhật thông tin người đại diện.
- Quản lý danh sách chi nhánh.

Nếu là hồ sơ đăng ký mới:

- Hồ sơ được lưu với trạng thái **"Chờ duyệt"**.
- Quản trị viên phải duyệt trước khi đối tác được phép hoạt động đầy đủ.

---

## Điều kiện tiên quyết

- Đối tác đã đăng nhập.
- Phiên đăng nhập còn hiệu lực.
- Hệ thống có quyền truy cập dữ liệu hồ sơ đối tác và danh sách chi nhánh.
- Đối tác có thể:
  - Chưa có hồ sơ (đăng ký mới).
  - Đã có hồ sơ (cập nhật thông tin).

---

## Kết quả mong đợi

- Hồ sơ được lưu đầy đủ và hợp lệ.
- Hồ sơ đăng ký mới chuyển sang trạng thái **Chờ duyệt**.
- Nếu cập nhật hồ sơ hiện có thì dữ liệu được cập nhật thành công mà không làm sai trạng thái phê duyệt.
- Hệ thống ghi nhận người thực hiện và thời gian cập nhật.

---

# Luồng chính

### Bước 1

Đối tác chọn menu **Hồ sơ đối tác**.

---

### Bước 2

Hệ thống kiểm tra:

- phiên đăng nhập
- quyền truy cập
- hồ sơ hiện tại

---

### Bước 3

Nếu **chưa có hồ sơ**

→ Hiển thị biểu mẫu đăng ký.

Nếu **đã có hồ sơ**

→ Hiển thị dữ liệu hiện tại bao gồm:

- Thông tin doanh nghiệp
- Thông tin pháp lý
- Người đại diện
- Danh sách chi nhánh

---

### Bước 4

Đối tác nhập mới hoặc cập nhật các thông tin cần thiết.

---

### Bước 5

Đối tác có thể:

- Thêm chi nhánh
- Cập nhật chi nhánh
- Xóa chi nhánh

trong phạm vi được phép.

---

### Bước 6

Hệ thống kiểm tra:

- Trường bắt buộc
- Định dạng dữ liệu
- Tính hợp lệ

---

### Bước 7

Hệ thống kiểm tra:

- Mã số thuế không được trùng với doanh nghiệp khác.

---

### Bước 8

Đối tác chọn:

- **Lưu**

hoặc

- **Gửi đăng ký**

và xác nhận thao tác.

---

### Bước 9

Hệ thống lưu:

- Hồ sơ doanh nghiệp
- Danh sách chi nhánh

---

### Bước 10

Nếu là hồ sơ đăng ký mới

→ chuyển trạng thái hồ sơ thành:

**Chờ duyệt**

---

### Bước 11

Hệ thống:

- ghi nhận tài khoản thực hiện
- ghi nhận thời gian cập nhật
- hiển thị thông báo

> Lưu hồ sơ thành công.

---

# Luồng thay thế

## A1. Chưa có hồ sơ doanh nghiệp

Điểm phát sinh:

Bước 3.

Hệ thống:

- Hiển thị biểu mẫu đăng ký mới.
- Đối tác tiếp tục nhập thông tin.

---

## A2. Thông tin hồ sơ không hợp lệ

Điểm phát sinh:

Bước 6.

Hệ thống:

- Đánh dấu các trường sai.
- Hiển thị lỗi tương ứng.
- Không lưu dữ liệu.
- Yêu cầu người dùng chỉnh sửa.

---

## A3. Mã số thuế đã tồn tại

Điểm phát sinh:

Bước 7.

Hệ thống:

- Không lưu hồ sơ.
- Hiển thị thông báo:

> Mã số thuế đã tồn tại.

- Yêu cầu đối tác kiểm tra lại.

---

## A4. Đối tác hủy xác nhận

Điểm phát sinh:

Bước 8.

Hệ thống:

- Không lưu thay đổi.
- Giữ nguyên dữ liệu trước đó.

---

## A5. Hồ sơ đang chờ duyệt

Điểm phát sinh:

Bước 3.

Nếu hồ sơ có trạng thái:

**Chờ duyệt**

thì:

- Chỉ cho phép chỉnh sửa các trường được quy định.
- Các trường bị khóa phải ở trạng thái **Disabled** hoặc **Read Only**.
- Hiển thị thông báo giải thích rõ lý do.

---

# Hậu điều kiện

- Hồ sơ doanh nghiệp được lưu đúng dữ liệu đã xác nhận.
- Danh sách chi nhánh được lưu đúng.
- Hồ sơ đăng ký mới có trạng thái **Chờ duyệt**.
- Hệ thống ghi nhận:
  - người thực hiện
  - thời gian cập nhật

---

# Quy tắc nghiệp vụ

## BR-PAO-01

Hồ sơ đối tác phải được **Quản trị viên phê duyệt** trước khi đối tác được sử dụng đầy đủ các chức năng của hệ thống.
