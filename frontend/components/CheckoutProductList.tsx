import { C, fmt } from "@/utils/constants"

export interface CheckoutProduct {
  id: string
  title: string
  partner?: string
  quantity: number
  unitPrice?: number
  subtotal: number
  image?: string
}

interface Props {
  products: CheckoutProduct[]
  title?: string
}

const FALLBACK = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop"

export function CheckoutProductList({ products, title = "Sản phẩm" }: Props) {
  return (
    <section className="bg-white rounded-2xl p-5 sm:p-6 border border-black/5 shadow-sm">
      <h2 className="font-black text-lg mb-4" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
        {title}
      </h2>
      <div className="divide-y" style={{ borderColor: "#E5E7EB" }}>
        {products.map((product) => (
          <div
            key={product.id}
            className="grid grid-cols-[4rem_minmax(0,1fr)] md:grid-cols-[5rem_minmax(0,1fr)_5rem_8rem_8rem] gap-3 md:gap-4 items-center py-4 first:pt-0 last:pb-0"
          >
            <div className="w-16 h-14 md:w-20 md:h-16 rounded-xl overflow-hidden bg-gray-100">
              <img
                src={product.image || FALLBACK}
                alt={product.title}
                className="w-full h-full object-cover"
                onError={(event) => { event.currentTarget.src = FALLBACK }}
              />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-bold leading-snug break-words" style={{ color: C.indigo }}>
                {product.title}
              </div>
              {product.partner && (
                <div className="text-xs mt-1 break-words" style={{ color: "#8A8DA8" }}>{product.partner}</div>
              )}
            </div>

            <div className="col-span-2 grid grid-cols-3 gap-3 md:contents">
              <ProductValue label="Số lượng" value={`x${product.quantity}`} />
              <ProductValue label="Đơn giá" value={product.unitPrice === undefined ? "—" : fmt(product.unitPrice)} />
              <ProductValue label="Thành tiền" value={fmt(product.subtotal)} emphasized />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProductValue({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="min-w-0 md:text-right">
      <div className="text-[11px] mb-0.5" style={{ color: "#9CA3AF" }}>{label}</div>
      <div className="text-xs sm:text-sm font-bold break-words" style={{ color: emphasized ? C.peach : C.indigo }}>
        {value}
      </div>
    </div>
  )
}
