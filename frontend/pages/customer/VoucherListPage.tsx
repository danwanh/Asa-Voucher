import { useEffect, useMemo, useState } from "react"
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { VoucherCard } from "@/components/VoucherCard"
import type { Voucher } from "@/types"
import { voucherService } from "@/services/voucherService"

interface Props {
  onBuy: (v: Voucher) => void
  onDetail: (v: Voucher) => void
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

export function VoucherListPage({ onBuy, onDetail }: Props) {
  const [search, setSearch] = useState("")
  const [cat, setCat] = useState("all")
  const [sort, setSort] = useState("popular")
  const [showFilters, setShowFilters] = useState(false)
  const [source, setSource] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState("all")

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
      { id: "all", label: "Tất cả" },
      ...Array.from(new Set(source.map((voucher) => voucher.category))).map((slug) => ({
        id: slug,
        label: slug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      }))
    ],
    [source]
  )

  const hasActiveFilters = priceRange !== "all"

  const clearFilters = () => {
    setPriceRange("all")
  }

  const filtered = useMemo(() => {
    let list = source.filter((v) => v.status === "active")

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((v) =>
        v.title.toLowerCase().includes(q) || v.partnerName.toLowerCase().includes(q)
      )
    }
    if (cat !== "all") list = list.filter((v) => v.category === cat)
    list = list.filter((v) => inPriceRange(v.price, priceRange))

    return [...list].sort((a, b) =>
      sort === "popular" ? b.sold - a.sold :
      sort === "price-asc" ? a.price - b.price :
      b.price - a.price
    )
  }, [source, search, cat, priceRange, sort])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Search row */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
          <input
            className="w-full pl-9 pr-4 py-3 rounded-2xl border text-sm outline-none"
            style={{ borderColor: "#E2DFC8", backgroundColor: "white", fontFamily: "'Inter', sans-serif" }}
            placeholder="Tìm kiếm voucher, thương hiệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
              >
                {PRICE_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs" style={{ color: "#8A8DA8" }}>
                Dữ liệu voucher được lấy trực tiếp từ backend.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className="px-4 py-2 rounded-2xl text-sm font-bold transition-all"
            style={{
              backgroundColor: cat === c.id ? C.indigo : "white",
              color:           cat === c.id ? "white"  : C.indigo,
              border:          `2px solid ${cat === c.id ? C.indigo : "#E2DFC8"}`,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="font-bold text-lg" style={{ color: C.indigo }}>Đang tải voucher...</div>
        </div>
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
              <VoucherCard key={v.id} voucher={v} onBuy={() => onBuy(v)} onClick={() => onDetail(v)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
