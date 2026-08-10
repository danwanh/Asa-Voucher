import { useEffect, useId, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { FileText, Tag, Image, Bell, CheckCircle2, XCircle, Clock } from "lucide-react"
import { C } from "@/utils/constants"
import type { Voucher } from "@/types"
import { voucherService } from "@/services/voucherService"

const APPROVAL_TREND = [
  { week: "T1", approved: 12, rejected: 3 },
  { week: "T2", approved: 18, rejected: 5 },
  { week: "T3", approved: 14, rejected: 2 },
  { week: "T4", approved: 22, rejected: 4 },
  { week: "T5", approved: 19, rejected: 6 },
  { week: "T6", approved: 25, rejected: 3 },
  { week: "T7", approved: 21, rejected: 2 },
]

const CONTENT_TYPES = [
  { name: "Banner", value: 8, color: C.peach },
  { name: "Thông báo", value: 5, color: C.teal },
  { name: "Bài viết", value: 12, color: C.apricot },
  { name: "Chính sách", value: 4, color: C.indigo },
]

export function AdminContentDashboardPage() {
  const uid = useId().replace(/:/g, "")
  const [vouchers, setVouchers] = useState<Voucher[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadVouchers() {
      try {
        const items = await voucherService.listPublicVouchers({ limit: 100 })
        if (!isMounted) return
        setVouchers(items)
      } catch {
        if (!isMounted) return
        setVouchers([])
      }
    }

    loadVouchers()
    return () => {
      isMounted = false
    }
  }, [])

  const pending   = vouchers.filter((v) => v.status === "pending").length
  const approved  = vouchers.filter((v) => v.status === "active").length
  const rejected  = vouchers.filter((v) => v.status === "rejected").length
  const allContent = CONTENT_TYPES.reduce((s, t) => s + t.value, 0)

  const kpis = [
    { label: "Voucher chờ duyệt",  value: pending,     icon: <Clock className="w-5 h-5" />,        color: C.apricot, delta: "Cần xử lý" },
    { label: "Voucher đã duyệt",   value: approved,    icon: <CheckCircle2 className="w-5 h-5" />,  color: C.teal,    delta: "Đang hiển thị" },
    { label: "Voucher từ chối",    value: rejected,    icon: <XCircle className="w-5 h-5" />,       color: C.peach,   delta: "Đã phản hồi" },
    { label: "Nội dung active",    value: allContent,  icon: <FileText className="w-5 h-5" />,      color: C.indigo,  delta: "Banner + bài viết" },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Dashboard Nội dung</h1>
        <p className="text-sm mt-1" style={{ color: "#8A8DA8" }}>Thống kê voucher chờ duyệt và nội dung hiển thị trên hệ thống</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>{k.label}</p>
                <p className="text-3xl font-black mt-1" style={{ color: C.indigo }}>{k.value}</p>
                <p className="text-xs mt-1 font-semibold" style={{ color: k.color }}>{k.delta}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: k.color + "18" }}>
                <span style={{ color: k.color }}>{k.icon}</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-5" style={{ backgroundColor: k.color }} />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Approval trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-1" style={{ color: C.indigo }}>Xu hướng duyệt voucher (7 tuần)</h3>
          <p className="text-xs mb-4" style={{ color: "#8A8DA8" }}>Số lượng duyệt và từ chối theo tuần</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={APPROVAL_TREND} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDD8" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8A8DA8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
              <Bar dataKey="approved" name="Đã duyệt" fill={C.teal} radius={[4, 4, 0, 0]} />
              <Bar dataKey="rejected" name="Từ chối" fill={C.peach} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Content type distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-black mb-4" style={{ color: C.indigo }}>Phân loại nội dung</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={CONTENT_TYPES} cx="50%" cy="50%" innerRadius={38} outerRadius={65} dataKey="value" paddingAngle={3}>
                {CONTENT_TYPES.map((e) => <Cell key={`cell-${e.name}`} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} formatter={(v: number) => [`${v} mục`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {CONTENT_TYPES.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <span style={{ color: "#6B7280" }}>{c.name}</span>
                </div>
                <span className="font-bold" style={{ color: C.indigo }}>{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending vouchers quick list */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black" style={{ color: C.indigo }}>Voucher đang chờ duyệt</h3>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: C.apricot + "30", color: "#92400E" }}>
            {pending} chờ xử lý
          </span>
        </div>
        <div className="space-y-2">
          {vouchers.filter((v) => v.status === "pending").slice(0, 5).map((v) => (
            <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors" style={{ backgroundColor: "#FAFAF7" }}>
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                <img src={v.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/40x40/E07A5F/white?text=V" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: C.indigo }}>{v.title}</div>
                <div className="text-xs" style={{ color: "#8A8DA8" }}>{v.partnerName} · {v.category}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-black" style={{ color: C.peach }}>{v.price.toLocaleString("vi")}đ</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" style={{ color: C.apricot }} />
                  <span className="text-xs" style={{ color: C.apricot }}>Chờ duyệt</span>
                </div>
              </div>
            </div>
          ))}
          {pending === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: "#8A8DA8" }}>Không có voucher nào chờ duyệt</div>
          )}
        </div>
      </div>
    </div>
  )
}
