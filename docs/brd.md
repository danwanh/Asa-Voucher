# Business Requirements Document (BRD)

> Dự án: Asa Voucher - Hệ thống thương mại điện tử bán voucher giảm giá trực tuyến

> Nguồn: Chuẩn hóa từ đề bài đồ án môn Thương mại điện tử. 

---

# 1. Tổng quan

## 1.1 Mục tiêu

Xây dựng hệ thống thương mại điện tử bán voucher điện tử hỗ trợ toàn bộ quy trình:

- Quản lý người dùng
- Quản lý đối tác
- Quản lý voucher
- Bán voucher trực tuyến
- Thanh toán mô phỏng
- Phát hành voucher điện tử
- Xác thực voucher
- Đánh giá
- Khiếu nại
- Báo cáo thống kê

Hệ thống đóng vai trò là nền tảng trung gian giữa khách hàng và doanh nghiệp cung cấp dịch vụ. :contentReference[oaicite:1]{index=1}

---

# 2. Phạm vi

## Trong phạm vi

- Quản lý tài khoản
- Quản lý đối tác
- Quản lý voucher
- Quản lý danh mục
- Giỏ hàng
- Đơn hàng
- Thanh toán mô phỏng
- Phát hành voucher
- Xác thực voucher
- Đánh giá
- Khiếu nại
- Báo cáo

## Ngoài phạm vi

- Thanh toán thật
- SMS thật
- Email thật
- Mobile App
- AI/Machine Learning
- ERP/CRM Integration

:contentReference[oaicite:2]{index=2}

---

# 3. Vai trò

## Customer

Khách hàng sử dụng hệ thống để:

- Đăng ký
- Đăng nhập
- Mua voucher
- Thanh toán
- Quản lý voucher
- Đánh giá
- Khiếu nại

## Partner

Doanh nghiệp cung cấp voucher.

Bao gồm:

- Partner Manager
- Store Staff

### Partner Manager

- Quản lý doanh nghiệp
- Quản lý chi nhánh
- Tạo voucher
- Gửi voucher chờ duyệt
- Xem báo cáo

### Store Staff

- Xác thực voucher
- Xem lịch sử xác thực

## Administrator

Bao gồm:

- Admin Content
- Admin Account
- Admin Security

### Admin Content

- Duyệt voucher
- Quản lý danh mục
- Quản lý nội dung

### Admin Account

- Duyệt đối tác
- Quản lý người dùng
- Quản lý tài khoản đối tác
- Quản lý chi nhánh

### Admin Security

- Xem audit log
- Theo dõi đăng nhập
- Theo dõi sự kiện bảo mật
- Theo dõi log xác thực voucher

---

# 4. Quy trình nghiệp vụ

## Business Flow

```text
Đăng ký đối tác
        ↓
Duyệt đối tác
        ↓
Tạo voucher
        ↓
Duyệt voucher
        ↓
Công bố bán
        ↓
Khách hàng mua
        ↓
Thanh toán
        ↓
Phát hành voucher điện tử
        ↓
Xác thực voucher tại chi nhánh
        ↓
Đánh giá / Khiếu nại
        ↓
Báo cáo
```

:contentReference[oaicite:3]{index=3}

---

# 5. Business Requirements

## BR-01 Quản lý tài khoản

- Đăng ký
- Đăng nhập
- Quên mật khẩu
- Đổi mật khẩu
- Hồ sơ cá nhân

## BR-02 Quản lý voucher

- Tạo
- Chỉnh sửa
- Duyệt
- Công bố
- Tạm ngưng
- Ngừng bán

## BR-03 Mua hàng

- Giỏ hàng
- Đặt hàng
- Thanh toán

## BR-04 Phát hành voucher

- Sinh voucher code
- Quản lý trạng thái
- Quản lý thời hạn

## BR-05 Xác thực voucher

- Kiểm tra
- Xác nhận sử dụng
- Ghi nhận lịch sử

## BR-06 Đánh giá

- Chấm điểm
- Bình luận

## BR-07 Khiếu nại

- Tạo khiếu nại
- Theo dõi xử lý

## BR-08 Báo cáo

- Doanh thu
- Voucher
- Đơn hàng
- Đối tác

(Các yêu cầu này được tổng hợp từ danh mục yêu cầu nghiệp vụ của đề bài.) 

---

# 6. Business Rules

- Voucher chỉ được bán sau khi được duyệt.
- Voucher code chỉ được phát hành sau khi thanh toán thành công.
- Mỗi voucher code thuộc duy nhất một khách hàng.
- Voucher hết hạn không được sử dụng.
- Voucher đã sử dụng không được sử dụng lại.
- Đối tác chỉ quản lý voucher của mình.
- Nhân viên cửa hàng chỉ xác thực voucher tại chi nhánh được phân công.
- Quản trị viên chịu trách nhiệm phê duyệt đối tác và voucher.

---

# 7. Business Data

## DR-01 Người dùng

Thông tin đăng nhập, hồ sơ cá nhân, vai trò, lịch sử giao dịch và lịch sử hoạt động.

## DR-02 Đối tác

Thông tin doanh nghiệp, người đại diện, chi nhánh, trạng thái phê duyệt và trạng thái hoạt động.

## DR-03 Voucher sản phẩm

Tên voucher, danh mục, giá gốc, giá bán, điều kiện áp dụng, thời hạn, khu vực áp dụng, số lượng và trạng thái.

## DR-04 Đơn hàng

Mã đơn, người mua, chi tiết đơn, tổng tiền, phương thức thanh toán, trạng thái đơn và trạng thái thanh toán.

## DR-05 Voucher phát hành

Mã voucher điện tử, đơn hàng liên quan, người sở hữu, trạng thái sử dụng, ngày phát hành, ngày hết hạn và nhật ký sử dụng.

## DR-06 Đánh giá và phản hồi

Điểm đánh giá, nhận xét, khiếu nại và phản hồi xử lý.

---

# 8. Tiêu chí thành công

- Quy trình nghiệp vụ được thực hiện đầy đủ.
- Phân quyền đúng theo vai trò.
- Quản lý được toàn bộ vòng đời voucher.
- Có khả năng mở rộng cho các chức năng nâng cao trong tương lai.

---

# 9. Tài liệu liên quan

Sau BRD, các tài liệu kỹ thuật được xây dựng bao gồm:

- SRS
- Use Case Specification
- ERD
- Data Dictionary
- Activity Diagram/BPMN
- UI Design
- Test Plan

:contentReference[oaicite:5]{index=5}