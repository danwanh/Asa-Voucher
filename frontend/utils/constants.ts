export const C = {
  eggshell: "#F4F1DE",
  peach: "#E07A5F",
  indigo: "#3D405B",
  teal: "#81B29A",
  apricot: "#F2CC8F",
  indigoLight: "#4D5170",
  muted: "#EDE9D0",
  content: "#F3F4F6",
};

export const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    n,
  );

export const fmtDate = (s: string) => new Date(s).toLocaleDateString("vi-VN");

export const STATUS_LABEL: Record<string, string> = {
  draft: "Bản nháp",
  pending: "Chờ xử lý",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  selling: "Đang bán",
  active: "Đang hoạt động",
  suspended: "Tạm ngưng",
  closed: "Đã đóng",
  sold_out: "Hết số lượng",
  expired: "Hết hạn",
  locked: "Đã khóa",
  confirmed: "Thanh toán thành công",
  cancelled: "Đã hủy",
  refunded: "Đã hoàn tiền",
  revoked: "Đã thu hồi",
  used: "Đã dùng",
  pending_payment: "Chờ thanh toán",
  payment_failed: "Thanh toán thất bại",
  paid: "Đã thanh toán",
  completed: "Hoàn thành",
  complaining: "Đang khiếu nại",
  resolved: "Đã xử lý",
  banned: "Bị khóa",
  inactive: "Không hoạt động",
  contacting_partner: "Liên hệ đối tác",
  reissued: "Đã cấp lại",
  open: "Đang khiếu nại",
};

export const STATUS_DESCRIPTION: Record<string, string> = {
  all: "Tất cả đơn hàng",
  pending: "Chờ xác nhận thanh toán",
  confirmed: "Đã xác nhận, voucher đã phát hành",
  cancelled: "Đã hủy",
  refunded: "Đã hoàn tiền",
  open: "Khiếu nại đang chờ xử lý",
  contacting_partner: "Đang liên hệ đối tác",
  reissued: "Đã cấp lại voucher",
}

const CATEGORY_LABELS: Record<string, string> = {
  "an-uong": "Ăn uống",
  "ca-phe": "Cà phê",
  "tra-sua": "Trà sữa",
  buffet: "Buffet",
  "giai-tri": "Giải trí",
  "ve-xem-phim": "Vé xem phim",
  karaoke: "Karaoke",
  "cham-soc-suc-khoe": "Chăm sóc sức khỏe",
  "spa-massage": "Spa massage",
  "du-lich-nghi-duong": "Du lịch nghỉ dưỡng",
  "khach-san-resort": "Khách sạn resort",
};

export function formatCategoryLabel(slug: string) {
  return (
    CATEGORY_LABELS[slug] ??
    slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function statusColor(s: string): { bg: string; text: string } {
  if (
    s === "active" ||
    s === "completed" ||
    s === "approved" ||
    s === "selling" ||
    s === "reissued"
  )
    return { bg: "#F0EDF8", text: "#7C3AED" };
  if (s === "pending" || s === "pending_payment" || s === "draft" || s === "open")
    return { bg: "#FFF3CD", text: "#856404" };
  if (s === "used" || s === "confirmed") return { bg: "#E0EEFF", text: "#1A5FAD" };
  if (s === "refunded") return { bg: "#E8F5EE", text: "#2D7A52" };
  if (s === "cancelled") return { bg: "#F3F4F6", text: "#6B7280" };
  if (s === "revoked") return { bg: "#FFF3CD", text: "#856404" };
  if (s === "complaining") return { bg: "#FFF3CD", text: "#856404" };
  if (s === "resolved" || s === "contacting_partner") return { bg: "#E0EEFF", text: "#1A5FAD" };
  if (s === "suspended") {
    return { bg: "#FFF3CD", text: "#856404" };
  }
  if (s === "closed") {
    return { bg: "#FCEAEA", text: "#C0392B" };
  }
  if (s === "sold_out" || s === "locked")
    return { bg: "#F0EDF8", text: "#6B46C1" };
  return { bg: "#FCEAEA", text: "#C0392B" };
}
