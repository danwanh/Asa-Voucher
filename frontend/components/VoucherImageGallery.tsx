import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"

interface Props {
  images: string[]
  alt: string
  fallbackImageUrl?: string
  className?: string
  mainHeightClass?: string
  emptyState?: ReactNode
}

export function VoucherImageGallery({
  images,
  alt,
  fallbackImageUrl,
  className = "rounded-3xl overflow-hidden shadow-md bg-white",
  mainHeightClass = "h-72",
  emptyState,
}: Props) {
  const galleryImages = useMemo(() => {
    const cleaned = images.map((image) => image.trim()).filter(Boolean)
    return cleaned.length > 0 ? cleaned : fallbackImageUrl ? [fallbackImageUrl] : []
  }, [fallbackImageUrl, images])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [failedImage, setFailedImage] = useState<string | null>(null)

  useEffect(() => {
    setSelectedIndex(0)
    setFailedImage(null)
  }, [galleryImages.join("|")])

  const selectedImage = galleryImages[Math.min(selectedIndex, Math.max(galleryImages.length - 1, 0))]
  const canNavigate = galleryImages.length > 1
  const showImage = Boolean(selectedImage) && failedImage !== selectedImage

  const selectImage = (index: number) => {
    setSelectedIndex(index)
    setFailedImage(null)
  }

  const moveImage = (direction: -1 | 1) => {
    if (!canNavigate) return
    setSelectedIndex((current) => (current + direction + galleryImages.length) % galleryImages.length)
    setFailedImage(null)
  }

  return (
    <div className={className}>
      {showImage ? (
        <div>
          <div className={`${mainHeightClass} relative overflow-hidden`}>
            <img
              src={selectedImage}
              alt={alt}
              className="h-full w-full object-cover"
              onError={(event) => {
                if (fallbackImageUrl && selectedImage !== fallbackImageUrl) {
                  event.currentTarget.src = fallbackImageUrl
                  return
                }
                setFailedImage(selectedImage)
              }}
            />
            {canNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => moveImage(-1)}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/80"
                  aria-label="Ảnh trước"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(1)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/80"
                  aria-label="Ảnh tiếp theo"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          {canNavigate && (
            <div className="px-4 pb-4 pt-3">
              <div className="mb-3 flex justify-center gap-2">
                {galleryImages.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() => selectImage(index)}
                    className="h-2.5 w-2.5 rounded-full transition-colors"
                    style={{ backgroundColor: index === selectedIndex ? C.teal : "#E5E7EB" }}
                    aria-label={`Xem ảnh ${index + 1}`}
                  />
                ))}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {galleryImages.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-thumb-${index}`}
                    type="button"
                    onClick={() => selectImage(index)}
                    className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl border-2 bg-white"
                    style={{ borderColor: index === selectedIndex ? C.teal : "#E5E7EB" }}
                    aria-label={`Chọn ảnh ${index + 1}`}
                  >
                    <img src={imageUrl} alt={`Ảnh voucher ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        emptyState ?? (
          <div className={`${mainHeightClass} flex items-center justify-center px-5`} style={{ backgroundColor: C.eggshell }}>
            <div className="text-center">
              <AppIcon name="image" className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm" style={{ color: "#6B7280" }}>Voucher chưa có ảnh đại diện</p>
            </div>
          </div>
        )
      )}
    </div>
  )
}
