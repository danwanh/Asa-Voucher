import { useState } from "react"
import { Search, QrCode, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { C, fmtDate } from "@/utils/constants"
import { issuedVoucherService, type IssuedVoucherResult } from "@/services/issuedVoucherService"

type VerifyResult = "idle" | "valid" | "used" | "invalid" | "expired"

export function VerifyVoucherPage({ initialCode = "", branchId = "" }: { initialCode?: string; branchId?: string }) {
  const [code, setCode] = useState(initialCode)
  const [result, setResult] = useState<VerifyResult>("idle")
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [voucher, setVoucher] = useState<IssuedVoucherResult | null>(null)

  const handleVerify = async () => {
    if (!code.trim()) return
    setLoading(true)
    setConfirmed(false)
    setVoucher(null)
    try {
      const response = await issuedVoucherService.validate(code.trim())
      setVoucher(response)
      setResult(response.redeemable ? "valid" : response.issued_voucher.status === "used" ? "used" : response.issued_voucher.status === "expired" ? "expired" : "invalid")
    } catch {
      setResult("invalid")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!voucher || !branchId || !voucher.eligible_branch_ids.includes(branchId)) return
    setShowConfirmDialog(false)
    setLoading(true)
    try {
      await issuedVoucherService.redeem(voucher.issued_voucher.voucher_code)
      setConfirmed(true)
    } catch {
      setResult("invalid")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setCode(""); setResult("idle"); setConfirmed(false); setVoucher(null) }

  const resultConfig = {
    valid: { bg: "#E8F5EE", border: C.teal, text: "#2D7A52", icon: <CheckCircle className="w-6 h-6" />, label: "Voucher hợp lệ", desc: "Voucher này hợp lệ và có thể sử dụng." },
    used: { bg: "#E0EEFF", border: "#3B82F6", text: "#1A5FAD", icon: <AlertCircle className="w-6 h-6" />, label: "Voucher đã sử dụng", desc: "Voucher này đã được sử dụng trước đó." },
    expired: { bg: "#FFF3CD", border: "#F59E0B", text: "#856404", icon: <AlertCircle className="w-6 h-6" />, label: "Voucher hết hạn", desc: "Voucher này đã quá hạn sử dụng." },
    invalid: { bg: "#FCEAEA", border: C.peach, text: "#C0392B", icon: <XCircle className="w-6 h-6" />, label: "Voucher không hợp lệ", desc: "Mã Voucher không tồn tại trong hệ thống." },
    idle: { bg: "", border: "", text: "", icon: null, label: "", desc: "" },
  }

  const cfg = resultConfig[result]

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo }}>Kiểm tra Voucher</h1>

      {/* Input */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5" style={{ color: C.indigo }} />
          <h2 className="font-bold" style={{ color: C.indigo }}>Nhập mã Voucher</h2>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8A8DA8" }} />
          <input
            className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none font-mono font-bold tracking-widest"
            style={{ borderColor: "#E2DFC8", fontFamily: "'Inter', monospace" }}
            placeholder="ASA-XXXXXXX"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setResult("idle"); setConfirmed(false) }}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleVerify}
            disabled={!code.trim() || loading}
            className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
            style={{ backgroundColor: !code.trim() ? "#D1D5DB" : C.indigo }}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Đang kiểm tra..." : "Kiểm tra"}
          </button>
          <button onClick={reset} className="px-4 py-2.5 rounded-xl font-bold border text-sm" style={{ borderColor: "#E2DFC8", color: "#8A8DA8" }}>
            Làm mới
          </button>
        </div>

      </div>

      {/* Result */}
      {result !== "idle" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-3" style={{ backgroundColor: cfg.bg, borderColor: cfg.border + "40" }}>
            <div style={{ color: cfg.text }}>{cfg.icon}</div>
            <div>
              <div className="font-black text-sm" style={{ color: cfg.text }}>{cfg.label}</div>
              <div className="text-xs" style={{ color: cfg.text + "AA" }}>{cfg.desc}</div>
            </div>
          </div>

          {result === "valid" && voucher && !confirmed && (
            <div className="p-5">
              <div className="flex items-start gap-4 mb-5">
                <div>
                  <div className="font-black text-sm" style={{ color: C.indigo }}>{voucher.issued_voucher.voucher_products?.name ?? "Voucher"}</div>
                  <code className="text-xs font-bold mt-2 block" style={{ color: C.indigo, fontFamily: "'Inter', monospace" }}>{voucher.issued_voucher.voucher_code}</code>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                {[
                  { label: "Mã voucher", value: voucher.issued_voucher.voucher_code },
                  { label: "Ngày hết hạn", value: fmtDate(voucher.issued_voucher.expired_date) },
                  { label: "Chi nhánh", value: voucher.eligible_branch_ids.includes(branchId) ? "Được phép sử dụng" : "Không thuộc chi nhánh này" },
                ].map((info) => (
                  <div key={info.label} className="p-2 rounded-lg" style={{ backgroundColor: C.eggshell }}>
                    <div style={{ color: "#8A8DA8" }}>{info.label}</div>
                    <div className="font-bold mt-0.5" style={{ color: C.indigo }}>{info.value}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!branchId || !voucher.eligible_branch_ids.includes(branchId) || loading}
                className="w-full py-3 rounded-xl font-bold text-white"
                style={{ backgroundColor: !branchId || !voucher.eligible_branch_ids.includes(branchId) ? "#D1D5DB" : C.teal }}
              >
                {!branchId ? "Chưa có chi nhánh" : !voucher.eligible_branch_ids.includes(branchId) ? "Không thuộc chi nhánh này" : loading ? "Đang xác nhận..." : "Xác nhận sử dụng"}
              </button>
            </div>
          )}

          {result === "valid" && confirmed && (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: C.teal }} />
              <div className="font-black text-lg mb-1" style={{ color: C.indigo }}>Xác nhận thành công!</div>
              <div className="text-sm" style={{ color: "#8A8DA8" }}>Voucher đã chuyển sang trạng thái "Đã sử dụng"</div>
              <button onClick={reset} className="mt-4 px-6 py-2.5 rounded-xl font-bold text-white text-sm" style={{ backgroundColor: C.indigo }}>
                Kiểm tra tiếp
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
            <h3 className="font-black text-lg mb-2" style={{ color: C.indigo }}>Xác nhận sử dụng Voucher?</h3>
            <p className="text-sm mb-6" style={{ color: "#8A8DA8" }}>
              Voucher sẽ chuyển sang trạng thái <strong>"Đã sử dụng"</strong>. Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button onClick={handleConfirm} className="flex-1 py-2.5 rounded-xl font-bold text-white" style={{ backgroundColor: C.teal }}>Xác nhận</button>
              <button onClick={() => setShowConfirmDialog(false)} className="flex-1 py-2.5 rounded-xl font-bold border" style={{ borderColor: "#E2DFC8", color: C.indigo }}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
