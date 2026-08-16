import { Tag } from "lucide-react"
import { C } from "@/utils/constants"

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <button
              type="button"
              onClick={onHome}
              className="flex items-center gap-2 font-black text-lg mb-3 text-white"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.peach }}>
                <Tag className="w-3.5 h-3.5 text-white" />
              </div>
              ASA Voucher
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
