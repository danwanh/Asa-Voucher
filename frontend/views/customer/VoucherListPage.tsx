import { useEffect, useMemo, useState } from "react"
import { SlidersHorizontal, X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { C, formatCategoryLabel } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { VoucherCard } from "@/components/VoucherCard"
import type { Voucher } from "@/types"
import { voucherService } from "@/services/voucherService"
import { parseApplicableAreas } from "@/utils/applicableArea"
import { LoadingState } from "@/components/LoadingState"

interface Props {
  onAddToCart: (v: Voucher) => void
  onBuyNow: (v: Voucher) => void
  onDetail: (v: Voucher) => void
  searchQuery: string
  filters: {
    categoryId: string
    partnerId: string
    area: string
    priceRange: string
    discountRange: string
    effectiveStatus: string
  }
  onFiltersChange: (next: {
    categoryId: string
    partnerId: string
    area: string
    priceRange: string
    discountRange: string
    effectiveStatus: string
  }) => void
}

const PRICE_RANGES = [
  { id: "all",     label: "Tất cả giá" },
  { id: "0-50",    label: "Dưới 50k" },
  { id: "50-100",  label: "50k – 100k" },
  { id: "100-200", label: "100k – 200k" },
  { id: "200+",    label: "Trên 200k" },
]

function inPriceRange(price: number, range: string): boolean {
  if (range === "all")     return true
  if (range === "0-50")    return price < 50000
  if (range === "50-100")  return price >= 50000  && price < 100000
  if (range === "100-200") return price >= 100000 && price < 200000
  if (range === "200+")    return price >= 200000
  return true
}

const DISCOUNT_RANGES = [
  { id: "all", label: "Tất cả mức giảm" },
  { id: "0-10", label: "Dưới 10%" },
  { id: "10-20", label: "10% - 20%" },
  { id: "20-30", label: "20% - 30%" },
  { id: "30+", label: "Từ 30%" },
]

function inDiscountRange(discount: number, range: string): boolean {
  if (range === "all") return true
  if (range === "0-10") return discount < 10
  if (range === "10-20") return discount >= 10 && discount < 20
  if (range === "20-30") return discount >= 20 && discount < 30
  if (range === "30+") return discount >= 30
  return true
}

const EFFECTIVE_STATUS_OPTIONS = [
  { id: "all", label: "Tất cả trạng thái" },
  { id: "effective", label: "Đang hiệu lực" },
  { id: "expiring_7_days", label: "Sắp hết hạn (7 ngày)" },
]

function inEffectiveStatus(voucher: Voucher, status: string): boolean {
  if (status === "all") return true

  const now = new Date()
  const validFrom = new Date(voucher.validFrom)
  const validTo = new Date(voucher.validTo)
  const isEffective = validFrom <= now && validTo >= now && voucher.status === "active" && voucher.quantity > voucher.sold

  if (status === "effective") return isEffective
  if (status === "expiring_7_days") {
    const sevenDaysFromNow = new Date(now)
    sevenDaysFromNow.setDate(now.getDate() + 7)
    return isEffective && validTo <= sevenDaysFromNow
  }

  return true
}

export function VoucherListPage({ onAddToCart, onBuyNow, onDetail, searchQuery, filters, onFiltersChange }: Props) {
  const [sort, setSort] = useState("popular")
  const [showFilters, setShowFilters] = useState(false)
  const [source, setSource] = useState<Voucher[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const updateFilters = (patch: Partial<Props["filters"]>) => {
    onFiltersChange({ ...filters, ...patch })
  }

  useEffect(() => {
    let isMounted = true

    async function loadVouchers() {
      setIsLoading(true)
      setLoadError(null)
      try {
         const result = await voucherService.listPublicVouchersPage({
           page,
           limit: 20,
          search: searchQuery.trim() || undefined,
          categoryId: filters.categoryId !== "all" ? filters.categoryId : undefined,
          partnerId: filters.partnerId !== "all" ? filters.partnerId : undefined,
          area: filters.area !== "all" ? filters.area : undefined,
        })

        // TODO(backend): add server-side filters for price/discount/effective_status
        // in GET /voucher-products to avoid client-side filtering for large datasets.
        if (!isMounted) return
         setSource(result.items)
         setTotalPages(result.totalPages)
      } catch {
        if (!isMounted) return
        setLoadError("Không thể tải danh sách voucher")
        setSource([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadVouchers()
    return () => {
      isMounted = false
    }
  }, [searchQuery, filters.categoryId, filters.partnerId, filters.area, page])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, filters.categoryId, filters.partnerId, filters.area])

  const categoryOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>()

    for (const voucher of source) {
      const categoryId = voucher.categoryId ?? voucher.category
      if (map.has(categoryId)) continue
      const label = formatCategoryLabel(voucher.category)
      map.set(categoryId, { id: categoryId, label })
    }

    return [{ id: "all", label: "Tất cả" }, ...Array.from(map.values())]
  }, [source])

  const partnerOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>()
    for (const voucher of source) {
      if (!map.has(voucher.partnerId)) {
        map.set(voucher.partnerId, { id: voucher.partnerId, label: voucher.partnerName || voucher.partnerId })
      }
    }
    return [{ id: "all", label: "Tất cả đối tác" }, ...Array.from(map.values())]
  }, [source])

  const areaOptions = useMemo(() => {
    const values = new Set<string>()
    for (const voucher of source) {
      for (const area of parseApplicableAreas(voucher.applicableArea)) {
        values.add(area)
      }
    }
    return ["all", ...Array.from(values).sort((a, b) => a.localeCompare(b, "vi"))]
  }, [source])

  const hasActiveFilters =
    filters.categoryId !== "all" ||
    filters.partnerId !== "all" ||
    filters.area !== "all" ||
    filters.priceRange !== "all" ||
    filters.discountRange !== "all" ||
    filters.effectiveStatus !== "all"

  const clearFilters = () => {
    onFiltersChange({
      categoryId: "all",
      partnerId: "all",
      area: "all",
      priceRange: "all",
      discountRange: "all",
      effectiveStatus: "all"
    })
  }

  const filtered = useMemo(() => {
    let list = source
    list = list.filter((v) => inPriceRange(v.price, filters.priceRange))
    list = list.filter((v) => inDiscountRange(v.discount, filters.discountRange))
    list = list.filter((v) => inEffectiveStatus(v, filters.effectiveStatus))

    return [...list].sort((a, b) =>
      sort === "popular" ? b.sold - a.sold :
      sort === "price-asc" ? a.price - b.price :
      b.price - a.price
    )
  }, [source, filters.priceRange, filters.discountRange, filters.effectiveStatus, sort])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Search row */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-bold transition-all"
          style={{
            borderColor:     hasActiveFilters ? C.peach : "#E2DFC8",
            backgroundColor: hasActiveFilters ? C.peach + "10" : "white",
            color:           hasActiveFilters ? C.peach : C.indigo,
          }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Bộ lọc
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: C.peach }}>!</span>
          )}
        </button>

        <div className="relative">
          <select
            className="appearance-none pl-4 pr-8 py-3 rounded-2xl border text-sm outline-none font-semibold"
            style={{ borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo, fontFamily: "'Nunito', sans-serif" }}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="popular">Phổ biến nhất</option>
            <option value="price-asc">Giá tăng dần</option>
            <option value="price-desc">Giá giảm dần</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: C.indigo }} />
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border p-5 mb-5 shadow-sm" style={{ borderColor: "#E2DFC8" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-sm" style={{ color: C.indigo }}>Bộ lọc nâng cao</span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg" style={{ color: C.peach, backgroundColor: C.peach + "15" }}>
                <X className="w-3 h-3" /> Xóa bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>Khoảng giá</label>
              <select
                className="px-3 py-2.5 rounded-xl border text-sm outline-none font-semibold cursor-pointer w-full"
                style={{ borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo, fontFamily: "'Nunito', sans-serif" }}
                value={filters.priceRange}
                onChange={(e) => updateFilters({ priceRange: e.target.value })}
              >
                {PRICE_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>Mức giảm</label>
              <select
                className="px-3 py-2.5 rounded-xl border text-sm outline-none font-semibold cursor-pointer w-full"
                style={{ borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo, fontFamily: "'Nunito', sans-serif" }}
                value={filters.discountRange}
                onChange={(e) => updateFilters({ discountRange: e.target.value })}
              >
                {DISCOUNT_RANGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>Đối tác</label>
              <select
                className="px-3 py-2.5 rounded-xl border text-sm outline-none font-semibold cursor-pointer w-full"
                style={{ borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo, fontFamily: "'Nunito', sans-serif" }}
                value={filters.partnerId}
                onChange={(e) => updateFilters({ partnerId: e.target.value })}
              >
                {partnerOptions.map((partner) => <option key={partner.id} value={partner.id}>{partner.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>Khu vực</label>
              <select
                className="px-3 py-2.5 rounded-xl border text-sm outline-none font-semibold cursor-pointer w-full"
                style={{ borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo, fontFamily: "'Nunito', sans-serif" }}
                value={filters.area}
                onChange={(e) => updateFilters({ area: e.target.value })}
              >
                {areaOptions.map((area) => <option key={area} value={area}>{area === "all" ? "Tất cả khu vực" : area}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>Hiệu lực</label>
              <select
                className="px-3 py-2.5 rounded-xl border text-sm outline-none font-semibold cursor-pointer w-full"
                style={{ borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo, fontFamily: "'Nunito', sans-serif" }}
                value={filters.effectiveStatus}
                onChange={(e) => updateFilters({ effectiveStatus: e.target.value })}
              >
                {EFFECTIVE_STATUS_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categoryOptions.map((c) => (
          <button
            key={c.id}
            onClick={() => updateFilters({ categoryId: c.id })}
            className="px-4 py-2 rounded-2xl text-sm font-bold transition-all"
            style={{
              backgroundColor: filters.categoryId === c.id ? C.indigo : "white",
              color:           filters.categoryId === c.id ? "white"  : C.indigo,
              border:          `2px solid ${filters.categoryId === c.id ? C.indigo : "#E2DFC8"}`,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState label="Đang tải voucher..." variant="section" />
      ) : loadError ? (
        <div className="text-center py-20">
          <div className="font-bold text-lg" style={{ color: C.indigo }}>{loadError}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <AppIcon name="search" className="w-14 h-14 mb-4 mx-auto" />
          <div className="font-bold text-lg" style={{ color: C.indigo }}>Không tìm thấy voucher</div>
          <div className="text-sm mt-2" style={{ color: "#8A8DA8" }}>Thử thay đổi từ khóa hoặc bộ lọc</div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-4 px-5 py-2 rounded-xl font-bold text-sm" style={{ backgroundColor: C.peach + "15", color: C.peach }}>
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm mb-4 font-semibold" style={{ color: "#8A8DA8" }}>
             Tìm thấy <strong style={{ color: C.indigo }}>{filtered.length}</strong> voucher
            {hasActiveFilters && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: C.peach + "15", color: C.peach }}>Đang lọc</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((v) => (
              <VoucherCard key={v.id} voucher={v} onAddToCart={() => onAddToCart(v)} onBuyNow={() => onBuyNow(v)} onClick={() => onDetail(v)} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="p-2 rounded-lg border disabled:opacity-40" aria-label="Trang trước"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-semibold">Trang {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="p-2 rounded-lg border disabled:opacity-40" aria-label="Trang sau"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
