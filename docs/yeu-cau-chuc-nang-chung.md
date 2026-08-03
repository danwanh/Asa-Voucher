# Yêu cầu chức năng chung

## FC-COM-SIGNIN: Đăng nhập

**Mã chức năng:** FC-COM-SIGNIN

**Tên chức năng:** Đăng nhập

**Mô tả:** Cho phép Khách hàng, Đối tác (chủ tài khoản), Nhân viên tạo voucher, Nhân viên cửa hàng và các nhóm quản trị viên đăng nhập bằng email/số điện thoại cùng mật khẩu tương ứng.

**Tác nhân:** Khách hàng; Đối tác (chủ tài khoản); Nhân viên tạo voucher; Nhân viên cửa hàng; Admin quản lý nội dung; Admin vận hành; Admin quản lý log & bảo mật

**Sự kiện kích hoạt:** Người dùng chọn chức năng _Đăng nhập_ trên giao diện hệ thống.

**Tiền điều kiện:** Người dùng đã có tài khoản trong hệ thống.

**Kết quả mong đợi (Expected result):** Người dùng đăng nhập thành công và được chuyển đến trang chủ/giao diện tương ứng với vai trò của mình.

**Luồng sự kiện chính:**

1. Người dùng truy cập trang đăng nhập của hệ thống.
2. Người dùng nhập email và mật khẩu.
3. Người dùng nhấn nút _Đăng nhập_.
4. Hệ thống kiểm tra tính hợp lệ của thông tin đăng nhập.
5. Hệ thống ghi nhận phiên đăng nhập cho người dùng.
6. Hệ thống chuyển hướng người dùng đến giao diện và phạm vi chức năng tương ứng với vai trò đã được cấp.

**Luồng sự kiện thay thế:**

**Luồng biến thể (Alternative flow):**

- **A1: Quên mật khẩu:** Người dùng chọn _Quên mật khẩu_ tại màn hình đăng nhập.
  1. Người dùng nhập email hoặc số điện thoại đã đăng ký.
  2. Hệ thống kiểm tra thông tin và gửi liên kết đặt lại mật khẩu đến email của người dùng.
  3. Người dùng truy cập email, mở liên kết đặt lại mật khẩu, nhập mật khẩu mới và nhập lại mật khẩu mới để xác nhận.
  4. Hệ thống kiểm tra tính hợp lệ của mật khẩu mới và đối chiếu hai giá trị mật khẩu đã nhập.
     - Nếu người dùng không nhận được liên kết hoặc liên kết đã hết hạn, người dùng chọn _Gửi lại liên kết_. Hệ thống gửi một liên kết đặt lại mật khẩu mới đến email của người dùng.
     - Nếu mật khẩu mới không đáp ứng yêu cầu định dạng hoặc mật khẩu xác nhận không khớp, hệ thống hiển thị thông báo lỗi và yêu cầu người dùng nhập lại.

  5. Hệ thống cập nhật mật khẩu mới sau khi thông tin hợp lệ.
  6. Sau khi đổi mật khẩu thành công, hệ thống chuyển người dùng đến màn hình đăng nhập để đăng nhập lại.

**Luồng ngoại lệ (Exception flow):**

- **E4:** Tài khoản hoặc mật khẩu không đúng: hệ thống tăng số lần nhập sai, hiển thị thông báo lỗi và yêu cầu nhập lại nếu chưa vượt quá 10 lần.
- **E4:** Tài khoản chưa được xác thực/kích hoạt: hệ thống thông báo và yêu cầu xác thực trước khi đăng nhập.
- **E4:** Tài khoản bị khóa do nhập sai quá 10 lần: hệ thống hiển thị thông báo và tạm khóa đăng nhập trong 15 phút.

**Hậu điều kiện:** Người dùng ở trạng thái đã đăng nhập, phiên làm việc được khởi tạo và lưu trữ trên hệ thống.

**Mức độ ưu tiên (Priority):** Cao

**Yêu cầu/Quy tắc nghiệp vụ liên quan:** BR-CUS-02

![Activity diagram chức năng Đăng nhập](../figures/ActivityDiagram/SIGNIN.png)

_Activity diagram chức năng Đăng nhập_

## FC-COM-SIGNOUT: Đăng xuất

**Mã chức năng:** FC-COM-SIGNOUT

**Tên chức năng:** Đăng xuất

