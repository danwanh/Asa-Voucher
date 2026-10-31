# 4.2.7 FC-CUS-VIEW: Xem chi tiết voucher

## Thông tin chức năng

| Thuộc tính | Nội dung |
|------------|----------|
| **Mã chức năng** | FC-CUS-VIEW |
| **Tên chức năng** | Xem chi tiết voucher |
| **Mô tả** | Hiển thị thông tin chi tiết của một voucher cụ thể để khách hàng ra quyết định mua. |
| **Tác nhân** | Khách hàng |
| **Sự kiện kích hoạt** | Khách hàng click vào một voucher từ trang chủ hoặc trang tìm kiếm. |
| **Tiền điều kiện** | Voucher phải đang ở trạng thái **"Đã duyệt"** và còn thời hạn. |
| **Kết quả mong đợi (Expected Result)** | Hiển thị đầy đủ thông tin chi tiết của voucher. |

---

## Luồng sự kiện chính (Main Flow)

1. Khách hàng bấm vào hình hoặc tên voucher.
2. Hệ thống tải dữ liệu chi tiết của voucher.
3. Hệ thống hiển thị các thông tin sau:
   - Tên voucher
   - Hình ảnh
   - Giá bán
   - Giá gốc
   - Phần trăm giảm giá (%)
   - Điều kiện áp dụng
   - Thời gian sử dụng
   - Số lượng còn lại
   - Chi nhánh áp dụng
   - Đánh giá (Review)
4. Khách hàng chọn một trong hai hành động:
   - **Thêm vào giỏ hàng**
   - **Mua ngay**

---

## Luồng thay thế (Alternative Flow)

### A1. Khách hàng thực hiện hành động **"Thêm vào giỏ hàng"**

1. Tại bước 4 của luồng chính, khách hàng bấm nút **"Thêm vào giỏ hàng"**.
2. Hệ thống ghi nhận voucher vào cơ sở dữ liệu giỏ hàng tạm thời của người dùng và cập nhật số lượng hiển thị trên biểu tượng giỏ hàng.
3. Hệ thống hiển thị thông báo:

> Thêm vào giỏ hàng thành công.

4. Khách hàng tiếp tục ở lại trang chi tiết voucher để xem thêm thông tin.

---

### A2. Khách hàng thực hiện hành động **"Mua ngay"**

1. Tại bước 4 của luồng chính, khách hàng bấm nút **"Mua ngay"**.
2. Hệ thống tự động thêm voucher vào giỏ hàng của người dùng (nếu chưa tồn tại).
3. Hệ thống bỏ qua màn hình xem giỏ hàng và chuyển trực tiếp sang chức năng **FC-CUS-ORDER – Tạo đơn hàng** để khách hàng khai báo thông tin người nhận và thanh toán.

---

## Luồng ngoại lệ (Exception Flow)

### E1. Voucher đã hết hạn hoặc hết số lượng phát hành

1. Tại bước 2 của luồng chính, trong quá trình tải dữ liệu chi tiết, hệ thống kiểm tra:
   - Thời gian hiện tại đã vượt quá ngày kết thúc bán; hoặc
   - Số lượng còn lại bằng 0.
2. Hệ thống vẫn hiển thị đầy đủ thông tin chi tiết voucher để người dùng tham khảo.
3. Hai nút **"Thêm vào giỏ hàng"** và **"Mua ngay"** được chuyển sang trạng thái **Disabled**.
4. Hệ thống hiển thị nhãn trạng thái cảnh báo:

> Đã bán hết

hoặc

> Hết hạn

để người dùng dễ nhận biết.

---

## Hậu điều kiện

Không làm thay đổi dữ liệu.

---

## Mức độ ưu tiên

**Cao**

---

## Yêu cầu / Quy tắc nghiệp vụ liên quan

### BR-CUS-04

Hệ thống phải hiển thị đầy đủ các thông tin của voucher bao gồm:

- Tên voucher
- Hình ảnh
- Giá gốc
- Giá bán
- Phần trăm giảm giá
- Điều kiện áp dụng
- Thời hạn sử dụng
- Số lượng còn lại
- Chi nhánh áp dụng
- Chính sách hoàn hủy (nếu có)
- Đánh giá và nhận xét của khách hàng