import { useEffect, useRef } from "react"
import { ArrowDown, ArrowUp, Image, Star, Trash2, UploadCloud } from "lucide-react"
import { C } from "@/utils/constants"

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export type ManagedVoucherImage = {
  localId: string
  id?: string
  imageUrl: string
  file?: File
  isPrimary: boolean
}

type Props = {
  images: ManagedVoucherImage[]
  disabled?: boolean
  onChange: (images: ManagedVoucherImage[]) => void
  onError?: (message: string) => void
}

function makeLocalId() {
  return `img-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function normalizeVoucherImages(images: ManagedVoucherImage[]) {
  if (images.length === 0) return []
  return images.map((image, index) => ({ ...image, isPrimary: index === 0 }))
}

export function VoucherImagesManager({ images, disabled = false, onChange, onError }: Props) {
  const objectUrls = useRef(new Set<string>())

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
      objectUrls.current.clear()
    }
  }, [])

  const addFiles = (files?: FileList | null) => {
    if (!files || files.length === 0) return

    const nextImages: ManagedVoucherImage[] = []
    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        onError?.("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP")
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        onError?.(`Ảnh tối đa ${MAX_SIZE_MB} MB`)
        continue
      }

      const objectUrl = URL.createObjectURL(file)
      objectUrls.current.add(objectUrl)
      nextImages.push({
        localId: makeLocalId(),
        imageUrl: objectUrl,
        file,
        isPrimary: false,
      })
    }

    if (nextImages.length > 0) {
      onChange(normalizeVoucherImages([...images, ...nextImages]))
    }
  }

  const removeImage = (localId: string) => {
    const target = images.find((image) => image.localId === localId)
    if (target?.file && objectUrls.current.has(target.imageUrl)) {
      URL.revokeObjectURL(target.imageUrl)
      objectUrls.current.delete(target.imageUrl)
    }
    onChange(normalizeVoucherImages(images.filter((image) => image.localId !== localId)))
  }

  const moveImage = (localId: string, direction: -1 | 1) => {
    const index = images.findIndex((image) => image.localId === localId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= images.length) return
    const next = [...images]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    onChange(normalizeVoucherImages(next))
  }

  return (
    <div className="space-y-3">
      <label
        className={`block rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/20"}`}
        style={{ borderColor: "#E2DFC8", color: C.indigo }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ""
          }}
        />
        <UploadCloud className="mx-auto mb-2 h-6 w-6" />
        <div className="text-sm font-bold">Thêm ảnh voucher</div>
        <div className="mt-1 text-xs" style={{ color: "#8A8DA8" }}>JPG, PNG hoặc WebP, tối đa {MAX_SIZE_MB} MB mỗi ảnh</div>
      </label>

      {images.length === 0 ? (
        <div className="flex w-40 items-center justify-center rounded-xl border bg-white py-6" style={{ borderColor: "#E2DFC8", color: "#8A8DA8" }}>
          <Image className="h-6 w-6" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <div key={image.localId} className="rounded-xl border bg-white p-2" style={{ borderColor: index === 0 ? C.teal : "#E2DFC8" }}>
              <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img src={image.imageUrl} alt={`Ảnh voucher ${index + 1}`} className="h-full w-full object-contain" />
                {index === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: C.teal }}>
                    <Star className="h-3 w-3 fill-current" />
                    Ảnh thumbnail
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold" style={{ color: C.indigo }}>#{index + 1}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveImage(image.localId, -1)} disabled={disabled || index === 0} className="rounded-lg p-1.5 disabled:opacity-35" title="Đưa lên">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => moveImage(image.localId, 1)} disabled={disabled || index === images.length - 1} className="rounded-lg p-1.5 disabled:opacity-35" title="Đưa xuống">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeImage(image.localId)} disabled={disabled} className="rounded-lg p-1.5 text-red-500 disabled:opacity-35" title="Xóa ảnh">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
