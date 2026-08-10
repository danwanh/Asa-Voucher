import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { C } from "@/utils/constants"

interface Props {
  code: string
  size?: number
}

export function MockQR({ code, size = 112 }: Props) {
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
      className="p-2 bg-white rounded-xl border-2"
      style={{ width: size, height: size, borderColor: C.indigo + "30" }}
    >
      {dataUrl ? <img src={dataUrl} alt={`QR code ${code}`} className="w-full h-full" /> : <div className="w-full h-full animate-pulse rounded-lg" style={{ backgroundColor: C.muted }} />}
    </div>
  )
}
