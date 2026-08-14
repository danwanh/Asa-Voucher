import { useEffect, useMemo, useState } from "react"
import { Search, SlidersHorizontal, Star, X, ChevronDown } from "lucide-react"
import { C, fmt, formatCategoryLabel } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import type { Voucher } from "@/types"
import { voucherService } from "@/services/voucherService"
import { LoadingState } from "@/components/LoadingState"

interface Props {
  onDetail: (v: Voucher) => void
  onLogin: () => void
  onAddToCart: (v: Voucher) => void
}

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp → cao" },
  { value: "price_desc", label: "Giá cao → thấp" },
  { value: "discount", label: "Giảm giá nhiều nhất" },
  { value: "popular", label: "Bán chạy" },
  { value: "rating", label: "Đánh giá cao" },
]

export function GuestVoucherListPage({ onDetail, onLogin, onAddToCart }: Props) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [sort, setSort] = useState("newest")
  const [source, setSource] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [showFilter, setShowFilter] = useState(false)
  const [page, setPage] = useState(1)
  const PER_PAGE = 9

  useEffect(() => {
    let isMounted = true

    async function loadVouchers() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const items = await voucherService.listPublicVouchers({ limit: 100 })
        if (!isMounted) return
        setSource(items)
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
  }, [])

  const categories = useMemo(
    () => [
      { value: "all", label: "Tất cả" },
      ...Array.from(new Set(source.map((voucher) => voucher.category))).map((slug) => ({
        value: slug,
        label: formatCategoryLabel(slug)
      }))
    ],
    [source]
  )

  const filtered = useMemo(() => {
    let list = source.filter((v) => v.status === "active")
    if (search) list = list.filter((v) => v.title.toLowerCase().includes(search.toLowerCase()) || v.partnerName.toLowerCase().includes(search.toLowerCase()))
    if (category !== "all") list = list.filter((v) => v.category === category)
    if (priceMin) list = list.filter((v) => v.price >= Number(priceMin))
    if (priceMax) list = list.filter((v) => v.price <= Number(priceMax))
    switch (sort) {
      case "price_asc": return [...list].sort((a, b) => a.price - b.price)
      case "price_desc": return [...list].sort((a, b) => b.price - a.price)
      case "discount": return [...list].sort((a, b) => b.discount - a.discount)
      case "popular": return [...list].sort((a, b) => b.sold - a.sold)
      case "rating": return [...list].sort((a, b) => b.rating - a.rating)
      default: return list
    }
  }, [source, search, category, sort, priceMin, priceMax])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Tìm voucher, thương hiệu..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white border-2 border-transparent focus:border-opacity-40 outline-none"
            style={{ borderColor: "transparent", outlineColor: C.teal }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 bg-white"
            style={{ borderColor: showFilter ? C.peach : "transparent", color: C.indigo }}
          >
            <SlidersHorizontal className="w-4 h-4" /> Bộ lọc
          </button>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm font-semibold bg-white border-2 border-transparent outline-none cursor-pointer"
              style={{ color: C.indigo }}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: C.indigo }} />
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="bg-white rounded-2xl p-5 mb-5 border border-black/5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <div className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "#6B7280" }}>Danh mục</div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => { setCategory(cat.value); setPage(1) }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
                    style={{
                      backgroundColor: category === cat.value ? C.peach : "transparent",
                      color: category === cat.value ? "white" : C.indigo,
                      borderColor: category === cat.value ? C.peach : "#E5E7EB",
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "#6B7280" }}>Khoảng giá (đ)</div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Từ"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: "#E5E7EB" }}
                />
                <span className="text-gray-400">—</span>
                <input
                  type="number"
                  placeholder="Đến"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: "#E5E7EB" }}
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setSearch(""); setCategory("all"); setPriceMin(""); setPriceMax(""); setPage(1) }}
                className="flex items-center gap-1 text-sm font-semibold hover:underline"
                style={{ color: C.peach }}
              >
                <X className="w-3.5 h-3.5" /> Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 flex-wrap mb-5">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { setCategory(cat.value); setPage(1) }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              backgroundColor: category === cat.value ? C.indigo : "white",
              color: category === cat.value ? "white" : C.indigo,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results info */}
      {isLoading ? (
        <LoadingState label="Đang tải voucher..." variant="section" size="sm" />
      ) : loadError ? (
        <div className="text-sm mb-4" style={{ color: "#6B7280" }}>{loadError}</div>
      ) : (
        <div className="text-sm mb-4" style={{ color: "#6B7280" }}>
          Tìm thấy <strong style={{ color: C.indigo }}>{filtered.length}</strong> voucher
        </div>
      )}

      {/* Grid */}
      {paged.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl">
          <AppIcon name="search" className="w-14 h-14 mb-3 mx-auto" />
          <div className="font-bold text-lg" style={{ color: C.indigo }}>Không tìm thấy voucher</div>
          <div className="text-sm mt-2" style={{ color: "#6B7280" }}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map((v) => (
            <VoucherCard key={v.id} voucher={v} onDetail={onDetail} onLogin={onLogin} onAddToCart={onAddToCart} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className="w-9 h-9 rounded-xl text-sm font-bold transition-all"
              style={{
                backgroundColor: page === i + 1 ? C.indigo : "white",
                color: page === i + 1 ? "white" : C.indigo,
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function VoucherCard({ voucher: v, onDetail, onLogin, onAddToCart }: { voucher: Voucher; onDetail: (v: Voucher) => void; onLogin: () => void; onAddToCart: (v: Voucher) => void }) {
  const pct = Math.round(((v.originalPrice - v.price) / v.originalPrice) * 100)
  const remaining = v.quantity - v.sold
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onDetail(v)}>
      <div className="relative h-44 overflow-hidden">
        <img src={v.image} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-white text-xs font-bold" style={{ backgroundColor: C.peach }}>-{pct}%</div>
        {remaining < 20 && <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "#FFF3CD", color: "#856404" }}>Còn {remaining}</div>}
      </div>
      <div className="p-4">
        <div className="text-xs font-semibold mb-1.5" style={{ color: C.teal }}>{v.partnerLogo} {v.partnerName}</div>
        <div className="font-bold text-sm mb-3 line-clamp-2 leading-snug" style={{ color: C.indigo }}>{v.title}</div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-black text-base" style={{ color: C.peach }}>{fmt(v.price)}</span>
          <span className="text-xs line-through" style={{ color: "#9CA3AF" }}>{fmt(v.originalPrice)}</span>
        </div>
        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.round((v.sold / v.quantity) * 100)}%`, backgroundColor: C.peach }} />
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ color: "#9CA3AF" }}>
            <span>Đã bán: {v.sold}</span>
            <span>Còn: {remaining}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs" style={{ color: "#6B7280" }}>
            <Star className="w-3 h-3 fill-current" style={{ color: C.apricot }} /> {v.rating}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(v) }}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: C.peach }}
          >
            + Giỏ hàng
          </button>
        </div>
      </div>
    </div>
  )
}
