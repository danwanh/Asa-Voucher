import { useState } from "react"
import { Bell, Globe, Palette, LogOut } from "lucide-react"
import { C } from "@/utils/constants"

export function PartnerSettingsPage({ onLogout }: { onLogout: () => void }) {
  const [notifs, setNotifs] = useState({ order: true, voucher: true, report: false, system: true })
  const [lang, setLang] = useState("vi")

  const toggle = (k: keyof typeof notifs) => setNotifs((p) => ({ ...p, [k]: !p[k] }))

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: checked ? C.peach : "#D1D5DB" }}
    >
      <span className="absolute top-0.5 transition-all w-4 h-4 rounded-full bg-white shadow" style={{ left: checked ? "22px" : "2px" }} />
    </button>
  )

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-black" style={{ color: C.indigo }}>Cài đặt</h1>

      {/* Notifications */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5" style={{ color: C.indigo }} />
          <h2 className="font-black" style={{ color: C.indigo }}>Thông báo</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: "order", label: "Đơn hàng mới", desc: "Nhận thông báo khi có đơn hàng" },
            { key: "voucher", label: "Trạng thái Voucher", desc: "Duyệt, từ chối, hết hạn" },
            { key: "report", label: "Báo cáo", desc: "Báo cáo hàng tuần" },
            { key: "system", label: "Hệ thống", desc: "Thông báo từ Asa" },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#F0EDD8" }}>
              <div>
                <div className="text-sm font-bold" style={{ color: C.indigo }}>{n.label}</div>
                <div className="text-xs" style={{ color: "#8A8DA8" }}>{n.desc}</div>
              </div>
              <Toggle checked={notifs[n.key as keyof typeof notifs]} onChange={() => toggle(n.key as keyof typeof notifs)} />
            </div>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5" style={{ color: C.indigo }} />
          <h2 className="font-black" style={{ color: C.indigo }}>Ngôn ngữ</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[{ value: "vi", label: "Tiếng Việt 🇻🇳" }, { value: "en", label: "English 🇺🇸" }].map((l) => (
            <button key={l.value} onClick={() => setLang(l.value)} className="py-2.5 rounded-xl font-semibold text-sm" style={{ backgroundColor: lang === l.value ? C.indigo : C.eggshell, color: lang === l.value ? "white" : C.indigo }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5" style={{ color: C.indigo }} />
          <h2 className="font-black" style={{ color: C.indigo }}>Giao diện</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[{ v: "light", l: "Sáng" }, { v: "dark", l: "Tối" }, { v: "system", l: "Hệ thống" }].map((t) => (
            <button key={t.v} className="py-2.5 rounded-xl font-semibold text-sm" style={{ backgroundColor: t.v === "light" ? C.peach : C.eggshell, color: t.v === "light" ? "white" : C.indigo }}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button onClick={onLogout} className="w-full py-3 rounded-2xl font-bold border flex items-center justify-center gap-2" style={{ borderColor: "#FCEAEA", color: "#C0392B" }}>
        <LogOut className="w-4 h-4" /> Đăng xuất
      </button>
    </div>
  )
}
