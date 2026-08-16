import Link from "next/link"
import { FileText, ShieldCheck, Tag } from "lucide-react"
import { C } from "@/utils/constants"

type LegalSection = {
  title: string
  body: string[]
}

interface LegalInfoPageProps {
  kind: "terms" | "policy" | "privacy"
}

const legalContent: Record<LegalInfoPageProps["kind"], {
  title: string
  eyebrow: string
  subtitle: string
  icon: "terms" | "policy" | "privacy"
  sections: LegalSection[]
}> = {
  terms: {
    title: "Điều khoản dịch vụ",
    eyebrow: "ASA Voucher",
    subtitle: "Các điều kiện sử dụng nền tảng, mua voucher, quản lý đơn hàng và trách nhiệm của người dùng khi giao dịch trên ASA Voucher.",
    icon: "terms",
    sections: [
      {
        title: "1. Phạm vi áp dụng",
        body: [
          "Điều khoản này áp dụng cho khách hàng, đối tác và nhân sự vận hành khi truy cập hoặc sử dụng ASA Voucher.",
          "Khi tạo tài khoản, đăng voucher, đặt mua voucher hoặc sử dụng mã voucher, bạn xác nhận đã đọc và đồng ý với các điều khoản này.",
        ],
      },
      {
        title: "2. Tài khoản và thông tin",
        body: [
          "Người dùng chịu trách nhiệm về tính chính xác của thông tin đăng ký, thông tin nhận voucher và bảo mật tài khoản.",
          "ASA Voucher có thể tạm khóa quyền truy cập nếu phát hiện hành vi gian lận, lạm dụng khuyến mãi hoặc vi phạm quy định vận hành.",
        ],
      },
      {
        title: "3. Mua và sử dụng voucher",
        body: [
          "Voucher chỉ có hiệu lực trong thời gian, khu vực, chi nhánh và điều kiện áp dụng được hiển thị trong chi tiết voucher.",
          "Mỗi voucher có thể có giới hạn số lượng, thời hạn sử dụng, hướng dẫn dùng và điều kiện riêng do đối tác cung cấp.",
          "Khách hàng cần kiểm tra kỹ thông tin trước khi thanh toán và xuất trình mã QR hoặc mã voucher hợp lệ khi sử dụng tại cửa hàng.",
        ],
      },
      {
        title: "4. Thanh toán, hủy và hoàn tiền",
        body: [
          "Đơn hàng chỉ được phát hành voucher sau khi hệ thống ghi nhận thanh toán thành công.",
          "Yêu cầu hủy hoặc hoàn tiền được xử lý theo trạng thái đơn hàng, trạng thái sử dụng voucher và quy trình kiểm tra khiếu nại.",
          "Voucher đã sử dụng hoặc hết điều kiện hoàn tiền có thể bị từ chối hoàn tiền.",
        ],
      },
      {
        title: "5. Trách nhiệm của đối tác",
        body: [
          "Đối tác chịu trách nhiệm về tính đúng của giá, mô tả, số lượng, thời hạn, điều kiện áp dụng và khả năng phục vụ voucher đã đăng.",
          "ASA Voucher có quyền tạm ẩn, khóa hoặc yêu cầu chỉnh sửa voucher nếu nội dung không rõ ràng, sai lệch hoặc gây rủi ro cho khách hàng.",
        ],
      },
      {
        title: "6. Liên hệ",
        body: [
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
        title: "1. Chính sách mua voucher",
        body: [
          "Khách hàng có thể mua voucher đang hiển thị công khai, còn số lượng và còn thời gian bán trên nền tảng.",
          "Giá bán, mức giảm, thời hạn và điều kiện áp dụng được lấy theo thông tin tại thời điểm tạo đơn hàng.",
        ],
      },
      {
        title: "2. Chính sách phát hành voucher",
        body: [
          "Sau khi thanh toán thành công, hệ thống phát hành mã voucher hoặc QR cho tài khoản mua hàng.",
          "Mỗi mã voucher có trạng thái riêng và chỉ được chấp nhận khi còn hiệu lực, chưa bị hủy và chưa sử dụng quá điều kiện cho phép.",
        ],
      },
      {
        title: "3. Chính sách hủy và hoàn tiền",
        body: [
          "Yêu cầu hoàn tiền được xem xét khi voucher chưa sử dụng, giao dịch còn đủ điều kiện xử lý và có căn cứ hợp lệ từ khách hàng hoặc đối tác.",
          "Các trường hợp đối tác không phục vụ đúng cam kết, voucher lỗi phát hành hoặc giao dịch thanh toán bất thường sẽ được kiểm tra trước khi hoàn tiền.",
          "Thời gian hoàn tiền phụ thuộc vào cổng thanh toán và ngân hàng xử lý giao dịch.",
        ],
      },
      {
        title: "4. Chính sách khiếu nại",
        body: [
          "Khách hàng có thể gửi khiếu nại từ đơn hàng hoặc voucher đã phát hành nếu gặp lỗi sử dụng, sai thông tin hoặc cửa hàng từ chối không hợp lệ.",
          "ASA Voucher sẽ đối chiếu dữ liệu đơn hàng, trạng thái voucher và phản hồi từ đối tác trước khi đưa ra hướng xử lý.",
        ],
      },
      {
        title: "5. Thay đổi chính sách",
        body: [
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
        title: "1. Thông tin được thu thập",
        body: [
          "ASA Voucher có thể thu thập họ tên, email, số điện thoại, vai trò tài khoản, thông tin đơn hàng, lịch sử thanh toán và dữ liệu sử dụng voucher.",
          "Đối với đối tác, hệ thống có thể lưu thông tin doanh nghiệp, người đại diện, chi nhánh và dữ liệu voucher đã đăng.",
        ],
      },
      {
        title: "2. Mục đích sử dụng",
        body: [
          "Thông tin được dùng để xác thực tài khoản, xử lý đơn hàng, phát hành voucher, hỗ trợ khách hàng, xử lý khiếu nại và cải thiện chất lượng dịch vụ.",
          "ASA Voucher không bán thông tin cá nhân của người dùng cho bên thứ ba.",
        ],
      },
      {
        title: "3. Chia sẻ dữ liệu",
        body: [
          "Dữ liệu cần thiết có thể được chia sẻ với đối tác cung cấp voucher, cổng thanh toán hoặc đơn vị hỗ trợ kỹ thuật để hoàn tất giao dịch.",
          "Việc chia sẻ được giới hạn trong phạm vi cần thiết cho vận hành, đối soát, hỗ trợ và tuân thủ quy định.",
        ],
      },
      {
        title: "4. Bảo mật và lưu trữ",
        body: [
          "ASA Voucher áp dụng kiểm soát truy cập, phân quyền tài khoản và ghi nhận nhật ký để giảm rủi ro truy cập trái phép.",
          "Dữ liệu được lưu trong thời gian cần thiết cho giao dịch, kế toán, hỗ trợ khách hàng và nghĩa vụ pháp lý liên quan.",
        ],
      },
      {
        title: "5. Quyền của người dùng",
        body: [
          "Người dùng có thể yêu cầu cập nhật thông tin tài khoản, kiểm tra dữ liệu liên quan đến đơn hàng hoặc đề nghị hỗ trợ về quyền riêng tư.",
          "Yêu cầu hỗ trợ bảo mật có thể gửi tới support@asavoucher.vn.",
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

export function LegalInfoPage({ kind }: LegalInfoPageProps) {
  const content = legalContent[kind]
  const Icon = iconMap[content.icon]

  return (
    <main className="min-h-screen" style={{ backgroundColor: C.content, fontFamily: "'Nunito', sans-serif" }}>
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-black" style={{ color: C.indigo }}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: C.peach }}>
              A
            </span>
            ASA Voucher
          </Link>
          <Link href="/vouchers" className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: C.peach }}>
            Xem voucher
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${C.peach}18`, color: C.peach }}>
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <div className="text-sm font-black uppercase tracking-wide" style={{ color: C.peach }}>{content.eyebrow}</div>
            <h1 className="mt-1 text-3xl font-black md:text-4xl" style={{ color: C.indigo }}>{content.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6" style={{ color: "#6B7280" }}>{content.subtitle}</p>
            <p className="mt-3 text-xs font-semibold" style={{ color: "#8A8DA8" }}>Cập nhật lần cuối: 16/08/2026</p>
          </div>
        </div>

        <div className="space-y-4">
          {content.sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black" style={{ color: C.indigo }}>{section.title}</h2>
              <div className="mt-3 space-y-2">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-6" style={{ color: "#4B5563" }}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}
