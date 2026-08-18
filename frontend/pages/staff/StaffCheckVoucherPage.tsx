import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, XCircle, Info, ShieldCheck, ScanLine, PlusCircle, Tag } from "lucide-react"
import { issuedVoucherService } from "@/services/issuedVoucherService"
import { voucherService } from "@/services/voucherService"
import type { CheckVoucherResult, Voucher } from "@/types"
import { C, fmt, fmtDate, STATUS_LABEL } from "@/utils/constants"
import { MockQR } from "@/components/MockQR"
import { QRScanPage } from "@/pages/staff/QRScanPage"

const FALLBACK = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop"

type CheckState = "idle" | "loading" | "success" | "error"
type ConfirmState = "idle" | "loading" | "success" | "error"

export function StaffCheckVoucherPage({ branchId = "" }: { branchId?: string }) {
  const [state, setState] = useState<CheckState>("idle")
  const [result, setResult] = useState<CheckVoucherResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle")
  const [confirmMsg, setConfirmMsg] = useState("")

  const [approvedVouchers, setApprovedVouchers] = useState<Voucher[]>([])
  const [vouchersLoading, setVouchersLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [testCode, setTestCode] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const items = await voucherService.listMyVouchers({ page: 1, limit: 100 })
        if (!cancelled) setApprovedVouchers(items.filter((v) => v.status === "active"))
      } catch {
        // ignore list errors — the input/check flow still works
      } finally {
        if (!cancelled) setVouchersLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function runCheck(codeInput: string) {
    setState("loading")
    setResult(null)
    setErrorMsg("")
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

  function handleReset() {
    setState("idle")
    setResult(null)
    setErrorMsg("")
    setConfirmState("idle")
    setConfirmMsg("")
    setTestCode(null)
  }

  async function handleGenerateTest(v: Voucher) {
    setGeneratingId(v.id)
    try {
      const res = await issuedVoucherService.generateTestCode(v.id)
      const code = res.test_code
      setTestCode(code)
      await runCheck(code)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Không thể tạo mã thử"
      setErrorMsg(msg)
      setState("error")
    } finally {
      setGeneratingId(null)
    }
  }

  function handleScanFound(code: string) {
    setTestCode(null)
    void runCheck(code)
  }

  async function handleConfirm() {
    if (!iv || result?.is_test) return
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
  const productName = iv?.voucher_products?.name || "—"
  const partnerName = iv?.voucher_products?.partners?.business_name || "—"
  const isTest = Boolean(result?.is_test)
  const quantity = iv?.voucher_products?.remaining_quantity ?? "—"
  const branchNames = result?.eligible_branches?.length
    ? result.eligible_branches.map((b) => b.branch_name).join(", ")
    : "Tất cả chi nhánh"
  const branchEligible = Boolean(branchId) && Boolean(result?.eligible_branch_ids?.includes(branchId))

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* HEADER */}
      <h2 className="text-xl font-black" style={{ color: C.indigo }}>
        Kiểm tra Voucher
      </h2>

      {/* APPROVED VOUCHERS — create test code */}
      <div className="bg-white rounded-2xl p-5 border shadow-sm" style={{ borderColor: "#E2DFC8" }}>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4" style={{ color: C.indigo }} />
          <span className="text-sm font-bold" style={{ color: C.indigo }}>
            Voucher đã duyệt — chọn để tạo mã thử
          </span>
        </div>
        {vouchersLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: C.teal }} />
            <span className="ml-2 text-xs" style={{ color: "#8A8DA8" }}>Đang tải voucher...</span>
          </div>
        ) : approvedVouchers.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "#9CA3AF" }}>Chưa có voucher nào đang bán</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {approvedVouchers.map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "#E2DFC8" }}>
                <img
                  src={v.image || FALLBACK}
                  alt={v.title}
                  className="w-12 h-10 rounded-lg object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: C.indigo }}>{v.title}</div>
                  <div className="text-xs" style={{ color: "#8A8DA8" }}>
                    {v.partnerName} · {fmt(v.price)} · HSD {fmtDate(v.validTo)}
                  </div>
                </div>
                <button
                  onClick={() => handleGenerateTest(v)}
                  disabled={generatingId === v.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white shrink-0 disabled:opacity-40"
                  style={{ backgroundColor: C.teal }}
                >
                  {generatingId === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  Tạo mã thử
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TEST CODE PANEL */}
      {testCode && (
        <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: "#F0EDF8" }}>
          <div className="flex-shrink-0"><MockQR code={testCode} size={96} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold" style={{ color: "#6B46C1" }}>Mã thử nghiệm</div>
            <code className="block text-xs font-mono font-bold break-all mt-1" style={{ color: "#6B46C1" }}>{testCode}</code>
            <p className="text-xs mt-1" style={{ color: "#6B46C1" }}>Mã thử — không ảnh hưởng số lượng bán</p>
          </div>
        </div>
      )}

      {/* SCANNER */}
      <QRScanPage onVoucherFound={handleScanFound} title="" embedded showManualInput />

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
          <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: isTest ? "#F0EDF8" : "#E8F5EE" }}>
            {isTest ? (
              <ScanLine className="w-5 h-5 flex-shrink-0" style={{ color: "#6B46C1" }} />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#2D7A52" }} />
            )}
            <div>
              <p className="text-sm font-bold" style={{ color: isTest ? "#6B46C1" : "#2D7A52" }}>
                {isTest ? "Mã kiểm tra (thử nghiệm)" : "Voucher hợp lệ"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: isTest ? "#6B46C1" : "#2D7A52" }}>
                {isTest
                  ? "Mã thử — không ảnh hưởng số lượng bán"
                  : <>Mã <strong>{iv.voucher_code}</strong> — trạng thái: {STATUS_LABEL[iv.status] || iv.status}</>}
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

          {/* CONFIRM SECTION — chỉ hiện khi voucher thật và active */}
          {!isTest && iv.status === "active" && confirmState === "idle" && (
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