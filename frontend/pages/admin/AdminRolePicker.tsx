import { Users, TrendingUp, FileText, Tag, ArrowRight, ShieldCheck } from "lucide-react"
import { C } from "@/utils/constants"
import type { AppUser, AdminSubRole } from "@/types"

export type { AdminSubRole }

interface RoleCard {
  id: AdminSubRole
  emoji: string
  name: string
  subtitle: string
  description: string
  accent: string
  accentLight: string
  modules: { icon: React.ReactNode; label: string }[]
}

const ROLES: RoleCard[] = [
  {
    id: "system-hr",
    emoji: "🛡️",
    name: "System & HR Admin",
    subtitle: "Quản trị Hệ thống & Nhân sự",
    description: "Kiểm soát tài khoản người dùng, xét duyệt đối tác mới, quản lý nhân viên toàn hệ thống.",
    accent: "#3D405B",
    accentLight: "#ECEEF5",
    modules: [
      { icon: <Users className="w-4 h-4" />, label: "Quản lý Người dùng" },
      { icon: <ShieldCheck className="w-4 h-4" />, label: "Duyệt Đối tác" },
      { icon: <Users className="w-4 h-4" />, label: "Quản lý Nhân viên" },
    ],
  },
  {
    id: "biz-ops",
    emoji: "📊",
    name: "Business Operations Admin",
    subtitle: "Quản trị Vận hành Kinh doanh",
    description: "Theo dõi doanh thu tài chính, xét duyệt voucher, quản lý toàn bộ đơn hàng giao dịch.",
    accent: "#E07A5F",
    accentLight: "#FDF0EC",
    modules: [
      { icon: <TrendingUp className="w-4 h-4" />, label: "Dashboard Tài chính" },
      { icon: <Tag className="w-4 h-4" />, label: "Duyệt Voucher" },
      { icon: <FileText className="w-4 h-4" />, label: "Quản lý Đơn hàng" },
    ],
  },
  {
    id: "content-tech",
    emoji: "🛠️",
    name: "Content & Tech Admin",
    subtitle: "Quản trị Nội dung & Kỹ thuật",
    description: "Quản lý banner, thông báo, chính sách hiển thị. Giám sát nhật ký bảo mật hệ thống.",
    accent: "#81B29A",
    accentLight: "#EBF5F0",
    modules: [
      { icon: <FileText className="w-4 h-4" />, label: "Quản lý Nội dung" },
      { icon: <Tag className="w-4 h-4" />, label: "Danh mục & Phản hồi" },
      { icon: <ShieldCheck className="w-4 h-4" />, label: "Nhật ký Bảo mật" },
    ],
  },
]

interface Props {
  user: AppUser
  onSelect: (role: AdminSubRole) => void
  onLogout: () => void
}

export function AdminRolePicker({ user, onSelect, onLogout }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: C.eggshell, fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="text-center mb-10 max-w-xl">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border text-xs font-bold" style={{ backgroundColor: `${C.indigo}10`, borderColor: `${C.indigo}20`, color: C.indigo }}>
          <ShieldCheck className="w-3.5 h-3.5" /> Hệ thống quản trị ASA Voucher
        </div>
        <h1 className="text-3xl font-black mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
          Chọn vai trò quản trị
        </h1>
        <p className="text-sm" style={{ color: "#6B7280" }}>
          Xin chào <strong style={{ color: C.indigo }}>{user.name}</strong>. Mỗi vai trò cung cấp giao diện và quyền truy cập phù hợp.
        </p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl mb-8">
        {ROLES.map((role) => (
          <button
            key={role.id}
            onClick={() => onSelect(role.id)}
            className="text-left bg-white rounded-3xl p-6 border-2 hover:shadow-lg transition-all group relative overflow-hidden"
            style={{ borderColor: "#E5E7EB" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = role.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
          >
            {/* Background accent blob */}
            <div
              className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: role.accent, filter: "blur(30px)" }}
            />

            {/* Emoji badge */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 transition-transform group-hover:scale-110"
              style={{ backgroundColor: role.accentLight }}
            >
              {role.emoji}
            </div>

            {/* Title */}
            <div className="font-black text-base mb-0.5" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>
              {role.name}
            </div>
            <div className="text-xs font-semibold mb-3" style={{ color: role.accent }}>
              {role.subtitle}
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: "#6B7280" }}>
              {role.description}
            </p>

            {/* Module list */}
            <div className="space-y-1.5 mb-4">
              {role.modules.map((m) => (
                <div key={m.label} className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#4B5563" }}>
                  <span style={{ color: role.accent }}>{m.icon}</span>
                  {m.label}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div
              className="flex items-center gap-1.5 text-xs font-black transition-all"
              style={{ color: role.accent }}
            >
              Vào dashboard <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Frame info */}
      <div className="flex flex-col items-center gap-3 max-w-xl text-center">
        <p className="text-xs" style={{ color: "#9CA3AF" }}>
          Mỗi khung quản trị được tách biệt hoàn toàn theo nhiệm vụ. Bạn có thể chuyển đổi vai trò bất kỳ lúc nào.
        </p>
        <div className="flex items-center gap-3">
          {ROLES.map((r) => (
            <div key={r.id} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#9CA3AF" }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.accent }} />
              {r.emoji}
            </div>
          ))}
        </div>
        <button onClick={onLogout} className="text-xs font-semibold hover:underline" style={{ color: "#9CA3AF" }}>
          Đăng xuất khỏi hệ thống
        </button>
      </div>
    </div>
  )
}
