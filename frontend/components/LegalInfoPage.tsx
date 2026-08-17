"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Loader2, ShieldCheck, Tag } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"
import { cmsContentService } from "@/services/cmsContentService"
import { AppFooter } from "@/components/AppFooter"
import { GuestSiteHeader } from "@/components/GuestSiteHeader"
import type { CmsContent } from "@/types"

type LegalKind = "terms" | "policy" | "privacy"

interface LegalInfoPageProps {
  kind: LegalKind
}

type LegalSection = {
  title: string
  body: string[]
}

type FallbackContent = {
  title: string
  eyebrow: string
  subtitle: string
  icon: "terms" | "policy" | "privacy"
  sections: LegalSection[]
}

const legalContent: Record<LegalKind, FallbackContent> = {
  terms: {
    title: "Điều khoản dịch vụ",
    eyebrow: "ASA Voucher",
    subtitle: "Các điều kiện sử dụng nền tảng, mua voucher, quản lý đơn hàng và trách nhiệm của người dùng khi giao dịch trên ASA Voucher.",
    icon: "terms",
    sections: [
      {
        title: "Điều khoản dịch vụ",
        body: [
          "Điều khoản này áp dụng cho khách hàng, đối tác và nhân sự vận hành khi truy cập hoặc sử dụng ASA Voucher.",
          "Khi tạo tài khoản, đăng voucher, đặt mua voucher hoặc sử dụng mã voucher, bạn xác nhận đã đọc và đồng ý với các điều khoản này.",
          "Người dùng chịu trách nhiệm về tính chính xác của thông tin đăng ký và bảo mật tài khoản. Voucher chỉ có hiệu lực trong thời gian, khu vực và điều kiện áp dụng được hiển thị trong chi tiết voucher.",
          "Yêu cầu hủy hoặc hoàn tiền được xử lý theo trạng thái đơn hàng, trạng thái sử dụng voucher và quy trình kiểm tra khiếu nại.",
          "Nếu cần hỗ trợ về điều khoản dịch vụ, vui lòng liên hệ ASA Voucher qua email support@asavoucher.vn.",
        ],
      },
    ],
  },
  policy: {
    title: "Chính sách",
    eyebrow: "Quy định giao dịch",
    subtitle: "Chính sách vận hành dành cho việc mua voucher, phát hành mã, khiếu nại, hủy đơn và hoàn tiền trên ASA Voucher.",
    icon: "policy",
    sections: [
      {
        title: "Chính sách",
        body: [
          "Khách hàng có thể mua voucher đang hiển thị công khai, còn số lượng và còn thời gian bán trên nền tảng.",
          "Sau khi thanh toán thành công, hệ thống phát hành mã voucher hoặc QR cho tài khoản mua hàng.",
          "Yêu cầu hoàn tiền được xem xét khi voucher chưa sử dụng, giao dịch còn đủ điều kiện xử lý và có căn cứ hợp lệ từ khách hàng hoặc đối tác.",
          "Khách hàng có thể gửi khiếu nại từ đơn hàng hoặc voucher đã phát hành nếu gặp lỗi sử dụng hoặc cửa hàng từ chối không hợp lệ.",
          "ASA Voucher có thể cập nhật chính sách để phù hợp với quy trình vận hành, yêu cầu pháp lý hoặc thay đổi từ đối tác thanh toán.",
        ],
      },
    ],
  },
  privacy: {
    title: "Chính sách bảo mật",
    eyebrow: "Bảo vệ dữ liệu",
    subtitle: "Cách ASA Voucher thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân trong quá trình sử dụng nền tảng.",
    icon: "privacy",
    sections: [
      {
        title: "Chính sách bảo mật",
        body: [
          "ASA Voucher có thể thu thập họ tên, email, số điện thoại, vai trò tài khoản, thông tin đơn hàng và dữ liệu sử dụng voucher.",
          "Thông tin được dùng để xác thực tài khoản, xử lý đơn hàng, phát hành voucher, hỗ trợ khách hàng và cải thiện chất lượng dịch vụ.",
          "Dữ liệu cần thiết có thể được chia sẻ với đối tác cung cấp voucher, cổng thanh toán hoặc đơn vị hỗ trợ kỹ thuật để hoàn tất giao dịch.",
          "ASA Voucher áp dụng kiểm soát truy cập, phân quyền tài khoản và ghi nhận nhật ký để giảm rủi ro truy cập trái phép.",
          "Người dùng có thể yêu cầu cập nhật thông tin tài khoản hoặc đề nghị hỗ trợ về quyền riêng tư qua support@asavoucher.vn.",
        ],
      },
    ],
  },
}

