import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, Star, X } from "lucide-react"
import { toast } from "sonner"
import { C, fmt } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"
import { ImageLightbox } from "@/components/ImageLightbox"
import type { Order, ReviewTarget } from "@/types"
import { feedbackService } from "@/services/feedbackService"

interface Props {
  order: Order
  target: ReviewTarget
  onBack: () => void
  onSubmit: () => void
}

const LABELS = ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Tuyệt vời"]

export function ReviewPage({ order, target, onBack, onSubmit }: Props) {
  const review = target.review
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [content, setContent] = useState(review?.comment ?? "")
  const [files, setFiles] = useState<File[]>([])
  const [hover, setHover] = useState(0)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)

  const isView = Boolean(review)
  const voucherTitle = target.voucherTitle || order.voucherTitle
  const partnerName = target.partnerName || order.partnerName

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

  const removeFile = (index: number) => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))

  const handleSubmit = async () => {
    if (rating === 0) return setError("Vui lòng chọn số sao đánh giá")
    if (content.trim().length < 10) return setError("Nội dung đánh giá tối thiểu 10 ký tự")
    setIsSubmitting(true)
    setError("")
    try {
      const mediaUrls = await feedbackService.uploadImages(files)
      await feedbackService.createReview({ issuedVoucherId: target.id, rating, comment: content.trim(), mediaUrls })
      toast.success("Đánh giá đã được gửi thành công")
      onSubmit()
    } catch (errorResponse) {
      const response = errorResponse as { response?: { data?: { message?: string } } }
      const message = response.response?.data?.message ?? "Không thể gửi đánh giá. Vui lòng thử lại."
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-sm font-semibold hover:underline" style={{ color: C.indigo }}><ArrowLeft className="w-4 h-4" /> Quay lại</button>
      <h1 className="text-2xl font-black mb-6" style={{ color: C.indigo }}>{isView ? "Đánh giá của bạn" : "Đánh giá voucher"}</h1>
      <div className="bg-white rounded-2xl p-4 border border-black/5 mb-5 flex items-center gap-4"><div className="w-16 h-12 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: C.eggshell }}>{target.image ? <img src={target.image} alt={voucherTitle} className="h-full w-full object-cover" /> : <AppIcon name="gift" className="w-5 h-5" />}</div><div><div className="font-bold text-sm" style={{ color: C.indigo }}>{voucherTitle}</div><div className="text-xs" style={{ color: "#6B7280" }}>{partnerName}{target.amount !== undefined ? ` • ${fmt(target.amount)}` : ""}</div>{target.code && <div className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Mã: {target.code}</div>}</div></div>
      <div className="bg-white rounded-2xl p-6 border border-black/5">
        <div className="text-center mb-6"><div className="text-sm font-bold mb-3" style={{ color: C.indigo }}>Trải nghiệm của bạn thế nào?</div><div className="flex justify-center gap-2 mb-2">{[1, 2, 3, 4, 5].map((star) => <button key={star} disabled={isView} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)} onClick={() => { setRating(star); setError("") }} aria-label={`${star} sao`}><Star className="w-10 h-10" fill={(hover || rating) >= star ? C.apricot : "none"} style={{ color: (hover || rating) >= star ? C.apricot : "#D1D5DB" }} /></button>)}</div>{rating > 0 && <div className="text-sm font-bold" style={{ color: C.apricot }}>{LABELS[rating]}</div>}</div>
        <label className="block text-sm font-bold mb-1.5" style={{ color: C.indigo }}>Nội dung đánh giá</label>
        {isView ? <p className="min-h-28 w-full px-4 py-3 rounded-xl border text-sm whitespace-pre-wrap" style={{ borderColor: "#E5E7EB", color: "#4B5563" }}>{content || "Không có nội dung"}</p> : <textarea rows={5} value={content} onChange={(event) => { setContent(event.target.value); setError("") }} className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none resize-none mb-1" style={{ borderColor: error ? "#EF4444" : "#E5E7EB" }} placeholder="Chia sẻ trải nghiệm của bạn..." />}
        <div className="flex justify-between text-xs mb-5"><span style={{ color: "#EF4444" }}>{error}</span><span style={{ color: "#9CA3AF" }}>{content.length}/2000</span></div>
        {!isView && <><label className="block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer mb-3" style={{ borderColor: "#D1D5DB" }}><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => { handleFiles(event.target.files); event.target.value = "" }} /><AppIcon name="camera" className="w-6 h-6 mb-1 mx-auto" /><div className="text-xs" style={{ color: "#9CA3AF" }}>{files.length ? `${files.length}/3 ảnh đã chọn` : "Thêm tối đa 3 ảnh, mỗi ảnh tối đa 5 MB"}</div></label>{previews.length > 0 && <div className="grid grid-cols-3 gap-2 mb-5">{previews.map((url, index) => <div key={url} className="relative"><button type="button" onClick={() => setLightbox({ images: previews, index })} className="block w-full"><img src={url} alt={`Ảnh xem trước ${index + 1}`} className="aspect-square w-full object-cover rounded-xl" /></button><button type="button" onClick={() => removeFile(index)} className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white" aria-label="Xóa ảnh"><X className="w-3 h-3" /></button></div>)}</div>}</>}
        {isView && review?.mediaUrls.length ? <div className="grid grid-cols-3 gap-2 mb-5">{review.mediaUrls.map((url, index) => <button type="button" key={url} onClick={() => setLightbox({ images: review.mediaUrls, index })}><img src={url} alt={`Ảnh trong đánh giá ${index + 1}`} className="aspect-square w-full object-cover rounded-xl" /></button>)}</div> : null}
        {isView ? <div className="flex items-center gap-2 text-xs" style={{ color: "#9CA3AF" }}><CheckCircle2 className="w-4 h-4" /> Đánh giá đã gửi và không thể chỉnh sửa.</div> : <button disabled={isSubmitting} onClick={handleSubmit} className="w-full py-3.5 rounded-2xl font-black text-white disabled:opacity-60" style={{ backgroundColor: C.peach }}>{isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}</button>}
      </div>
      <ImageLightbox images={lightbox?.images ?? []} initialIndex={lightbox?.index ?? 0} open={Boolean(lightbox)} onClose={() => setLightbox(null)} />
    </div>
  )
}
