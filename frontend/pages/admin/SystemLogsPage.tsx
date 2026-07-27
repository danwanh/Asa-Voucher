import { C } from "@/utils/constants"

const LOGS = [
  { time: "2026-07-04T18:05:00", type: "order", msg: "Đơn hàng ORD-2026-010 được tạo bởi thu.bui@gmail.com", level: "info" },
  { time: "2026-07-04T17:30:00", type: "auth", msg: "Đăng nhập thất bại 3 lần từ IP 192.168.1.45", level: "warning" },
  { time: "2026-07-04T15:45:00", type: "voucher", msg: "Voucher v09 được xác nhận sử dụng tại Vinpearl Resort", level: "info" },
  { time: "2026-07-04T14:20:00", type: "partner", msg: "Đối tác p4 (Calla Spa) gửi voucher v12 chờ duyệt", level: "info" },
  { time: "2026-07-04T12:00:00", type: "system", msg: "Sao lưu cơ sở dữ liệu hoàn thành thành công", level: "success" },
  { time: "2026-07-04T10:15:00", type: "order", msg: "Thanh toán ORD-2026-008 qua ZaloPay hoàn thành", level: "info" },
  { time: "2026-07-04T09:30:00", type: "voucher", msg: "Quản trị viên duyệt voucher v01 của Pizza Hut Vietnam", level: "success" },
  { time: "2026-07-04T08:00:00", type: "system", msg: "Hệ thống khởi động, tất cả dịch vụ hoạt động bình thường", level: "success" },
]

const LEVEL_COLOR: Record<string, string> = {
  info: "#1A5FAD", warning: "#856404", success: "#2D7A52", error: "#C0392B",
}
const LEVEL_BG: Record<string, string> = {
  info: "#E0EEFF", warning: "#FFF3CD", success: "#E8F5EE", error: "#FCEAEA",
}

export function SystemLogsPage() {
  return (
    <div className="p-6">
      <h2 className="font-black text-lg mb-5" style={{ color: C.indigo }}>Nhật ký hệ thống</h2>

      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        {LOGS.map((log, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-4 border-b hover:bg-muted/20 transition-colors"
            style={{ borderColor: "#F0EDD8" }}
          >
            <div className="text-xs shrink-0 mt-0.5 w-12" style={{ color: "#8A8DA8", fontFamily: "'Inter', monospace" }}>
              {new Date(log.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ backgroundColor: LEVEL_BG[log.level], color: LEVEL_COLOR[log.level] }}
                >
                  {log.level.toUpperCase()}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: C.eggshell, color: C.indigo }}
                >
                  {log.type}
                </span>
              </div>
              <p className="text-sm" style={{ color: C.indigo, fontFamily: "'Inter', sans-serif" }}>{log.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
