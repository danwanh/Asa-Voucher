"use client"

import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"
import { cmsContentService } from "@/services/cmsContentService"
import type { CmsContent } from "@/types"

interface Props {
  onOpenArticle: (id: string) => void
  background?: string
}

export function NewsSection({ onOpenArticle, background = C.muted }: Props) {
  const [articles, setArticles] = useState<CmsContent[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    cmsContentService.listPublic("article")
      .then((items) => {
        if (cancelled) return
        setArticles(items)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) return null
  if (articles.length === 0) return null

  return (
    <section className="py-14 px-4" style={{ backgroundColor: background }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Tin tức &amp; Ưu đãi</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.slice(0, 3).map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => onOpenArticle(article.id)}
              className="text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 hover:shadow-md transition-shadow group"
            >
              <div className="h-40 overflow-hidden bg-gray-100">
                {article.image_url ? (
                  <img src={article.image_url} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold" style={{ color: "#8A8DA8" }}>Chưa có ảnh</div>
                )}
              </div>
              <div className="p-4">
                <div className="text-xs font-semibold mb-1" style={{ color: C.peach }}>{fmtDate(article.created_at)}</div>
                <h3 className="font-bold text-sm line-clamp-2 leading-snug" style={{ color: C.indigo }}>{article.title}</h3>
                {article.content && (
                  <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: "#6B7280" }}>{article.content}</p>
                )}
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: C.teal }}>
                  Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}