import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, MessageSquare, X } from "lucide-react"
import { toast } from "sonner"
import { C, fmt, fmtDate } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { ImageLightbox } from "@/components/ImageLightbox"
import type { ComplaintStatus, IssuedVoucher, Order } from "@/types"
import type { ComplaintResponse } from "@/services/feedbackService"
import { feedbackService } from "@/services/feedbackService"

interface Props {
  order: Order
  issuedVoucher?: IssuedVoucher
  onBack: () => void
  onSubmit: () => void
}

const REASONS = [
  ["not_as_described", "Voucher không đúng mô tả"],
  ["cannot_redeem", "Không thể sử dụng voucher"],
  ["expired_early", "Voucher hết hạn sớm"],
  ["wrong_value", "Sai giá trị voucher"],
  ["other", "Lý do khác"],
] as const

const STATUS: Record<ComplaintStatus, { label: string; color: string; background: string }> = {
  open: { label: "Chờ tiếp nhận", color: "#B66A00", background: C.apricot + "25" },
  resolved: { label: "Đã giải quyết", color: "#15803D", background: "#DCFCE7" },
}

export function ComplaintPage({ order, issuedVoucher, onBack, onSubmit }: Props) {
  const complaint = issuedVoucher?.complaint ?? order.complaints?.[0]
  const [reason, setReason] = useState(complaint?.reason ?? "")
  const [description, setDescription] = useState(complaint?.description ?? "")
  const [responses, setResponses] = useState<ComplaintResponse[]>([])
  const [responsesLoading, setResponsesLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [customReason, setCustomReason] = useState(complaint?.reason === "other" ? (complaint.description.split("\n\n")[0]?.replace("Lý do: ", "") ?? "") : "")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)
  const status = complaint ? STATUS[complaint.status] : null
  const orderItem = issuedVoucher ? order.items?.find((item) => item.issuedVouchers?.some((voucher) => voucher.id === issuedVoucher.id)) : undefined
  const voucherTitle = orderItem?.voucherTitle ?? order.voucherTitle
  const partnerName = orderItem?.partnerName ?? order.partnerName

  useEffect(() => {
    if (!complaint?.id) return
    let isMounted = true
    setResponsesLoading(true)
    feedbackService
      .getComplaintDetail(complaint.id)
      .then((detail) => {
        if (!isMounted) return
        setResponses(Array.isArray(detail.responses) ? detail.responses : [])
      })
      .catch(() => {
        // Keep the inline complaint info if the detail fetch fails.
      })
      .finally(() => {
        if (isMounted) setResponsesLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [complaint?.id])

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return
    const next = Array.from(selected)
    if (next.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError("Ảnh phải là JPG, PNG hoặc WEBP và không quá 5 MB")
      return
    }
    setFiles((current) => {
      const merged = [...current, ...next]
      const unique = merged.filter((file, index, all) => all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified) === index)
      return unique.slice(0, 3)
    })
    setError("")
  }

  const handleSubmit = async () => {
    if (!reason) return setError("Vui lòng chọn lý do khiếu nại")
    if (reason === "other" && !customReason.trim()) return setError("Vui lòng nhập lý do khác")
    const fullDescription = reason === "other" ? `Lý do: ${customReason.trim()}\n\n${description.trim()}` : description.trim()
    if (fullDescription.length < 10) return setError("Nội dung khiếu nại tối thiểu 10 ký tự")
    setIsSubmitting(true)
    setError("")
    try {
      const evidenceUrls = await feedbackService.uploadImages(files)
      await feedbackService.createComplaint({ issuedVoucherId: issuedVoucher?.id, orderId: order.id, reason, description: fullDescription, evidenceUrls })
      toast.success("Khiếu nại đã được gửi thành công")
      onSubmit()
    } catch (errorResponse) {
      const response = errorResponse as { response?: { data?: { message?: string } } }
      const message = response.response?.data?.message ?? "Không thể gửi khiếu nại. Vui lòng thử lại."
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline" style={{ color: C.indigo }}><ArrowLeft className="w-4 h-4" /> Quay lại</button>
      <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo }}>{complaint ? "Chi tiết khiếu nại" : "Khiếu nại voucher"}</h1>
      <div className="bg-white rounded-2xl p-4 border border-black/5 mb-5 flex items-center gap-4"><div className="w-16 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: C.eggshell }}><AppIcon name="gift" className="w-5 h-5" /></div><div><div className="font-bold text-sm" style={{ color: C.indigo }}>{voucherTitle}</div><div className="text-xs" style={{ color: "#6B7280" }}>{partnerName} • {fmt(order.amount)}</div>{issuedVoucher && <div className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Mã: {issuedVoucher.code}</div>}</div></div>
      <div className="bg-white rounded-2xl p-6 border border-black/5">
        {status && <div className="mb-5 flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: status.background }}><span className="text-sm font-bold" style={{ color: status.color }}>Trạng thái xử lý</span><span className="text-sm font-black" style={{ color: status.color }}>{status.label}</span></div>}
        <label className="block text-sm font-bold mb-1.5" style={{ color: C.indigo }}>Lý do khiếu nại</label>
        {complaint ? <p className="w-full px-4 py-3 rounded-xl border text-sm mb-4" style={{ borderColor: "#E5E7EB", color: "#4B5563" }}>{REASONS.find(([value]) => value === reason)?.[1] ?? reason}</p> : <select value={reason} onChange={(event) => { setReason(event.target.value); setError("") }} className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none mb-4" style={{ borderColor: "#E5E7EB" }}><option value="">Chọn lý do</option>{REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
        {!complaint && reason === "other" && <input type="text" value={customReason} onChange={(event) => { setCustomReason(event.target.value); setError("") }} className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none mb-4" style={{ borderColor: error && !customReason.trim() ? "#EF4444" : "#E5E7EB" }} placeholder="Nhập lý do khác..." />}
        <label className="block text-sm font-bold mb-1.5" style={{ color: C.indigo }}>Mô tả chi tiết</label>
        {complaint ? <p className="min-h-36 w-full px-4 py-3 rounded-xl border text-sm whitespace-pre-wrap" style={{ borderColor: "#E5E7EB", color: "#4B5563" }}>{description}</p> : <textarea rows={6} value={description} onChange={(event) => { setDescription(event.target.value); setError("") }} className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none resize-none" style={{ borderColor: error ? "#EF4444" : "#E5E7EB" }} placeholder="Mô tả vấn đề bạn gặp phải..." />}
        <div className="flex justify-between text-xs mt-1 mb-4"><span style={{ color: "#EF4444" }}>{error}</span><span style={{ color: "#9CA3AF" }}>{(reason === "other" ? `Lý do: ${customReason}\n\n${description}` : description).length}/2000</span></div>
        {!complaint && <><label className="block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer mb-3" style={{ borderColor: "#D1D5DB" }}><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => { handleFiles(event.target.files); event.target.value = "" }} /><MessageSquare className="w-6 h-6 mb-1 mx-auto" style={{ color: C.indigo }} /><div className="text-xs" style={{ color: "#9CA3AF" }}>{files.length ? `${files.length}/3 ảnh đã chọn` : "Thêm ảnh bằng chứng, tối đa 3 ảnh"}</div></label>{previews.length > 0 && <div className="grid grid-cols-3 gap-2 mb-5">{previews.map((url, index) => <div key={url} className="relative"><button type="button" onClick={() => setLightbox({ images: previews, index })} className="block w-full"><img src={url} alt={`Ảnh bằng chứng ${index + 1}`} className="aspect-square w-full object-cover rounded-xl" /></button><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white" aria-label="Xóa ảnh"><X className="w-3 h-3" /></button></div>)}</div>}</>}
        {complaint?.evidenceUrls.length ? <div className="grid grid-cols-3 gap-2 mb-5">{complaint.evidenceUrls.map((url, index) => <button type="button" key={url} onClick={() => setLightbox({ images: complaint.evidenceUrls, index })}><img src={url} alt={`Ảnh bằng chứng ${index + 1}`} className="aspect-square w-full object-cover rounded-xl" /></button>)}</div> : null}
        {complaint?.resolutionNote && <div className="rounded-xl p-4 text-sm mb-4" style={{ backgroundColor: "#F3F4F6", color: "#4B5563" }}><strong>Kết quả xử lý:</strong> {complaint.resolutionNote}</div>}
        {complaint && (
          <div className="border-t pt-5 mt-2" style={{ borderColor: "#F0EDD8" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: C.indigo }}>Phản hồi ({responses.length})</h3>
              {responsesLoading && <span className="text-xs" style={{ color: "#9CA3AF" }}>Đang tải...</span>}
            </div>
            {!responsesLoading && responses.length === 0 ? (
              <div className="text-sm py-6 text-center rounded-xl" style={{ backgroundColor: "#F9FAFB", color: "#9CA3AF" }}>
                Chưa có phản hồi từ hệ thống. Khiếu nại của bạn đang được xử lý.
              </div>
            ) : (
              <div className="space-y-3">
                {responses.slice().reverse().map((r) => (
                  <div key={r.id} className="rounded-xl p-3.5 border" style={{ borderColor: r.responderRole === "user" ? "#E2DFC8" : "#D1E0FF", backgroundColor: r.responderRole === "user" ? "#FFFFFF" : "#EEF3FF" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold" style={{ color: C.indigo }}>
                        {r.responderRole === "admin" ? "Hệ thống / Quản trị viên" : r.responderRole === "partner" ? "Đối tác" : "Bạn"}
                      </span>
                      <span className="text-[10px]" style={{ color: "#8A8DA8" }}>{fmtDate(r.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: C.indigo }}>{r.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {complaint ? <div className="flex items-center gap-2 text-xs" style={{ color: "#9CA3AF" }}><CheckCircle2 className="w-4 h-4" /> Khiếu nại đã gửi và không thể chỉnh sửa.</div> : <button disabled={isSubmitting} onClick={handleSubmit} className="w-full py-3.5 rounded-2xl font-black text-white disabled:opacity-60" style={{ backgroundColor: C.peach }}>{isSubmitting ? "Đang gửi..." : "Gửi khiếu nại"}</button>}
      </div>
      <ImageLightbox images={lightbox?.images ?? []} initialIndex={lightbox?.index ?? 0} open={Boolean(lightbox)} onClose={() => setLightbox(null)} />
    </div>
  )
}
