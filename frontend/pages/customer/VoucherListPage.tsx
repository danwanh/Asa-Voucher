import { useState, useMemo } from "react"
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react"
import { C } from "@/utils/constants"
import { VoucherCard } from "@/components/VoucherCard"
import { VOUCHERS, BUSINESS_LOCATIONS, LOCATABLE_PARTNERS } from "@/data/mock"
import type { Voucher } from "@/types"

interface Props {
  onBuy: (v: Voucher) => void
  onDetail: (v: Voucher) => void
}

const CATS = [
  { id: "all", label: "Tất cả" },
  { id: "food", label: "Ẩm thực" },
  { id: "beauty", label: "Làm đẹp" },
  { id: "travel", label: "Du lịch" },
  { id: "entertainment", label: "Giải trí" },
]

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
  const [search, setSearch]           = useState("")
  const [cat, setCat]                 = useState("all")
  const [sort, setSort]               = useState("popular")
  const [showFilters, setShowFilters] = useState(false)

  // ── Cascading location filters ────────────────────────────────────────────
  const [businessId, setBusinessId] = useState("")  // partnerId or ""
  const [region, setRegion]         = useState("")  // region name or ""
  const [branchId, setBranchId]     = useState("")  // branchId or ""
  const [priceRange, setPriceRange] = useState("all")

  // Step 1 — regions that belong to the selected business (or all regions)
  const availableRegions = useMemo(() => {
    const locs = businessId
      ? BUSINESS_LOCATIONS.filter((l) => l.partnerId === businessId)
      : BUSINESS_LOCATIONS
    return Array.from(new Set(locs.map((l) => l.region))).sort()
  }, [businessId])

  // Step 2 — branches that belong to the selected business + region
  const availableBranches = useMemo(() => {
    if (!businessId) return []
    return BUSINESS_LOCATIONS.filter(
      (l) => l.partnerId === businessId && (!region || l.region === region)
    )
  }, [businessId, region])

  const hasActiveFilters =
    businessId !== "" || region !== "" || branchId !== "" || priceRange !== "all"

  const clearFilters = () => {
    setBusinessId(""); setRegion(""); setBranchId(""); setPriceRange("all")
  }

  // ── Voucher filtering ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = VOUCHERS.filter((v) => v.status === "active")

    if (search) {
      const q = search.toLowerCase()
      list = list.filter((v) =>
        v.title.toLowerCase().includes(q) || v.partnerName.toLowerCase().includes(q)
      )
    }
    if (cat !== "all")   list = list.filter((v) => v.category === cat)
    list = list.filter((v) => inPriceRange(v.price, priceRange))

    // Business filter
    if (businessId) list = list.filter((v) => v.partnerId === businessId)

    // Region filter — keeps vouchers from businesses that operate in this region
    if (region && !businessId) {
      const pidSet = new Set(
        BUSINESS_LOCATIONS.filter((l) => l.region === region).map((l) => l.partnerId)
      )
      list = list.filter((v) => pidSet.has(v.partnerId))
    }

    // Branch filter — scoped to the branch's owning business (already guaranteed by cascade)
    // No additional filtering needed: business is always selected when branch is selected

    return [...list].sort((a, b) =>
      sort === "popular"    ? b.sold - a.sold :
      sort === "price-asc"  ? a.price - b.price :
      b.price - a.price
    )
  }, [search, cat, priceRange, businessId, region, branchId, sort])

  const selectCls   = "px-3 py-2.5 rounded-xl border text-sm outline-none font-semibold cursor-pointer w-full"
  const selectStyle = { borderColor: "#E2DFC8", backgroundColor: "white", color: C.indigo, fontFamily: "'Nunito', sans-serif" }

  const businessLabel = businessId
    ? (LOCATABLE_PARTNERS.find((p) => p.id === businessId)?.name ?? businessId)
    : ""
  const branchLabel = branchId
    ? (BUSINESS_LOCATIONS.find((l) => l.branchId === branchId)?.branchName ?? branchId)
    : ""

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

      {/* Cascading filter panel */}
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

          {/* Row 1: Business + Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>Thương hiệu</label>
              <select
                className={selectCls}
                style={selectStyle}
                value={businessId}
                onChange={(e) => {
                  setBusinessId(e.target.value)
                  setRegion("")     // cascade reset
                  setBranchId("")
                }}
              >
                <option value="">Tất cả thương hiệu</option>
                {LOCATABLE_PARTNERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: C.indigo }}>Khoảng giá</label>
              <select className={selectCls} style={selectStyle} value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
                {PRICE_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Region (depends on Business) + Branch (depends on Business + Region) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: businessId ? C.indigo : "#B0B3C8" }}>
                Tỉnh / Thành phố
                {!businessId && <span className="ml-1 font-normal italic">(chọn thương hiệu trước)</span>}
              </label>
              <select
                className={selectCls}
                style={{ ...selectStyle, color: businessId ? C.indigo : "#B0B3C8", opacity: businessId ? 1 : 0.55 }}
                value={region}
                disabled={!businessId}
                onChange={(e) => { setRegion(e.target.value); setBranchId("") }}
              >
                <option value="">
                  {businessId ? `Tất cả khu vực (${availableRegions.length})` : "—"}
                </option>
                {availableRegions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: availableBranches.length > 0 ? C.indigo : "#B0B3C8" }}>
                Chi nhánh
                {!businessId && <span className="ml-1 font-normal italic">(chọn thương hiệu trước)</span>}
                {businessId && !region && availableBranches.length > 0 && <span className="ml-1 font-normal" style={{ color: "#8A8DA8" }}>(tùy chọn)</span>}
              </label>
              <select
                className={selectCls}
                style={{ ...selectStyle, color: availableBranches.length > 0 ? C.indigo : "#B0B3C8", opacity: availableBranches.length > 0 ? 1 : 0.55 }}
                value={branchId}
                disabled={availableBranches.length === 0}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">
                  {availableBranches.length > 0 ? `Tất cả chi nhánh (${availableBranches.length})` : "—"}
                </option>
                {availableBranches.map((l) => (
                  <option key={l.branchId} value={l.branchId}>{l.branchName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filter breadcrumb chips */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 items-center" style={{ borderColor: "#E2DFC8" }}>
              <span className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>Đang lọc:</span>
              {businessLabel && (
                <FilterChip label={businessLabel} onRemove={() => { setBusinessId(""); setRegion(""); setBranchId("") }} />
              )}
              {region && <FilterChip label={region} onRemove={() => { setRegion(""); setBranchId("") }} />}
              {branchLabel && <FilterChip label={branchLabel} onRemove={() => setBranchId("")} />}
              {priceRange !== "all" && (
                <FilterChip label={PRICE_RANGES.find((r) => r.id === priceRange)?.label ?? priceRange} onRemove={() => setPriceRange("all")} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATS.map((c) => (
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

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
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

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: C.indigo + "12", color: C.indigo }}>
      {label}
      <button onClick={onRemove} className="ml-0.5 rounded-full hover:bg-black/10 p-0.5">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  )
}
