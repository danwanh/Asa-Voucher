import { useEffect, useMemo, useState } from "react"
import { AppIcon } from "@/components/AppIcon"
import { LoadingState } from "@/components/LoadingState"
import { voucherService, type BackendCategory, type HomepageSummary } from "@/services/voucherService"
import { C } from "@/utils/constants"

interface CategoryGridPageProps {
  title?: string
  onSelectCategory: (category: BackendCategory) => void
}

const categoryVisuals = [
  { icon: "gift", color: "#FDEBD0" },
  { icon: "heart", color: "#FCE4EC" },
  { icon: "location", color: "#E3F2FD" },
  { icon: "ticket", color: "#EDE7F6" },
  { icon: "shield", color: "#E8F5E9" },
  { icon: "document", color: "#FFF8E1" },
  { icon: "shield", color: "#E0F7FA" },
  { icon: "shoppingCart", color: "#F3E5F5" },
]

export function CategoryGridPage({ title = "Tất cả danh mục", onSelectCategory }: CategoryGridPageProps) {
  const [categories, setCategories] = useState<BackendCategory[]>([])
  const [summary, setSummary] = useState<HomepageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      setLoading(true)
      setError(false)
      try {
        const [categoryList, homepageSummary] = await Promise.all([
          voucherService.listCategories(),
          voucherService.getHomepageSummary(),
        ])
        if (cancelled) return
        setCategories(categoryList)
        setSummary(homepageSummary)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  const countByCategoryId = useMemo(() => {
    return new Map((summary?.categoryCounts ?? []).map((item) => [item.categoryId, item.count]))
  }, [summary])

  if (loading) return <LoadingState label="Đang tải danh mục..." variant="page" />

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{title}</h1>
        <div className="rounded-2xl bg-white border border-black/5 px-5 py-8 text-center text-sm font-semibold" style={{ color: C.indigo }}>
          Không thể tải danh mục. Vui lòng thử lại sau.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{title}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {categories.map((category, index) => {
          const visual = categoryVisuals[index % categoryVisuals.length]
          const count = countByCategoryId.get(category.id) ?? 0

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category)}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl hover:shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: visual.color, outlineColor: C.peach }}
            >
              <AppIcon name={visual.icon} className="w-12 h-12" style={{ color: C.indigo }} />
              <div className="font-black text-sm text-center leading-tight" style={{ color: C.indigo }}>{category.name}</div>
              <div className="text-xs" style={{ color: "#6B7280" }}>{count} voucher</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
