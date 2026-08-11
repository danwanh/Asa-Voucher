import type { Order } from "@/types"

export const ORDERS: Order[] = [
  { id: "ORD-2026-001", userId: "u01", voucherId: "v01", voucherTitle: "Giảm 30% pizza size L", partnerName: "Pizza Hut Vietnam", amount: 49000, status: "completed", paymentMethod: "VNPay", createdAt: "2026-07-01T09:30:00", code: "ASA-PH-7F3K2" },
  { id: "ORD-2026-002", userId: "u02", voucherId: "v03", voucherTitle: "Vé xem phim 2D", partnerName: "CGV Cinemas", amount: 59000, status: "completed", paymentMethod: "MoMo", createdAt: "2026-07-01T14:15:00", code: "ASA-CG-8H5N1" },
  { id: "ORD-2026-003", userId: "u01", voucherId: "v07", voucherTitle: "Giảm 500K vé bay nội địa", partnerName: "Vietjet Air", amount: 199000, status: "completed", paymentMethod: "ZaloPay", createdAt: "2026-07-02T10:00:00", code: "ASA-VJ-4M9P7" },
  { id: "ORD-2026-004", userId: "u03", voucherId: "v05", voucherTitle: "Massage thư giãn 60 phút", partnerName: "Calla Spa", amount: 149000, status: "pending_payment", paymentMethod: "VNPay", createdAt: "2026-07-02T16:45:00", code: "ASA-CS-2L6Q4" },
  { id: "ORD-2026-005", userId: "u04", voucherId: "v08", voucherTitle: "Nghỉ dưỡng 2N1Đ Nha Trang", partnerName: "Vinpearl Resort", amount: 899000, status: "completed", paymentMethod: "Chuyển khoản", createdAt: "2026-07-03T08:20:00", code: "ASA-VP-9K3R8" },
  { id: "ORD-2026-006", userId: "u05", voucherId: "v02", voucherTitle: "Mua 1 tặng 1 pizza cuối tuần", partnerName: "Pizza Hut Vietnam", amount: 89000, status: "cancelled", paymentMethod: "MoMo", createdAt: "2026-07-03T20:00:00", code: "ASA-PH-1T5W6" },
  { id: "ORD-2026-007", userId: "u01", voucherId: "v09", voucherTitle: "Vé vui chơi Vinpearl Land", partnerName: "Vinpearl Resort", amount: 299000, status: "completed", paymentMethod: "VNPay", createdAt: "2026-07-04T11:30:00", code: "ASA-VP-6U2V3" },
  { id: "ORD-2026-008", userId: "u06", voucherId: "v04", voucherTitle: "Combo bắp nước + vé phim", partnerName: "CGV Cinemas", amount: 79000, status: "completed", paymentMethod: "ZaloPay", createdAt: "2026-07-04T15:00:00", code: "ASA-CG-7X4Y9" },
  { id: "ORD-2026-009", userId: "u07", voucherId: "v06", voucherTitle: "Chăm sóc da mặt chuyên sâu", partnerName: "Calla Spa", amount: 199000, status: "completed", paymentMethod: "MoMo", createdAt: "2026-07-04T09:00:00", code: "ASA-CS-3Z1A5" },
  { id: "ORD-2026-010", userId: "u08", voucherId: "v12", voucherTitle: "Làm nail nghệ thuật", partnerName: "Calla Spa", amount: 129000, status: "pending_payment", paymentMethod: "VNPay", createdAt: "2026-07-04T18:00:00", code: "ASA-CS-5B8C2" },
]
