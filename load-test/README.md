# Load test (k6)

| Script | Mô phỏng | Ghi DB? |
|---|---|---|
| `browse.js` | Khách lướt: homepage → danh mục → danh sách → chi tiết | Không |
| `purchase.js` | Buyer đã login: giỏ hàng → thêm voucher → checkout | **Có** (cart_items, orders) |

```sh
k6 run -e BASE_URL=http://localhost:5000/api -e VUS=300 load-test/browse.js
k6 run -e BASE_URL=http://localhost:5000/api -e PASSWORD=<mật khẩu seed> -e VUS=50 load-test/purchase.js
```

⚠️ Chỉ chạy với backend trỏ tới DB local/staging, không chạy vào DB production.
Nên `npm run seed:bulk` trước để có dữ liệu thực tế. Tăng dần `VUS` cho tới khi p95 hoặc tỉ lệ lỗi vượt ngưỡng để tìm sức chịu tải.