**Mô tả:** Cho phép người dùng đã đăng nhập kết thúc phiên làm việc hiện tại một cách an toàn.

**Tác nhân:** Tất cả người dùng đã đăng nhập

**Sự kiện kích hoạt:** Người dùng chọn chức năng _Đăng xuất_ trên giao diện hệ thống.

**Tiền điều kiện:** Người dùng đang trong trạng thái đã đăng nhập vào hệ thống.

**Kết quả mong đợi (Expected result):** Phiên làm việc của người dùng được kết thúc và hệ thống chuyển về trang đăng nhập.

**Luồng sự kiện chính:**

1. Người dùng chọn chức năng _Đăng xuất_ từ menu tài khoản.
2. Hệ thống hiển thị xác nhận đăng xuất.
3. Người dùng xác nhận đăng xuất.
4. Hệ thống hủy phiên làm việc hiện tại của người dùng.
5. Hệ thống chuyển hướng người dùng về trang đăng nhập.

**Luồng sự kiện thay thế:**

**Luồng biến thể (Alternative flow):**

- **A3:** Người dùng hủy thao tác xác nhận đăng xuất: hệ thống giữ nguyên phiên làm việc hiện tại.

**Luồng ngoại lệ (Exception flow):**

- **E4:** Lỗi kết nối trong quá trình đăng xuất: hệ thống thông báo lỗi và yêu cầu thử lại.

**Hậu điều kiện:** Phiên làm việc của người dùng bị hủy, người dùng không thể truy cập các chức năng yêu cầu đăng nhập cho đến khi đăng nhập lại.

**Mức độ ưu tiên (Priority):** Trung bình

**Yêu cầu/Quy tắc nghiệp vụ liên quan:** BR-CUS-02

## FC-COM-PROFILE: Quản lý hồ sơ cá nhân

**Mã chức năng:** FC-COM-PROFILE

**Tên chức năng:** Quản lý hồ sơ cá nhân

**Mô tả:** Cho phép người dùng xem, cập nhật thông tin cá nhân và đổi mật khẩu của tài khoản.

**Tác nhân:** Tất cả người dùng có tài khoản trong hệ thống

**Sự kiện kích hoạt:** Người dùng chọn chức năng _Hồ sơ cá nhân_ hoặc _Đổi mật khẩu_.

**Tiền điều kiện:** Người dùng đã đăng nhập vào hệ thống.

**Kết quả mong đợi (Expected result):** Thông tin cá nhân/mật khẩu của người dùng được cập nhật thành công và lưu trữ chính xác trên hệ thống.

**Luồng sự kiện chính:**

1. Người dùng truy cập trang _Hồ sơ cá nhân_.
2. Hệ thống hiển thị thông tin cá nhân hiện tại của người dùng.
3. Người dùng chỉnh sửa các thông tin cần thay đổi như họ tên, địa chỉ.
4. Người dùng nhấn _Lưu_ để xác nhận thay đổi.
5. Hệ thống kiểm tra tính hợp lệ của dữ liệu được nhập.
6. Hệ thống cập nhật thông tin cá nhân vào cơ sở dữ liệu.
7. Hệ thống thông báo cập nhật thành công.

**Luồng sự kiện thay thế:**

**Luồng biến thể (Alternative flow):**

**A3: Đổi mật khẩu**

1. Người dùng chọn chức năng _Đổi mật khẩu_ trong trang hồ sơ cá nhân.
2. Hệ thống hiển thị biểu mẫu đổi mật khẩu.
3. Người dùng nhập mật khẩu mới và nhập lại mật khẩu mới để xác nhận.
4. Người dùng nhấn _Lưu_ để xác nhận thay đổi.
5. Hệ thống kiểm tra định dạng mật khẩu và đối chiếu hai giá trị mật khẩu đã nhập.
   - Nếu mật khẩu không thỏa điều kiện: có độ dài từ 8 đến 64 ký tự, bao gồm ít nhất một chữ cái viết hoa, một chữ cái viết thường, một chữ số và một ký tự đặc biệt hoặc xác nhận mật khẩu không khớp: hệ thống thông báo lỗi và yêu cầu nhập lại.

6. Hệ thống cập nhật mật khẩu mới và thông báo đổi mật khẩu thành công.

**Luồng ngoại lệ (Exception flow):**

- **A5:** Dữ liệu hồ sơ không đúng định dạng hoặc thiếu thông tin bắt buộc: hệ thống thông báo lỗi và yêu cầu nhập lại.

