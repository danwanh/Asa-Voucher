import { useEffect, useState } from "react"
import { Image, UploadCloud, X } from "lucide-react"
import { C } from "@/utils/constants"

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

type Props = {
  imageUrl?: string
  selectedFile?: File | null
  disabled?: boolean
  onClear?: () => void
  onFileChange: (file: File | null) => void
  onError?: (message: string) => void
}

export function VoucherImageUpload({ imageUrl, selectedFile, disabled = false, onClear, onFileChange, onError }: Props) {
  const [previewUrl, setPreviewUrl] = useState("")

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(imageUrl ?? "")
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [imageUrl, selectedFile])

  const handleFile = (file?: File) => {
    if (!file) return
    if (!ACCEPTED_TYPES.has(file.type)) {
      onError?.("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP")
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      onError?.(`Ảnh tối đa ${MAX_SIZE_MB} MB`)
      return
    }
    onFileChange(file)
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
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            handleFile(event.target.files?.[0])
            event.target.value = ""
          }}
        />
        <UploadCloud className="mx-auto mb-2 h-6 w-6" />
        <div className="text-sm font-bold">{previewUrl ? "Đổi ảnh đại diện" : "Chọn ảnh đại diện"}</div>
        <div className="mt-1 text-xs" style={{ color: "#8A8DA8" }}>JPG, PNG hoặc WebP, tối đa {MAX_SIZE_MB} MB</div>
      </label>

      {previewUrl ? (
        <div className="relative w-40 overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#E2DFC8" }}>
          <img src={previewUrl} alt="Ảnh đại diện voucher" className="h-24 w-full object-cover" />
          {(selectedFile || (imageUrl && onClear)) && !disabled && (
            <button
              type="button"
              onClick={() => {
                if (selectedFile) onFileChange(null)
                else onClear?.()
              }}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
              aria-label={selectedFile ? "Bỏ ảnh đã chọn" : "Xóa ảnh hiện tại"}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex w-40 items-center justify-center rounded-xl border bg-white py-6" style={{ borderColor: "#E2DFC8", color: "#8A8DA8" }}>
          <Image className="h-6 w-6" />
        </div>
      )}
    </div>
  )
}
