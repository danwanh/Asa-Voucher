import { useState } from "react"
import { Bell, Globe, Moon, Shield, Sun, Trash2, LogOut, ChevronRight, Settings } from "lucide-react"
import { C } from "@/utils/constants"

interface Props {
  onLogout: () => void
}

export function CustomerSettingsPage({ onLogout }: Props) {
  const [notifs, setNotifs] = useState({ promo: true, order: true, system: false, email: true })
  const [language, setLanguage] = useState("vi")
  const [theme, setTheme] = useState("light")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Cài đặt</h1>

      {/* Notifications */}
      <Section title="Thông báo" icon={<Bell className="w-4 h-4" />}>
        {[
          { key: "promo", label: "Khuyến mãi & Ưu đãi", desc: "Nhận thông báo voucher mới, flash sale" },
          { key: "order", label: "Đơn hàng", desc: "Cập nhật trạng thái đơn hàng" },
          { key: "system", label: "Hệ thống", desc: "Thông báo bảo trì, cập nhật hệ thống" },
          { key: "email", label: "Email", desc: "Nhận thông báo qua email" },
        ].map((n) => (
          <div key={n.key} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: "#F3F4F6" }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: C.indigo }}>{n.label}</div>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>{n.desc}</div>
            </div>
            <ToggleSwitch
              checked={notifs[n.key as keyof typeof notifs]}
              onChange={(v) => setNotifs({ ...notifs, [n.key]: v })}
            />
          </div>
        ))}
      </Section>

      {/* Language */}
      <Section title="Ngôn ngữ" icon={<Globe className="w-4 h-4" />}>
        <div className="flex gap-2 py-2">
          {[{ value: "vi", label: "🇻🇳 Tiếng Việt" }, { value: "en", label: "🇬🇧 English" }].map((l) => (
            <button
              key={l.value}
              onClick={() => setLanguage(l.value)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
              style={{
                backgroundColor: language === l.value ? C.indigo : "transparent",
                color: language === l.value ? "white" : C.indigo,
                borderColor: language === l.value ? C.indigo : "#E5E7EB",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Theme */}
      <Section title="Giao diện" icon={<Moon className="w-4 h-4" />}>
        <div className="flex gap-2 py-2">
          {[{ value: "light", label: "Sáng", icon: <Sun className="w-4 h-4" /> }, { value: "dark", label: "Tối", icon: <Moon className="w-4 h-4" /> }, { value: "auto", label: "Tự động", icon: <Settings className="w-4 h-4" /> }].map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
              style={{
                backgroundColor: theme === t.value ? C.indigo : "transparent",
                color: theme === t.value ? "white" : C.indigo,
                borderColor: theme === t.value ? C.indigo : "#E5E7EB",
              }}
            >
              <span className="inline-flex items-center gap-1.5">{t.icon}{t.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Security */}
      <Section title="Bảo mật" icon={<Shield className="w-4 h-4" />}>
        {[
          { label: "Đổi mật khẩu", desc: "Cập nhật mật khẩu đăng nhập" },
          { label: "Xác thực 2 bước", desc: "Bảo vệ tài khoản bằng OTP" },
          { label: "Phiên đăng nhập", desc: "Quản lý các thiết bị đã đăng nhập" },
        ].map((item) => (
          <button key={item.label} className="flex items-center justify-between w-full py-3 border-b last:border-0 text-left" style={{ borderColor: "#F3F4F6" }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: C.indigo }}>{item.label}</div>
              <div className="text-xs" style={{ color: "#9CA3AF" }}>{item.desc}</div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "#D1D5DB" }} />
          </button>
        ))}
      </Section>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl p-5 border-2 mb-4" style={{ borderColor: "#FEE2E2" }}>
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />
          <h3 className="font-bold text-sm" style={{ color: "#EF4444" }}>Vùng nguy hiểm</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: "#6B7280" }}>Xóa tài khoản sẽ xóa vĩnh viễn tất cả dữ liệu của bạn. Hành động này không thể hoàn tác.</p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 rounded-xl text-sm font-bold border-2"
          style={{ borderColor: "#EF4444", color: "#EF4444" }}
        >
          Xóa tài khoản
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm border-2 hover:bg-red-50 transition-colors"
        style={{ borderColor: "#EF4444", color: "#EF4444" }}
      >
        <LogOut className="w-4 h-4" /> Đăng xuất
      </button>

      {/* Delete confirm dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#FEE2E2" }}>
                <Trash2 className="w-6 h-6" style={{ color: "#EF4444" }} />
              </div>
              <h3 className="font-black text-lg" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Xóa tài khoản?</h3>
              <p className="text-sm mt-2" style={{ color: "#6B7280" }}>Tất cả dữ liệu sẽ bị xóa vĩnh viễn. Bạn chắc chắn muốn tiếp tục?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Hủy</button>
              <button className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: "#EF4444" }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-black/5 mb-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: "#F3F4F6" }}>
        <span style={{ color: C.peach }}>{icon}</span>
        <h3 className="font-bold text-sm" style={{ color: C.indigo }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: checked ? C.teal : "#D1D5DB" }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform"
        style={{ transform: `translateX(${checked ? "22px" : "2px"})` }}
      />
    </button>
  )
}
