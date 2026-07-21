import { C } from "@/lib/constants"

interface Props {
  className?: string
  style?: React.CSSProperties
  rounded?: "sm" | "md" | "lg" | "xl" | "full"
}

export function Skeleton({ className = "", style, rounded = "lg" }: Props) {
  const radiusMap = { sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" }
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ backgroundColor: "#E5E7EB", borderRadius: radiusMap[rounded], ...style }}
    />
  )
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: i === lines - 1 ? "60%" : "100%" }} />
      ))}
    </div>
  )
}

export function VoucherCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-black/5">
      <Skeleton className="h-44 w-full" rounded="sm" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-7 w-16" rounded="xl" />
        </div>
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4" style={{ width: i === 0 ? "80%" : i === cols - 1 ? "50%" : "70%" }} />
        </td>
      ))}
    </tr>
  )
}

export function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <div
        className="w-10 h-10 rounded-full animate-spin"
        style={{ border: `3px solid ${C.peach}`, borderTopColor: "transparent" }}
      />
    </div>
  )
}
