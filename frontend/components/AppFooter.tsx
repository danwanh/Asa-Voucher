import { useEffect, useState } from "react"
import { Tag } from "lucide-react"
import { C } from "@/utils/constants"
import { cmsContentService } from "@/services/cmsContentService"
import type { CmsContent } from "@/types"

type FooterAction = "vouchers" | "categories" | "support" | "business" | "terms" | "policy" | "privacy"

type FooterLink = {
  label: string
  action: FooterAction
}

interface AppFooterProps {
  onHome: () => void
  onVouchers: () => void
  onCategories: () => void
  onSupport: () => void
  onRegisterPartner: () => void
  onTerms: () => void
  onPolicy: () => void
  onPrivacy: () => void
}

const footerSections: { title: string; links: FooterLink[] }[] = [
  {
    title: "Sản phẩm",
    links: [
      { label: "Tất cả voucher", action: "vouchers" },
      { label: "Danh mục", action: "categories" },
      { label: "Ưu đãi hôm nay", action: "vouchers" },
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      { label: "Liên hệ", action: "support" },
      { label: "Điều khoản dịch vụ", action: "terms" },
    ],
  },
  {
    title: "Doanh nghiệp",
    links: [
      { label: "Đăng ký đối tác", action: "business" },
    ],
  },
]

export function AppFooter({
  onHome,
  onVouchers,
  onCategories,
  onSupport,
  onRegisterPartner,
  onTerms,
  onPolicy,
  onPrivacy,
}: AppFooterProps) {
  const [policies, setPolicies] = useState<CmsContent[]>([])
  const [policiesLoading, setPoliciesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setPoliciesLoading(true)
    cmsContentService.listPublic("policy")
      .then((items) => {
        if (!cancelled) setPolicies(items)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPoliciesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const actions: Record<FooterAction, () => void> = {
    vouchers: onVouchers,
    categories: onCategories,
    support: onSupport,
    business: onRegisterPartner,
    terms: onTerms,
    policy: onPolicy,
    privacy: onPrivacy,
  }

  return (
    <footer className="border-t border-black/8 py-12" style={{ backgroundColor: C.indigo }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
          <div>
<button
              type="button"
              onClick={onHome}
              className="flex items-center gap-2 font-black text-lg mb-3 text-white"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              <img src="/logo.png" alt="Asa" className="h-7 object-contain" />
              <span className="h-7 font-black text-white">Asa Voucher</span>
            </button>
            <p className="text-sm leading-relaxed text-white/60">
              Nền tảng mua bán voucher điện tử hàng đầu Việt Nam. Tiết kiệm thông minh, trải nghiệm đỉnh cao.
            </p>
          </div>

          {footerSections.map((col) => (
            <div key={col.title}>
              <div className="font-bold text-sm mb-3 text-white/90">{col.title}</div>
              {col.links.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={actions[link.action]}
                  className="block text-left text-sm py-0.5 text-white/50 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ outlineColor: C.apricot }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          ))}

          <div>
            <div className="font-bold text-sm mb-3 text-white/90">Chính sách</div>
            {policiesLoading ? (
              <div className="space-y-2" aria-busy="true" aria-label="Đang tải chính sách">
                <div className="h-3 w-3/4 rounded-full animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
                <div className="h-3 w-2/3 rounded-full animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
                <div className="h-3 w-1/2 rounded-full animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
              </div>
            ) : policies.length > 0 ? policies.map((policy) => (
              <a
                key={policy.id}
                href={`/policy?title=${encodeURIComponent(policy.title)}`}
                className="block text-sm py-0.5 text-white/50 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ outlineColor: C.apricot }}
              >
                {policy.title}
              </a>
            )) : (
              <button
                type="button"
                onClick={onPolicy}
                className="block text-left text-sm py-0.5 text-white/50 hover:text-white transition-colors"
              >
                Chính sách
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">© 2026 ASA Voucher. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-4 text-xs">
            {[
              { label: "Chính sách", action: "policy" as const },
              { label: "Bảo mật", action: "privacy" as const },
            ].map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={actions[link.action]}
                className="text-white/40 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ outlineColor: C.apricot }}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}