const iconMap = {
  terms: FileText,
  policy: Tag,
  privacy: ShieldCheck,
}

function splitParagraphs(content: string): string[] {
  return content
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function matchPolicy(policies: CmsContent[], kind: LegalKind, titleFilter: string | null): CmsContent | undefined {
  if (kind === "terms") {
    return policies.find((p) => p.title.toLowerCase().includes("điều khoản"))
  }
  if (kind === "privacy") {
    return policies.find((p) => p.title.toLowerCase().includes("bảo mật"))
  }
  if (titleFilter) {
    const decoded = decodeURIComponent(titleFilter)
    return policies.find((p) => p.title === decoded)
  }
  return policies[0]
}

export function LegalInfoPage({ kind }: LegalInfoPageProps) {
  const router = useRouter()
  const [titleFilter, setTitleFilter] = useState<string | null>(null)
  const [policy, setPolicy] = useState<CmsContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setTitleFilter(params.get("title"))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    cmsContentService.listPublic("policy")
      .then((items) => {
        if (cancelled || items.length === 0) return
        setPolicy(matchPolicy(items, kind, titleFilter) ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [kind, titleFilter])

  const fallback = legalContent[kind]
  const active = policy ?? null
  const title = active?.title ?? fallback.title
  const eyebrow = active ? "Chính sách" : fallback.eyebrow
  const paragraphs = active?.content ? splitParagraphs(active.content) : []
  const subtitle = active ? (paragraphs[0] ?? fallback.subtitle) : fallback.subtitle
  const sections: LegalSection[] = active
    ? [{ title: active.title, body: paragraphs.slice(1).length > 0 ? paragraphs.slice(1) : paragraphs }]
    : fallback.sections
  const updatedAt = active?.updated_at ? fmtDate(active.updated_at) : null

  const Icon = iconMap[kind]

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
        active="policy"
        navItems={guestNav}
        cartOnClick={() => router.push("/cart")}
        loginOnClick={() => router.push("/login")}
        registerOnClick={() => router.push("/signup")}
        onSearchSubmit={() => router.push("/vouchers")}
      />

      {loading ? (
        <section className="flex-1 mx-auto max-w-5xl px-4 py-12 w-full">
          <div className="mb-8 flex items-start gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl animate-pulse" style={{ backgroundColor: "#E5E7EB" }} />
            <div className="flex-1">
              <div className="h-4 w-32 rounded-full animate-pulse" style={{ backgroundColor: "#E5E7EB" }} />
              <div className="mt-3 h-8 w-2/3 rounded-full animate-pulse" style={{ backgroundColor: "#E5E7EB" }} />
              <div className="mt-4 h-4 w-full rounded-full animate-pulse" style={{ backgroundColor: "#E5E7EB" }} />
              <div className="mt-2 h-4 w-4/5 rounded-full animate-pulse" style={{ backgroundColor: "#E5E7EB" }} />
            </div>
          </div>
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin mr-2" style={{ color: C.peach }} />
            <span className="text-sm font-semibold" style={{ color: "#8A8DA8" }}>Đang tải nội dung...</span>
          </div>
        </section>
      ) : (
        <section className="flex-1 mx-auto max-w-5xl px-4 py-12 w-full">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.peach}18`, color: C.peach }}>
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-wide" style={{ color: C.peach }}>{eyebrow}</div>
              <h1 className="mt-1 text-3xl font-black md:text-4xl" style={{ color: C.indigo }}>{title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: "#6B7280" }}>{subtitle}</p>
              {updatedAt && <p className="mt-3 text-xs font-semibold" style={{ color: "#8A8DA8" }}>Cập nhật lần cuối: {updatedAt}</p>}
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-black" style={{ color: C.indigo }}>{section.title}</h2>
                <div className="mt-3 space-y-2">
                  {section.body.map((paragraph, i) => (
                    <p key={i} className="text-sm leading-6" style={{ color: "#4B5563" }}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}

      <AppFooter {...footerHandlers} />
    </main>
  )
}