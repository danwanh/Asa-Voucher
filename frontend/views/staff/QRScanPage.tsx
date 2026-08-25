import { useState, useRef, useEffect } from "react"
import { Camera, X, Zap, CheckCircle2, RotateCcw, Upload, Loader2 } from "lucide-react"
import jsQR from "jsqr"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"

interface Props {
  onVoucherFound: (code: string) => void
  title?: string
  showManualInput?: boolean
  embedded?: boolean
}

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>
}

type BarcodeDetectorConstructor = new (options?: { formats: string[] }) => BarcodeDetectorLike

export function QRScanPage({ onVoucherFound, title = "Quét QR Voucher", showManualInput = true, embedded = false }: Props) {
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<"scanning" | "success" | "error" | null>(null)
  const [scannedCode, setScannedCode] = useState("")
  const [manualCode, setManualCode] = useState("")
  const [scanError, setScanError] = useState("")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [decodingImage, setDecodingImage] = useState(false)

  useEffect(() => () => stopScan(), [])

  const startScan = async () => {
    const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
    if (!Detector) {
      setScanError("Trình duyệt không hỗ trợ quét QR tự động. Vui lòng nhập mã voucher thủ công.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      streamRef.current = stream
      setScanError("")
      setScanning(true)
      setScanResult("scanning")
      setScannedCode("")
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      const detector = new Detector({ formats: ["qr_code"] })
      scanInterval.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return
        const codes = await detector.detect(videoRef.current)
        const value = codes[0]?.rawValue
        if (value) {
          setScannedCode(value)
          setScanResult("success")
          stopScan(false)
        }
      }, 250)
    } catch {
      setScanError("Không thể mở camera. Vui lòng cấp quyền camera hoặc nhập mã voucher thủ công.")
      stopScan()
    }
  }

  const stopScan = (resetResult = true) => {
    if (scanInterval.current) clearInterval(scanInterval.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setScanning(false)
    if (resetResult) setScanResult(null)
  }

  const handleFoundCode = () => {
    if (scannedCode) onVoucherFound(scannedCode)
  }

  const handleManualSubmit = () => {
    if (manualCode.trim()) onVoucherFound(manualCode.trim().toUpperCase())
  }

  const decodeImageFile = (file: File) => {
    setDecodingImage(true)
    setScanError("")
    setScanResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        try {
          const MAX = 640
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const canvas = document.createElement("canvas")
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext("2d")
          if (!ctx) throw new Error("no canvas context")
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          if (code?.data) {
            setScannedCode(code.data)
            setScanResult("success")
            stopScan(false)
          } else {
            setScanError("Không tìm thấy mã QR trong ảnh. Vui lòng thử ảnh khác.")
          }
        } catch {
          setScanError("Không thể đọc được ảnh. Vui lòng thử ảnh khác.")
        } finally {
          setDecodingImage(false)
        }
      }
      img.onerror = () => {
        setScanError("Không thể tải ảnh. Vui lòng thử ảnh khác.")
        setDecodingImage(false)
      }
      img.src = reader.result as string
    }
    reader.onerror = () => {
      setScanError("Không thể đọc file ảnh. Vui lòng thử lại.")
      setDecodingImage(false)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) decodeImageFile(file)
    e.target.value = ""
  }

  const scanViewport = (
    <div
      className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center"
      style={{ aspectRatio: "1", maxHeight: 320, backgroundColor: scanning ? "#1A1A2E" : "#F1F5F9" }}
    >
      {!scanning && !scanResult && !decodingImage && (
        <div className="text-center">
          <Camera className="w-16 h-16 mx-auto mb-3" style={{ color: "#CBD5E1" }} />
          <p className="text-sm font-semibold" style={{ color: "#94A3B8" }}>Camera chưa bật</p>
          <p className="text-xs mt-1" style={{ color: "#CBD5E1" }}>Nhấn "Bắt đầu quét" để mở camera</p>
        </div>
      )}

      {decodingImage && (
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin" style={{ color: C.indigo }} />
          <p className="text-sm font-semibold" style={{ color: "#94A3B8" }}>Đang xử lý ảnh...</p>
        </div>
      )}

      {scanning && (
        <div className="relative w-full h-full flex items-center justify-center">
          <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" />

          {/* Scan frame */}
          <div className="relative z-10 w-52 h-52">
            {/* Corner decorations */}
            {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
              <div key={i} className={`absolute w-8 h-8 border-4 ${pos.includes("top") ? "border-b-0" : "border-t-0"} ${pos.includes("left") ? "border-r-0" : "border-l-0"} ${pos} rounded-sm`}
                style={{ borderColor: C.apricot }} />
            ))}

            {/* Scanning line */}
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute left-0 right-0 h-0.5 opacity-80"
                style={{
                  backgroundColor: C.apricot,
                  animation: "scan-line 1.5s ease-in-out infinite",
                  top: "50%",
                }}
              />
            </div>

          </div>

          <div className="absolute bottom-4 left-0 right-0 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "rgba(0,0,0,0.5)", color: C.apricot }}>
              <Zap className="w-3 h-3" /> Đang quét...
            </div>
          </div>
        </div>
      )}

      {scanResult === "success" && (
        <div className="text-center p-6">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#E8F5EE" }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: C.teal }} />
          </div>
          <div className="font-black text-lg mb-1" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Đọc mã thành công!</div>
          <code className="text-sm font-mono px-3 py-1 rounded-lg" style={{ backgroundColor: C.muted, color: C.indigo }}>{scannedCode}</code>
        </div>
      )}
    </div>
  )

  const scanControls = (
    <div className="flex gap-3 mt-4">
      {!scanning && scanResult !== "success" && (
        <>
          <button
            onClick={startScan}
            disabled={decodingImage}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: C.indigo }}
          >
            <Camera className="w-4 h-4" /> Bắt đầu quét
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={decodingImage}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold border-2 disabled:opacity-50"
            style={{ borderColor: "#E5E7EB", color: C.indigo }}
          >
            <Upload className="w-4 h-4" /> Tải ảnh QR
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
      {scanning && (
        <button
          onClick={() => stopScan()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold border-2"
          style={{ borderColor: "#EF4444", color: "#EF4444" }}
        >
          <X className="w-4 h-4" /> Dừng quét
        </button>
      )}
      {scanResult === "success" && (
        <>
          <button
            onClick={() => { setScanResult(null); setScannedCode("") }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold border-2"
            style={{ borderColor: "#E5E7EB", color: C.indigo }}
          >
            <RotateCcw className="w-4 h-4" /> Quét lại
          </button>
          <button
            onClick={handleFoundCode}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white"
            style={{ backgroundColor: C.apricot }}
          >
            <CheckCircle2 className="w-4 h-4" /> Kiểm tra ngay
          </button>
        </>
      )}
    </div>
  )

  const manualPanel = (
    <div className="bg-white rounded-2xl p-5 border border-black/5 h-full">
      <label className="block text-sm font-bold mb-2" style={{ color: C.indigo }}>Nhập mã QR</label>
      <div className="flex gap-2">
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
          placeholder="VD: VC... hoặc URL từ QR code..."
          className="flex-1 px-4 py-3 rounded-xl border-2 text-sm font-mono outline-none uppercase"
          style={{ borderColor: "#E5E7EB", letterSpacing: "0.1em" }}
        />
        <button
          onClick={handleManualSubmit}
          disabled={!manualCode.trim()}
          className="px-5 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: C.apricot }}
        >
          Kiểm tra
        </button>
      </div>
      <p className="text-xs mt-2" style={{ color: "#9CA3AF" }}>Nhập mã in trên voucher giấy hoặc mã từ app khách hàng</p>
    </div>
  )

  return (
    <div className={embedded ? "p-3" : "max-w-2xl mx-auto p-6"}>
      {title && (
        <h1 className="text-2xl font-black mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{title}</h1>
      )}
      {!embedded && (
        <p className="text-sm mb-6" style={{ color: "#6B7280" }}>Sử dụng camera để quét mã QR hoặc nhập mã thủ công</p>
      )}

      {/* Camera + Manual input — 2 columns khi embedded, xếp dọc khi standalone */}
      {embedded ? (
        <div className="grid gap-5 md:grid-cols-2 items-stretch">
          <div className="bg-white rounded-3xl p-5 border border-black/5">
            {scanViewport}
            {scanControls}
            {scanError && <p className="mt-3 text-xs font-semibold" style={{ color: "#C0392B" }}>{scanError}</p>}
          </div>
          {showManualInput && manualPanel}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-3xl p-6 border border-black/5 mb-5">
            {scanViewport}
            {scanControls}
            {scanError && <p className="mt-3 text-xs font-semibold" style={{ color: "#C0392B" }}>{scanError}</p>}
          </div>
          {showManualInput && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ backgroundColor: "#E5E7EB" }} />
                <span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>HOẶC NHẬP THỦ CÔNG</span>
                <div className="flex-1 h-px" style={{ backgroundColor: "#E5E7EB" }} />
              </div>
              {manualPanel}
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes scan-line {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>
    </div>
  )
}
