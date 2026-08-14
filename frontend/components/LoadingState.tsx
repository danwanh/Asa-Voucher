import { C } from "@/utils/constants"

type LoadingSize = "sm" | "md" | "lg"
type LoadingVariant = "page" | "section" | "inline"

interface LoadingStateProps {
  label?: string
  size?: LoadingSize
  variant?: LoadingVariant
  className?: string
}

const spinnerSizes: Record<LoadingSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-11 w-11 border-[3px]",
}

const wrapperSizes: Record<Exclude<LoadingVariant, "inline">, string> = {
  page: "min-h-[18rem]",
  section: "min-h-32",
}

export function LoadingSpinner({ size = "sm" }: { size?: LoadingSize }) {
  return (
    <span
      className={`loading-spinner inline-block shrink-0 rounded-full ${spinnerSizes[size]}`}
      style={{ borderColor: `${C.peach}45`, borderTopColor: C.peach }}
      aria-hidden="true"
    />
  )
}

export function LoadingState({ label = "Đang tải dữ liệu...", size = "md", variant = "section", className = "" }: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`} role="status" aria-live="polite">
        <LoadingSpinner size={size === "lg" ? "md" : "sm"} />
        <span>{label}</span>
      </span>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center ${wrapperSizes[variant]} ${className}`} role="status" aria-live="polite" aria-label={label}>
      <LoadingSpinner size={size} />
      <span className="text-sm font-semibold" style={{ color: C.indigo }}>{label}</span>
    </div>
  )
}
