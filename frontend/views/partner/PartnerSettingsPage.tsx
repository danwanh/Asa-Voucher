import { useState } from "react"
import { Globe, Palette, LogOut } from "lucide-react"
import { C } from "@/utils/constants"

export function PartnerSettingsPage({ onLogout }: { onLogout: () => void }) {
  const [lang, setLang] = useState("vi")

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
