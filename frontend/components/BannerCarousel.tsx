"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { C } from "@/utils/constants"
import { cmsContentService } from "@/services/cmsContentService"
import type { CmsContent } from "@/types"

const AUTOPLAY_MS = 5000

export function BannerCarousel() {
  const [banners, setBanners] = useState<CmsContent[]>([])
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    cmsContentService.listPublic("banner")
      .then((items) => {
        if (cancelled) return
        setBanners(items)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const count = banners.length

  const goNext = useCallback(() => {
    if (count <= 1) return
    setIndex((i) => (i + 1) % count)
  }, [count])

  const goPrev = useCallback(() => {
    if (count <= 1) return
    setIndex((i) => (i - 1 + count) % count)
  }, [count])

  useEffect(() => {
    if (count <= 1) return
    const timer = setInterval(goNext, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [count, goNext])

  if (count === 0) return null

  const banner = banners[index]

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div
        className="relative h-56 md:h-80 w-full overflow-hidden"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return
          const delta = e.changedTouches[0].clientX - touchStartX.current
          if (Math.abs(delta) > 40) {
            if (delta < 0) goNext()
            else goPrev()
          }
          touchStartX.current = null
        }}
      >
        {banner.image_url ? (
          <img src={banner.image_url} alt={banner.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.indigoLight})` }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(20,22,36,0.55) 0%, rgba(20,22,36,0.1) 70%, transparent 100%)" }} />
        <div className="relative z-10 flex h-full max-w-xl flex-col justify-center px-6 md:px-10">
          <h2 className="text-2xl md:text-4xl font-black text-white leading-tight" style={{ fontFamily: "'Nunito', sans-serif", textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>
            {banner.title}
          </h2>
          {banner.content && (
            <p className="mt-2 text-sm md:text-base text-white/85 line-clamp-2" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}>
              {banner.content}
            </p>
          )}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Banner trước"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow-md hover:bg-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" style={{ color: C.indigo }} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Banner sau"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow-md hover:bg-white transition-colors"
          >
            <ChevronRight className="h-5 w-5" style={{ color: C.indigo }} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Banner ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === index ? 20 : 8, backgroundColor: i === index ? "white" : "rgba(255,255,255,0.45)" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}