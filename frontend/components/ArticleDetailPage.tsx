"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, FileText, Loader2 } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"
import { cmsContentService } from "@/services/cmsContentService"
import { AppFooter } from "@/components/AppFooter"
import { GuestSiteHeader } from "@/components/GuestSiteHeader"
import type { CmsContent } from "@/types"

interface Props {
  articleId: string
}

function splitParagraphs(content: string): string[] {
  return content
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function ArticleDetailPage({ articleId }: Props) {
  const router = useRouter()
  const [article, setArticle] = useState<CmsContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    cmsContentService.getById(articleId)
      .then((item) => {
        if (cancelled) return
        setArticle(item)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [articleId])

  const guestNav = [
    { label: "Trang chủ", id: "home", onClick: () => router.push("/") },
    { label: "Voucher", id: "vouchers", onClick: () => router.push("/vouchers") },
    { label: "Danh mục", id: "categories", onClick: () => router.push("/categories") },
  ]

  const footerHandlers = {
    onHome: () => router.push("/"),
    onVouchers: () => router.push("/vouchers"),
    onCategories: () => router.push("/categories"),
    onSupport: () => router.push("/"),
    onRegisterPartner: () => router.push("/signup"),
    onTerms: () => router.push("/terms"),
    onPolicy: () => router.push("/policy"),
    onPrivacy: () => router.push("/privacy"),
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: C.content, fontFamily: "'Nunito', sans-serif" }}>
      <GuestSiteHeader
        active="news"
        navItems={guestNav}
        cartOnClick={() => router.push("/cart")}
        loginOnClick={() => router.push("/login")}
        registerOnClick={() => router.push("/signup")}
        onSearchSubmit={() => router.push("/vouchers")}
      />

      <section className="flex-1 mx-auto max-w-4xl px-4 py-10 w-full">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin mr-2" style={{ color: C.peach }} />
            <span className="text-sm font-semibold" style={{ color: "#8A8DA8" }}>Đang tải bài viết...</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-black/5 bg-white p-10 text-center shadow-sm">
            <FileText className="mx-auto mb-3 h-10 w-10" style={{ color: "#8A8DA8" }} />
            <h1 className="text-xl font-black" style={{ color: C.indigo }}>Không tìm thấy bài viết</h1>
            <p className="mt-2 text-sm" style={{ color: "#8A8DA8" }}>Bài viết có thể đã bị ẩn hoặc không còn tồn tại.</p>
            <Link href="/" className="mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: C.peach }}>
              Quay lại trang chủ
            </Link>
          </div>
        )}

        {!loading && !error && article && (
          <article>
            <div className="mb-6">
              <div className="flex items-center gap-3 text-xs font-semibold mb-3" style={{ color: "#8A8DA8" }}>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {fmtDate(article.created_at)}</span>
              </div>
              <h1 className="text-3xl font-black leading-tight md:text-4xl" style={{ color: C.indigo }}>{article.title}</h1>
            </div>

            {article.image_url && (
              <div className="mb-8 h-64 md:h-80 overflow-hidden rounded-3xl">
                <img src={article.image_url} alt={article.title} className="h-full w-full object-cover" />
              </div>
            )}

            {article.content ? (
              <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm md:p-8">
                <div className="space-y-4">
                  {splitParagraphs(article.content).map((paragraph, i) => (
                    <p key={i} className="text-sm leading-7 md:text-base" style={{ color: "#4B5563" }}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-black/5 bg-white p-10 text-center text-sm shadow-sm" style={{ color: "#8A8DA8" }}>
                Bài viết chưa có nội dung.
              </div>
            )}
          </article>
        )}
      </section>

      <AppFooter {...footerHandlers} />
    </main>
  )
}