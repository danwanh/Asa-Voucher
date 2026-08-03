import { Home, RefreshCw, ArrowLeft } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"

type ErrorCode = 401 | 403 | 404 | 500

interface Props {
  code?: ErrorCode
  onBack?: () => void
  onHome?: () => void
}

const ERROR_CONFIG: Record<ErrorCode, { title: string; description: string; icon: string }> = {
  401: {
    icon: "lock",
    title: "Chưa đăng nhập",
    description: "Bạn cần đăng nhập để truy cập trang này. Vui lòng đăng nhập và thử lại.",
  },
  403: {
    icon: "alert",
    title: "Không có quyền truy cập",
    description: "Tài khoản của bạn không có quyền xem trang này. Liên hệ quản trị viên nếu cần hỗ trợ.",
  },
  404: {
    icon: "search",
    title: "Trang không tìm thấy",
    description: "Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa. Hãy kiểm tra lại đường dẫn.",
  },
  500: {
    icon: "settings",
    title: "Lỗi máy chủ",
    description: "Đã có sự cố xảy ra phía máy chủ. Chúng tôi đang khắc phục. Vui lòng thử lại sau.",
  },
}

export function ErrorPage({ code = 404, onBack, onHome }: Props) {
  const config = ERROR_CONFIG[code]

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: C.content, fontFamily: "'Nunito', sans-serif" }}
    >
      <div className="text-center max-w-md">
        <AppIcon name={config.icon} className="w-20 h-20 mb-4 mx-auto" strokeWidth={1.5} />
        <div className="text-7xl font-black mb-3" style={{ color: C.indigo, opacity: 0.15 }}>{code}</div>
        <h1 className="text-2xl font-black mb-3" style={{ color: C.indigo }}>{config.title}</h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: "#6B7280" }}>{config.description}</p>

        <div className="flex justify-center gap-3 flex-wrap">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm border-2"
              style={{ borderColor: C.indigo, color: C.indigo }}
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>
          )}
          {code === 500 && (
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm border-2"
              style={{ borderColor: "#E5E7EB", color: "#6B7280" }}
            >
              <RefreshCw className="w-4 h-4" /> Thử lại
            </button>
          )}
          {onHome && (
            <button
              onClick={onHome}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm text-white"
              style={{ backgroundColor: C.peach }}
            >
              <Home className="w-4 h-4" /> Về trang chủ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function NotFoundPage({ onHome }: { onHome?: () => void }) {
  return <ErrorPage code={404} onHome={onHome} />
}

export function ForbiddenPage({ onBack, onHome }: { onBack?: () => void; onHome?: () => void }) {
  return <ErrorPage code={403} onBack={onBack} onHome={onHome} />
}

export function UnauthorizedPage({ onHome }: { onHome?: () => void }) {
  return <ErrorPage code={401} onHome={onHome} />
}

export function ServerErrorPage({ onHome }: { onHome?: () => void }) {
  return <ErrorPage code={500} onHome={onHome} />
}
