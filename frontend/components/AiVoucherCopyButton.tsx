import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { C } from "@/utils/constants"
import { voucherService, type GeneratedVoucherCopy, type GenerateVoucherCopyInput } from "@/services/voucherService"

interface Props {
  /** Reads the current form values at click time. */
  getContext: () => Omit<GenerateVoucherCopyInput, "highlights">
  /** True when description/terms/usage already have text, so we ask before overwriting. */
  hasExistingContent: boolean
  onApply: (copy: GeneratedVoucherCopy) => void
  disabled?: boolean
}

function getAiErrorMessage(error: unknown) {
  const err = error as { code?: string; response?: { status?: number; data?: { error?: { code?: string; message?: string } } } }
  if (err?.code === "ECONNABORTED") return "AI phản hồi quá lâu, vui lòng thử lại"
  const status = err?.response?.status
  if (status === 503) return "Tính năng AI chưa được cấu hình trên máy chủ"
  if (status === 429) return err.response?.data?.error?.message ?? "Bạn đã dùng AI quá nhiều lần, vui lòng thử lại sau"
  return err?.response?.data?.error?.message ?? "Không thể tạo nội dung bằng AI, vui lòng thử lại"
}

export function AiVoucherCopyButton({ getContext, hasExistingContent, onApply, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [highlights, setHighlights] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [pendingCopy, setPendingCopy] = useState<GeneratedVoucherCopy | null>(null)

  const apply = (copy: GeneratedVoucherCopy) => {
    onApply(copy)
    setPendingCopy(null)
    setOpen(false)
    toast.success("Đã điền nội dung do AI gợi ý. Hãy kiểm tra lại trước khi lưu.")
  }

  const generate = async () => {
    const context = getContext()
    if (!context.name.trim()) {
      toast.error("Vui lòng nhập tên voucher trước khi dùng AI")
      return
    }

    setIsGenerating(true)
    try {
      const copy = await voucherService.generateCopy({
        ...context,
        name: context.name.trim(),
        highlights: highlights.trim() || undefined
      })
      if (hasExistingContent) {
        setPendingCopy(copy)
      } else {
        apply(copy)
      }
    } catch (error) {
      toast.error(getAiErrorMessage(error))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="rounded-xl border px-4 py-3" style={{ borderColor: C.apricot, backgroundColor: C.apricot + "15" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs" style={{ color: "#6B4F00" }}>
          Để AI viết mô tả, điều kiện và hướng dẫn sử dụng dựa trên thông tin bạn đã nhập.
        </p>
        <button
          type="button"
          onClick={() => (open ? generate() : setOpen(true))}
          disabled={disabled || isGenerating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: C.indigo }}
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isGenerating ? "Đang viết..." : open ? "Tạo nội dung" : "Viết bằng AI"}
        </button>
      </div>

      {open && (
        <div className="mt-3">
          <label className="block text-xs font-bold mb-1" style={{ color: C.indigo }}>Ý chính muốn nhấn mạnh (tuỳ chọn)</label>
          <textarea
            rows={2}
            maxLength={500}
            value={highlights}
            onChange={(event) => setHighlights(event.target.value)}
            disabled={disabled || isGenerating}
            placeholder="VD: phù hợp hẹn hò, không gian view sông, áp dụng cả cuối tuần"
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none bg-white resize-none border-[#E2DFC8]"
          />
        </div>
      )}

      {pendingCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-black text-lg mb-2" style={{ color: C.indigo }}>Ghi đè nội dung hiện tại?</h3>
            <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
              Mô tả, điều kiện áp dụng và hướng dẫn sử dụng hiện tại sẽ được thay bằng nội dung AI gợi ý.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPendingCopy(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2" style={{ borderColor: "#E5E7EB", color: C.indigo }}>Giữ nguyên</button>
              <button type="button" onClick={() => apply(pendingCopy)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white" style={{ backgroundColor: C.peach }}>
                Ghi đè
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
