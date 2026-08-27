import { RefreshCw } from "lucide-react"
import { C } from "@/utils/constants"

interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  onReload?: () => void
  loading?: boolean
  actions?: React.ReactNode
}

export function AdminPageHeader({ title, subtitle, onReload, loading, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onReload && (
          <button
            onClick={onReload}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors disabled:opacity-50"
            style={{ borderColor: "#E2DFC8", color: C.indigo }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        )}
      </div>
    </div>
  )
}
