import { ChevronRight } from "lucide-react"
import { C } from "@/utils/constants"

interface Props {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
  align?: "left" | "center"
  eyebrowColor?: string
}

export function SectionHeader({ eyebrow, title, subtitle, action, align = "left", eyebrowColor = C.peach }: Props) {
  const centered = align === "center"
  return (
    <div className={`mb-8 flex items-end justify-between gap-4 ${centered ? "flex-col items-center text-center" : ""}`}>
      <div className={centered ? "text-center" : ""}>
        {eyebrow && (
          <div
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide mb-2"
            style={{ backgroundColor: `${eyebrowColor}1A`, color: eyebrowColor }}
          >
            {eyebrow}
          </div>
        )}
        <h2 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm" style={{ color: "#6B7280" }}>{subtitle}</p>}
      </div>
      {action && (
        <button onClick={action.onClick} className="flex items-center gap-1 text-sm font-semibold hover:underline flex-shrink-0" style={{ color: C.peach }}>
          {action.label} <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}