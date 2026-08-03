import { useState, useRef } from "react"
import { Camera, X, Zap, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react"
import { C } from "@/utils/constants"
import { AppIcon } from "@/components/AppIcon"

interface Props {
  onVoucherFound: (code: string) => void
}

const MOCK_QR_CODES = ["ASA-PH-7F3K2", "ASA-CG-8H5N1", "ASA-VJ-4M9P7", "ASA-DEMO-001", "ASA-TEST-VALID"]

export function QRScanPage({ onVoucherFound }: Props) {
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<"scanning" | "success" | "error" | null>(null)
  const [scannedCode, setScannedCode] = useState("")
  const [manualCode, setManualCode] = useState("")
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const startScan = () => {
    setScanning(true)
    setScanResult("scanning")
    setScannedCode("")

    // Simulate scanning animation for 2.5s then auto-detect
    scanInterval.current = setTimeout(() => {
      const mockCode = MOCK_QR_CODES[Math.floor(Math.random() * MOCK_QR_CODES.length)]
      setScannedCode(mockCode)
      setScanResult("success")
      setScanning(false)
    }, 2500)
  }

  const stopScan = () => {
    if (scanInterval.current) clearTimeout(scanInterval.current)
    setScanning(false)
    setScanResult(null)
  }

  const handleFoundCode = () => {
    if (scannedCode) onVoucherFound(scannedCode)
  }

  const handleManualSubmit = () => {
    if (manualCode.trim()) onVoucherFound(manualCode.trim().toUpperCase())
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-black mb-2" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>Quét QR Voucher</h1>
      <p className="text-sm mb-6" style={{ color: "#6B7280" }}>Sử dụng camera để quét mã QR hoặc nhập mã thủ công</p>

      {/* Camera Viewfinder */}
      <div className="bg-white rounded-3xl p-6 border border-black/5 mb-5">
        <div
          className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: "1", maxHeight: 320, backgroundColor: scanning ? "#1A1A2E" : "#F1F5F9" }}
        >
          {!scanning && !scanResult && (
            <div className="text-center">
              <Camera className="w-16 h-16 mx-auto mb-3" style={{ color: "#CBD5E1" }} />
              <p className="text-sm font-semibold" style={{ color: "#94A3B8" }}>Camera chưa bật</p>
              <p className="text-xs mt-1" style={{ color: "#CBD5E1" }}>Nhấn "Bắt đầu quét" để mở camera</p>
            </div>
          )}

          {scanning && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Simulated camera feed */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)" }} />

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

                {/* Mock QR pattern */}
                <div className="absolute inset-4 grid grid-cols-5 gap-0.5 opacity-20">
                  {[...Array(25)].map((_, i) => (
                    <div key={i} className="bg-white rounded-sm" style={{ opacity: Math.random() > 0.5 ? 1 : 0 }} />
                  ))}
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

        {/* Controls */}
        <div className="flex gap-3 mt-4">
          {!scanning && scanResult !== "success" && (
            <button
              onClick={startScan}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: C.indigo }}
            >
              <Camera className="w-4 h-4" /> Bắt đầu quét
            </button>
          )}
          {scanning && (
            <button
              onClick={stopScan}
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
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px" style={{ backgroundColor: "#E5E7EB" }} />
        <span className="text-xs font-semibold" style={{ color: "#9CA3AF" }}>HOẶC NHẬP THỦ CÔNG</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "#E5E7EB" }} />
      </div>

      {/* Manual input */}
      <div className="bg-white rounded-2xl p-5 border border-black/5">
        <label className="block text-sm font-bold mb-2" style={{ color: C.indigo }}>Nhập mã voucher</label>
        <div className="flex gap-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            placeholder="ASA-XXXX-XXXXX"
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

      {/* Tips */}
      <div className="mt-5 p-4 rounded-2xl" style={{ backgroundColor: "#EEF2FF" }}>
        <div className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "#4338CA" }}><AppIcon name="help" className="w-3.5 h-3.5" /> Hướng dẫn quét</div>
        <ul className="space-y-1 text-xs" style={{ color: "#6366F1" }}>
          <li>• Giữ camera cách mã QR 15-20cm</li>
          <li>• Đảm bảo ánh sáng đủ, tránh bóng che</li>
          <li>• Mã QR phải còn nguyên vẹn, không bị hỏng</li>
          <li>• Mỗi voucher chỉ có thể quét một lần</li>
        </ul>
      </div>

      <style>{`
        @keyframes scan-line {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>
    </div>
  )
}
