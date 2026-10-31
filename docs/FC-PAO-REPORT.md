# FC-PAO-REPORT – Xem báo cáo đối tác

## Thông tin chức năng

| Thuộc tính | Nội dung |
|------------|----------|
| **Mã chức năng** | FC-PAO-REPORT |
| **Tên chức năng** | Xem báo cáo đối tác |
| **Tác nhân** | Đối tác (chủ tài khoản) |
| **Mức độ ưu tiên** | Trung bình |

---

## Mô tả

Cho phép chủ tài khoản đối tác theo dõi doanh thu, số lượng voucher phát hành, bán, sử dụng, hết hạn và hiệu quả hoạt động theo chương trình hoặc chi nhánh.

---

## Sự kiện kích hoạt

Đối tác chọn chức năng **"Báo cáo"**.

---

## Tiền điều kiện

- Đối tác đã đăng nhập và có quyền xem báo cáo.
- Doanh nghiệp đã được phê duyệt, đang hoạt động và có dữ liệu nghiệp vụ.

---

## Kết quả mong đợi

Hệ thống tổng hợp và hiển thị báo cáo chính xác theo phạm vi doanh nghiệp và điều kiện lọc; việc xem báo cáo không thay đổi dữ liệu gốc.

---

# Luồng sự kiện chính

### Bước 1

Đối tác mở chức năng **"Báo cáo"**.

### Bước 2

Hệ thống kiểm tra phiên đăng nhập, quyền truy cập và phạm vi doanh nghiệp.

### Bước 3

Hệ thống hiển thị màn hình báo cáo cùng các bộ lọc.

### Bước 4

Đối tác chọn khoảng thời gian, chi nhánh hoặc chương trình voucher.

### Bước 5

Hệ thống truy xuất dữ liệu đơn hàng, voucher phát hành và lịch sử sử dụng.

### Bước 6

Hệ thống tính doanh thu, số lượng phát hành, bán, sử dụng, hết hạn và tỷ lệ sử dụng.

### Bước 7

Hệ thống hiển thị số liệu tổng quan, bảng dữ liệu và biểu đồ.

### Bước 8

Đối tác có thể thay đổi bộ lọc hoặc xuất báo cáo nếu được hỗ trợ.

---

# Luồng sự kiện thay thế

## A1 – Tại bước 5: Không có dữ liệu phù hợp

- Hệ thống hiển thị **"Không có dữ liệu phù hợp"** và không tạo số liệu giả.

---

## A2 – Tại bước 4: Khoảng thời gian không hợp lệ

- Hệ thống báo lỗi và yêu cầu chọn lại khoảng thời gian.

---

## A3 – Tại bước 5: Chi nhánh ngoài phạm vi doanh nghiệp

- Hệ thống từ chối truy xuất và thông báo không có quyền truy cập.

---

## A4 – Tại bước 5 hoặc bước 6: Lỗi tổng hợp báo cáo

- Hệ thống không hiển thị báo cáo thiếu dữ liệu như kết quả thành công và yêu cầu thử lại.

---

## Hậu điều kiện

- Không có dữ liệu nghiệp vụ bị thay đổi.
- Báo cáo phản ánh đúng phạm vi và điều kiện lọc.

---

## Mức độ ưu tiên

**Trung bình**

---

## Quy tắc nghiệp vụ

### BR-PAO-03

(Tham chiếu BR-PAR-07)

Dữ liệu báo cáo phải phản ánh đúng doanh thu, phát hành, bán và sử dụng voucher.