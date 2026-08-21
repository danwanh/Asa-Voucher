import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Lock } from "lucide-react"
import { C } from "@/utils/constants"

interface Props {
  code: string
  size?: number
  disabled?: boolean
}

export function MockQR({ code, size = 112, disabled = false }: Props) {
  const [dataUrl, setDataUrl] = useState("")

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(code, { width: size, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl("")
      })
    return () => { cancelled = true }
  }, [code, size])

  return (
    <div
      className="p-2 bg-white rounded-xl border-2 relative"
      style={{
        width: size,
        height: size,
        borderColor: disabled ? "#D1D5DB" : C.indigo + "30",
        filter: disabled ? "grayscale(1) opacity(0.5)" : undefined,
      }}
    >
      {dataUrl ? <img src={dataUrl} alt={`QR code ${code}`} className="w-full h-full" /> : <div className="w-full h-full animate-pulse rounded-lg" style={{ backgroundColor: C.muted }} />}
      {disabled && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/80 rounded-full p-1.5 shadow-sm">
            <Lock className="w-5 h-5" style={{ color: "#DC2626" }} />
          </div>
        </div>
      )}
    </div>
  )
}
