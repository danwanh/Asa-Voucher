import { useState } from "react"
import { Search, Loader2, CheckCircle2, XCircle, QrCode, Info, ShieldCheck } from "lucide-react"
import { issuedVoucherService } from "@/services/issuedVoucherService"
import type { CheckVoucherResult } from "@/types"
import { C, fmt, STATUS_LABEL } from "@/utils/constants"

type CheckState = "idle" | "loading" | "success" | "error"
type ConfirmState = "idle" | "loading" | "success" | "error"

export function StaffCheckVoucherPage() {
  const [input, setInput] = useState("")
  const [state, setState] = useState<CheckState>("idle")
  const [result, setResult] = useState<CheckVoucherResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle")
  const [confirmMsg, setConfirmMsg] = useState("")

  async function handleCheck() {
    const code = input.trim()
    if (!code) return

    setState("loading")
    setResult(null)
    setErrorMsg("")

    try {
      const data = await issuedVoucherService.check(code)
      setResult(data)
      setState("success")
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Không thể kiểm tra voucher. Vui lòng thử lại."
      setErrorMsg(msg)
      setState("error")
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCheck()
  }

  function handleReset() {
    setInput("")
    setState("idle")
    setResult(null)
    setErrorMsg("")
    setConfirmState("idle")
    setConfirmMsg("")
  }

  async function handleConfirm() {
    if (!iv) return
    setConfirmState("loading")
    setConfirmMsg("")
    try {
      const res = await issuedVoucherService.confirm(iv.voucher_code)
      setConfirmMsg(res.message || "Xác nhận sử dụng voucher thành công")
      setConfirmState("success")
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Xác nhận thất bại. Vui lòng thử lại."
      setConfirmMsg(msg)
      setConfirmState("error")
    }
  }

  const iv = result?.issued_voucher
  const ownerName = iv?.order_items?.[0]?.orders?.users?.full_name || "—"
  const orderCode = iv?.order_items?.[0]?.orders?.order_code || "—"
  const orderAmount = iv?.order_items?.[0]?.orders?.total_amount
  const productName = iv?.voucher_products?.name || "—"
  const partnerName = iv?.voucher_products?.partners?.business_name || "—"

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* HEADER */}
      <h2 className="text-xl font-black" style={{ color: C.indigo }}>
        Kiểm tra Voucher
      </h2>

      {/* INPUT AREA */}
      <div className="bg-white rounded-2xl p-5 border shadow-sm" style={{ borderColor: "#E2DFC8" }}>
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="w-4 h-4" style={{ color: C.indigo }} />
          <span className="text-sm font-bold" style={{ color: C.indigo }}>
            Nhập mã voucher hoặc quét QR
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ví dụ: VCH-ABC123 hoặc URL từ QR code..."
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
            style={{ borderColor: "#E2DFC8" }}
            disabled={state === "loading"}
          />
          <button
            onClick={handleCheck}
            disabled={!input.trim() || state === "loading"}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: C.teal }}
          >
            {state === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ERROR STATE */}
      {state === "error" && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ backgroundColor: "#FEE2E2" }}>
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#B91C1C" }} />
          <div>
            <p className="text-sm font-bold" style={{ color: "#B91C1C" }}>Kiểm tra thất bại</p>
            <p className="text-sm mt-1" style={{ color: "#B91C1C" }}>{errorMsg}</p>
            <button onClick={handleReset} className="text-xs font-bold mt-2 underline" style={{ color: "#B91C1C" }}>
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS STATE */}
      {state === "success" && iv && (
        <div className="space-y-4">
          {/* Success banner */}
          <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: "#E8F5EE" }}>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#2D7A52" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "#2D7A52" }}>Voucher hợp lệ</p>
              <p className="text-xs mt-0.5" style={{ color: "#2D7A52" }}>
                Mã <strong>{iv.voucher_code}</strong> — trạng thái: {STATUS_LABEL[iv.status] || iv.status}
              </p>
            </div>
          </div>

          {/* Voucher info card */}
          <div className="bg-white rounded-2xl p-5 border shadow-sm space-y-4" style={{ borderColor: "#E2DFC8" }}>
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4" style={{ color: C.indigo }} />
              <span className="text-sm font-bold" style={{ color: C.indigo }}>Thông tin Voucher</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Row label="Mã voucher" value={iv.voucher_code} />
              <Row label="Trạng thái" value={<StatusBadge status={iv.status} />} />
              <Row label="Chương trình" value={productName} />
              <Row label="Đối tác" value={partnerName} />
              <Row label="Khách hàng" value={ownerName} />
              <Row label="Đơn hàng" value={orderCode} />
              {orderAmount != null && <Row label="Giá trị đơn" value={fmt(orderAmount)} />}
              <Row label="Ngày phát hành" value={iv.issued_date} />
              <Row label="Hết hạn" value={iv.expired_date} />
            </div>
          </div>

          {/* CONFIRM SECTION — chỉ hiện khi voucher active */}
          {iv.status === "active" && confirmState === "idle" && (
            <button
              onClick={handleConfirm}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ backgroundColor: C.teal }}
            >
              <ShieldCheck className="w-4 h-4" />
              Xác nhận sử dụng Voucher
            </button>
          )}

          {/* Confirm loading */}
          {confirmState === "loading" && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: C.teal }} />
              <span className="text-sm" style={{ color: "#8A8DA8" }}>Đang xác nhận...</span>
            </div>
          )}

          {/* Confirm success */}
          {confirmState === "success" && (
            <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ backgroundColor: "#E8F5EE" }}>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#2D7A52" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#2D7A52" }}>{confirmMsg}</p>
              </div>
            </div>
          )}

          {/* Confirm error */}
          {confirmState === "error" && (
            <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ backgroundColor: "#FEE2E2" }}>
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#B91C1C" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#B91C1C" }}>{confirmMsg}</p>
                <button onClick={() => { setConfirmState("idle"); setConfirmMsg("") }} className="text-xs font-bold mt-2 underline" style={{ color: "#B91C1C" }}>
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-xl text-sm font-bold border transition-all hover:bg-gray-50"
            style={{ borderColor: "#E2DFC8", color: C.indigo }}
          >
            Kiểm tra voucher khác
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold" style={{ color: "#8A8DA8" }}>{label}</p>
      <p className="mt-0.5 font-medium" style={{ color: C.indigo }}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    active: { bg: "#E8F5EE", text: "#2D7A52" },
    used: { bg: "#E0EEFF", text: "#1A5FAD" },
    expired: { bg: "#FCEAEA", text: "#C0392B" },
    refunded: { bg: "#FFF3CD", text: "#856404" },
  }
  const c = colorMap[status] || { bg: "#F3F4F6", text: "#6B7280" }
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {STATUS_LABEL[status] || status}
    </span>
  )
}