**Hậu điều kiện:** Thông tin cá nhân hoặc mật khẩu của người dùng được cập nhật thành công trong hệ thống.

**Mức độ ưu tiên (Priority):** Trung bình

**Yêu cầu/Quy tắc nghiệp vụ liên quan:** BR-CUS-02

## FC-COM-REGISTER: Đăng ký tài khoản

**Mã chức năng:** FC-COM-REGISTER

**Tên chức năng:** Đăng ký tài khoản

**Mô tả:** Cho phép Khách hàng đăng ký tài khoản cá nhân và Đối tác đăng ký tài khoản doanh nghiệp. Tài khoản nhân viên đối tác do chủ tài khoản đối tác tạo; tài khoản quản trị viên được cấp nội bộ và không đăng ký công khai.

**Tác nhân:** Khách hàng; Đối tác (chủ tài khoản)

**Sự kiện kích hoạt:** Người dùng chọn chức năng _Đăng ký_ trên giao diện hệ thống.

**Tiền điều kiện:** Người dùng chưa có tài khoản được đăng ký trong hệ thống.

**Kết quả mong đợi (Expected result):** Tài khoản khách hàng được kích hoạt sau khi xác thực; hồ sơ đối tác được tạo ở trạng thái “Chờ duyệt” để Admin vận hành thẩm định.

**Luồng sự kiện chính:**

1. Người đăng ký chọn đăng ký dưới dạng _Người dùng_ hoặc _Đối tác_.
2. Hệ thống hiển thị biểu mẫu đăng ký tương ứng với loại tài khoản đã chọn.
3. Người đăng ký nhập các thông tin tương ứng:
   - Đối với Người dùng: họ tên, email hoặc số điện thoại, mật khẩu và xác nhận mật khẩu.
   - Đối với Đối tác: tên doanh nghiệp, người đại diện, email, số điện thoại, địa chỉ doanh nghiệp, mã số thuế hoặc thông tin đăng ký kinh doanh, mật khẩu và xác nhận mật khẩu.

4. Người đăng ký nhấn nút _Đăng ký_.
5. Hệ thống kiểm tra tính đầy đủ và hợp lệ của dữ liệu đã nhập theo loại tài khoản.
6. Hệ thống kiểm tra trùng lặp email/số điện thoại với các tài khoản đã tồn tại.
7. Hệ thống gửi liên kết xác thực đến email đã đăng ký.
8. Người đăng ký truy cập email và mở liên kết xác thực để hoàn tất đăng ký.
9. Hệ thống xác thực liên kết; kích hoạt tài khoản người dùng hoặc lưu hồ sơ đối tác ở trạng thái “Chờ duyệt”.
10. Hệ thống thông báo kết quả và chuyển hướng đến trang đăng nhập hoặc trang theo dõi hồ sơ đối tác.

**Luồng sự kiện thay thế:**

**Luồng biến thể (Alternative flow):**

- **A7:** Người đăng ký không nhận được liên kết xác thực hoặc liên kết đã hết hạn: hệ thống cho phép chọn _Gửi lại liên kết xác thực_ sau 60 giây, quay lại bước 7.

**Luồng ngoại lệ (Exception flow):**

- **E6:** Email/số điện thoại đã tồn tại trong hệ thống: hệ thống thông báo lỗi trùng lặp và yêu cầu nhập thông tin khác, quay lại bước 3.
- **E5:** Mật khẩu không thỏa điều kiện: có độ dài từ 8 đến 64 ký tự, bao gồm ít nhất một chữ cái viết hoa, một chữ cái viết thường, một chữ số và một ký tự đặc biệt hoặc xác nhận mật khẩu không khớp: hệ thống thông báo lỗi và yêu cầu nhập lại, quay lại bước 3.
- **E5:** Dữ liệu nhập không đúng định dạng hoặc thiếu thông tin bắt buộc tương ứng với loại tài khoản: hệ thống thông báo lỗi và yêu cầu nhập lại, quay lại bước 3.

**Hậu điều kiện:** Tài khoản khách hàng được kích hoạt; tài khoản đối tác chỉ được sử dụng đầy đủ sau khi hồ sơ doanh nghiệp được duyệt.

**Mức độ ưu tiên (Priority):** Cao

**Yêu cầu/Quy tắc nghiệp vụ liên quan:** BR-CUS-01; BR-PAO-01
