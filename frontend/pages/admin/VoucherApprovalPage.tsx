import { useEffect, useState } from "react"
import { Check, X, Eye, Loader2, AlertCircle, XCircle } from "lucide-react"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { voucherService, type BackendVoucherProduct } from "@/services/voucherService"

const FALLBACK = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=150&fit=crop"

export function VoucherApprovalPage() {
  const [vouchers, setVouchers] = useState<BackendVoucherProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const [selectedVoucher, setSelectedVoucher] = useState<BackendVoucherProduct | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<BackendVoucherProduct | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  async function loadPending() {
    setIsLoading(true)
    setError(null)
    try {
      const items = await voucherService.listPendingVouchers()
      setVouchers(items)
    } catch {
      setError("Không thể tải danh sách voucher chờ duyệt")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadPending() }, [])

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleApprove(id: string) {
    setIsProcessing(id)
    try {
      await voucherService.approveVoucher(id)
      setVouchers((prev) => prev.filter((v) => v.id !== id))
      showToast("success", "Duyệt voucher thành công")
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "Duyệt voucher thất bại"
      showToast("error", msg)
    } finally {
      setIsProcessing(null)
    }
  }

  async function handleReject() {
    if (!showRejectModal || !rejectReason.trim()) return
    setIsProcessing(showRejectModal.id)
    try {
      await voucherService.rejectVoucher(showRejectModal.id, rejectReason.trim())
      setVouchers((prev) => prev.filter((v) => v.id !== showRejectModal.id))
      setShowRejectModal(null)
      setRejectReason("")
      showToast("success", "Từ chối voucher thành công")
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "Từ chối voucher thất bại"
      showToast("error", msg)
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold text-white"
          style={{ backgroundColor: toast.type === "success" ? "#2D7A52" : "#DC2626" }}>
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="font-black text-lg" style={{ color: C.indigo }}>Duyệt voucher</h2>
        {!isLoading && vouchers.length > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: C.peach + "15", color: C.peach }}>
            {vouchers.length} chờ duyệt
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.teal }} />
          <span className="ml-2 text-sm" style={{ color: "#8A8DA8" }}>Đang tải voucher...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: "#FEE2E2" }}>
          <AlertCircle className="w-5 h-5" style={{ color: "#B91C1C" }} />
          <span className="text-sm font-bold" style={{ color: "#B91C1C" }}>{error}</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && vouchers.length === 0 && (
        <div className="text-center py-20">
          <AppIcon name="check" className="w-14 h-14 mb-4 mx-auto" />
          <div className="font-bold text-lg" style={{ color: C.indigo }}>Không có voucher nào chờ duyệt</div>
          <div className="text-sm mt-2" style={{ color: "#8A8DA8" }}>Tất cả voucher đã được xử lý</div>
        </div>
      )}

      {/* Voucher list */}
      {!isLoading && !error && vouchers.length > 0 && (
        <div className="space-y-4">
          {vouchers.map((v) => {
            const saleEndExpired = String(v.sale_end_date).slice(0, 10) < today
            return (
            <div key={v.id} className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex gap-5">
              <img
                src={v.thumbnail_url || FALLBACK}
                alt={v.name}
                className="w-24 h-20 rounded-xl object-cover shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-bold" style={{ color: C.indigo }}>{v.name}</div>
                    <div className="text-sm mt-0.5" style={{ color: "#8A8DA8" }}>{v.partners?.business_name || "—"}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "#FFF3CD", color: "#856404" }}>
                    Chờ duyệt
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
                  <div>
                    <div style={{ color: "#8A8DA8" }}>Giá gốc</div>
                    <div className="font-bold mt-0.5" style={{ color: C.indigo }}>{fmt(Number(v.original_price))}</div>
                  </div>
                  <div>
                    <div style={{ color: "#8A8DA8" }}>Giá bán</div>
                    <div className="font-bold mt-0.5" style={{ color: C.peach }}>{fmt(Number(v.selling_price))}</div>
                  </div>
                  <div>
                    <div style={{ color: "#8A8DA8" }}>Số lượng</div>
                    <div className="font-bold mt-0.5" style={{ color: C.indigo }}>{v.total_quantity}</div>
                  </div>
                  <div>
                    <div style={{ color: "#8A8DA8" }}>Giảm</div>
                    <div className="font-bold mt-0.5" style={{ color: C.indigo }}>{v.discount_rate}%</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "#9CA3AF" }}>
                  <span>Bán: {fmtDate(v.sale_start_date)} → {fmtDate(v.sale_end_date)}</span>
                  <span>Sử dụng: {v.validity_days ?? "—"} ngày</span>
                </div>

                <p className="text-xs mt-2 line-clamp-1" style={{ color: "#8A8DA8" }}>{v.description || "—"}</p>

                <div className="flex gap-3 mt-4 items-center">
                  {saleEndExpired ? (
                    <span className="px-3 py-2 rounded-xl text-sm font-bold" style={{ backgroundColor: "#F0EDF8", color: "#6B46C1" }}>
                      Hết thời gian bán
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApprove(v.id)}
                      disabled={isProcessing === v.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                      style={{ backgroundColor: C.teal }}
                    >
                      {isProcessing === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Duyệt
                    </button>
                  )}
                  <button
                    onClick={() => { setShowRejectModal(v); setRejectReason("") }}
                    disabled={isProcessing === v.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                    style={{ backgroundColor: "#FCEAEA", color: "#C0392B" }}
                  >
                    <X className="w-4 h-4" /> Từ chối
                  </button>
                  <button
                    onClick={() => setSelectedVoucher(v)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border hover:bg-gray-50"
                    style={{ borderColor: "#E2DFC8", color: C.indigo }}
                  >
                    <Eye className="w-4 h-4" /> Chi tiết
                  </button>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: "#F3F4F6" }}>
              <h3 className="font-black text-lg" style={{ color: C.indigo }}>Chi tiết Voucher</h3>
              <button onClick={() => setSelectedVoucher(null)}><XCircle className="w-5 h-5" style={{ color: "#6B7280" }} /></button>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm">
              <Row label="Tên voucher" value={selectedVoucher.name} />
              <Row label="Đối tác" value={selectedVoucher.partners?.business_name || "—"} />
              <Row label="Giá gốc" value={fmt(Number(selectedVoucher.original_price))} />
              <Row label="Giá bán" value={fmt(Number(selectedVoucher.selling_price))} />
              <Row label="Giảm giá" value={`${selectedVoucher.discount_rate}%`} />
              <Row label="Số lượng phát hành" value={String(selectedVoucher.total_quantity)} />
              <Row label="Còn lại" value={String(selectedVoucher.remaining_quantity)} />
              <Row label="Thời gian bán" value={`${fmtDate(selectedVoucher.sale_start_date)} → ${fmtDate(selectedVoucher.sale_end_date)}`} />
              <Row label="Sử dụng trong" value={`${selectedVoucher.validity_days} ngày`} />
              <Row label="Khu vực" value={selectedVoucher.applicable_area || "Tất cả"} />
              <Row label="Mô tả" value={selectedVoucher.description || "—"} />
            </div>
            <div className="px-6 pb-5 pt-3 border-t" style={{ borderColor: "#F3F4F6" }}>
              <button onClick={() => setSelectedVoucher(null)} className="w-full py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: "#F3F4F6" }}>
              <h3 className="font-black text-lg" style={{ color: "#C0392B" }}>Từ chối Voucher</h3>
              <button onClick={() => setShowRejectModal(null)}><XCircle className="w-5 h-5" style={{ color: "#6B7280" }} /></button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm mb-3" style={{ color: "#6B7280" }}>
                Voucher: <strong>{showRejectModal.name}</strong>
              </p>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#6B7280" }}>Lý do từ chối *</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none resize-none"
                style={{ borderColor: "#E5E7EB" }}
              />
            </div>
            <div className="flex gap-3 px-6 pb-5 pt-3 border-t" style={{ borderColor: "#F3F4F6" }}>
              <button onClick={() => setShowRejectModal(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Hủy</button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || isProcessing === showRejectModal.id}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40"
                style={{ backgroundColor: "#C0392B" }}
              >
                {isProcessing === showRejectModal.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "#8A8DA8" }}>{label}</span>
      <span className="font-semibold text-right" style={{ color: C.indigo }}>{value}</span>
    </div>
  )
}
