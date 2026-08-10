import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface Props {
  images: string[]
  initialIndex: number
  open: boolean
  onClose: () => void
}

export function ImageLightbox({ images, initialIndex, open, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [initialIndex, open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + images.length) % images.length)
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % images.length)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [images.length, onClose, open])

  if (!open || images.length === 0) return null

  const hasNavigation = images.length > 1

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Xem ảnh" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Đóng ảnh">
        <X className="h-6 w-6" />
      </button>
      <div className="relative flex h-full w-full items-center justify-center" onClick={(event) => event.stopPropagation()}>
        {hasNavigation && <button type="button" onClick={() => setIndex((current) => (current - 1 + images.length) % images.length)} className="absolute left-0 z-10 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Ảnh trước"><ChevronLeft className="h-7 w-7" /></button>}
        <img src={images[index]} alt={`Ảnh ${index + 1} trong ${images.length}`} className="max-h-full max-w-full object-contain" />
        {hasNavigation && <button type="button" onClick={() => setIndex((current) => (current + 1) % images.length)} className="absolute right-0 z-10 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Ảnh tiếp theo"><ChevronRight className="h-7 w-7" /></button>}
        {hasNavigation && <div className="absolute bottom-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">{index + 1}/{images.length}</div>}
      </div>
    </div>
  )
}
