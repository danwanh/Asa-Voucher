import { C } from "@/utils/constants"

interface Props {
  emoji?: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ emoji = "📭", title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-5xl mb-3">{emoji}</div>
      <div className="font-black text-lg mb-1" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{title}</div>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: "#6B7280" }}>{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 rounded-2xl font-bold text-sm text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: C.peach }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export function EmptyVouchers({ onBrowse }: { onBrowse?: () => void }) {
  return <EmptyState emoji="🎫" title="Không có voucher" description="Chưa có voucher nào ở đây. Hãy khám phá thêm!" action={onBrowse ? { label: "Khám phá voucher", onClick: onBrowse } : undefined} />
}

export function EmptyOrders() {
  return <EmptyState emoji="📦" title="Chưa có đơn hàng" description="Bạn chưa đặt mua voucher nào. Hãy bắt đầu mua sắm!" />
}

export function EmptyNotifications() {
  return <EmptyState emoji="🔔" title="Không có thông báo" description="Tất cả thông báo của bạn sẽ hiển thị ở đây." />
}

export function EmptySearchResults({ query }: { query?: string }) {
  return <EmptyState emoji="🔍" title="Không tìm thấy kết quả" description={query ? `Không có kết quả cho "${query}". Thử từ khóa khác.` : "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."} />
}

export function EmptyData({ message }: { message?: string }) {
  return <EmptyState emoji="📊" title="Chưa có dữ liệu" description={message || "Dữ liệu sẽ hiển thị ở đây khi có sẵn."} />
}
