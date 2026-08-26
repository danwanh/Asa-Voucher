import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, XCircle, Info, ShieldCheck } from "lucide-react"
import { issuedVoucherService } from "@/services/issuedVoucherService"
import type { CheckVoucherResult } from "@/types"
import { C, fmtDate, STATUS_LABEL } from "@/utils/constants"
import { QRScanPage } from "@/pages/staff/QRScanPage"

type CheckState = "idle" | "loading" | "success" | "error"
type ConfirmState = "idle" | "loading" | "success" | "error"

export function VerifyVoucherPage({ initialCode = "", branchId = "" }: { initialCode?: string; branchId?: string }) {
  const [state, setState] = useState<CheckState>("idle")
  const [result, setResult] = useState<CheckVoucherResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle")
  const [confirmMsg, setConfirmMsg] = useState("")

  const iv = result?.issued_voucher ?? null
  const productName = iv?.voucher_products?.name || "—"
  const partnerName = iv?.voucher_products?.partners?.business_name || "—"
  const quantity = iv?.voucher_products?.remaining_quantity ?? "—"
  const branchNames = result?.eligible_branches?.length
    ? result.eligible_branches.map((b) => b.branch_name).join(", ")
    : "Tất cả chi nhánh"
  const branchEligible = Boolean(branchId) && Boolean(result?.eligible_branch_ids?.includes(branchId))

  async function runCheck(codeInput: string) {
    setState("loading")
    setResult(null)
    setErrorMsg("")
    setConfirmState("idle")
    setConfirmMsg("")
    try {
      const data = await issuedVoucherService.check(codeInput)
      setResult(data)
      setState("success")
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Không thể kiểm tra voucher. Vui lòng thử lại."
      setErrorMsg(msg)
      setState("error")
    }
  }

  useEffect(() => {
    if (!initialCode) return
    setState("loading")
    issuedVoucherService.check(initialCode)
      .then((data) => {
        setResult(data)
        setState("success")
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Không thể kiểm tra voucher. Vui lòng thử lại."
        setErrorMsg(msg)
        setState("error")
      })
  }, [initialCode])

  async function handleConfirm() {
    if (!iv) return
    setConfirmState("loading")
    setConfirmMsg("")
    try {
      await issuedVoucherService.confirm(iv.voucher_code)
      setConfirmState("success")
      setConfirmMsg("Voucher đã chuyển sang trạng thái \"Đã sử dụng\"")
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Không thể xác nhận voucher. Vui lòng thử lại."
      setConfirmMsg(msg)
      setConfirmState("error")
    }
  }

  function handleReset() {
    setState("idle")
    setResult(null)
    setErrorMsg("")
    setConfirmState("idle")
    setConfirmMsg("")
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* HEADER */}
      <h2 className="text-xl font-black" style={{ color: C.indigo }}>Quét QR Code</h2>

      {/* SCANNER + MANUAL INPUT */}
      <QRScanPage onVoucherFound={runCheck} title="" embedded showManualInput />

      {/* LOADING STATE */}
      {state === "loading" && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: C.teal }} />
          <span className="text-sm" style={{ color: "#8A8DA8" }}>Đang kiểm tra...</span>
        </div>
      )}

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
              <Row label="Tên đối tác" value={partnerName} />
              <Row label="Số lượng" value={quantity} />
              <Row label="Chi nhánh áp dụng" value={branchNames} />
              <Row label="Ngày phát hành" value={fmtDate(iv.issued_date)} />
              <Row label="Hết hạn" value={fmtDate(iv.expired_date)} />
            </div>
          </div>

          {/* CONFIRM SECTION */}
          {confirmState === "idle" && (
            <button
              onClick={handleConfirm}
              disabled={!branchEligible}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: C.teal }}
            >
              <ShieldCheck className="w-4 h-4" />
              {!branchId ? "Chưa có chi nhánh" : !branchEligible ? "Không thuộc chi nhánh này" : "Xác nhận sử dụng Voucher"}
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
                <p className="text-sm font-bold" style={{ color: "#2D7A52" }}>Xác nhận thành công</p>
                <p className="text-xs mt-1" style={{ color: "#2D7A52" }}>{confirmMsg}</p>
              </div>
            </div>
          )}

          {/* Confirm error */}
          {confirmState === "error" && (
            <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ backgroundColor: "#FEE2E2" }}>
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#B91C1C" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#B91C1C" }}>Xác nhận thất bại</p>
                <p className="text-xs mt-1" style={{ color: "#B91C1C" }}>{confirmMsg}</p>
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
            Quét voucher khác
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
    revoked: { bg: "#FFF3CD", text: "#856404" },
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