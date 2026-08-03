export const C = {
  eggshell: "#F4F1DE",
  peach: "#E07A5F",
  indigo: "#3D405B",
  teal: "#81B29A",
  apricot: "#F2CC8F",
  indigoLight: "#4D5170",
  muted: "#EDE9D0",
  content: "#F3F4F6",
}

export const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n)

export const fmtDate = (s: string) => new Date(s).toLocaleDateString("vi-VN")

export const STATUS_LABEL: Record<string, string> = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  selling: "Đang bán",
  active: "Đang hoạt động",
  sold_out: "Hết số lượng",
  expired: "Hết hạn",
  locked: "Đã khóa",
  cancelled: "Đã hủy",
  used: "Đã dùng",
  completed: "Hoàn thành",
  banned: "Bị khóa",
  inactive: "Không hoạt động",
}

export function statusColor(s: string): { bg: string; text: string } {
  if (s === "active" || s === "completed" || s === "approved" || s === "selling")
    return { bg: "#E8F5EE", text: "#2D7A52" }
  if (s === "pending" || s === "draft")
    return { bg: "#FFF3CD", text: "#856404" }
  if (s === "used")
    return { bg: "#E0EEFF", text: "#1A5FAD" }
  if (s === "sold_out" || s === "locked")
    return { bg: "#F0EDF8", text: "#6B46C1" }
  return { bg: "#FCEAEA", text: "#C0392B" }
}
