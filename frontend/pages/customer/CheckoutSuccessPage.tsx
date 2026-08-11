import { useState } from "react"
import { CheckCircle, Check, Copy } from "lucide-react"
import { C } from "@/utils/constants"
import { MockQR } from "@/components/MockQR"

interface Props {
  code: string
  qrPayload?: string
  onDone: () => void
}

export function CheckoutSuccessPage({ code, qrPayload, onDone }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: C.teal + "20" }}>
        <CheckCircle className="w-10 h-10" style={{ color: C.teal }} />
      </div>
      <h1 className="text-2xl font-black mb-2" style={{ color: C.indigo }}>Thanh toán thành công!</h1>
      <p className="text-sm mb-8" style={{ color: "#8A8DA8" }}>Mã voucher của bạn đã sẵn sàng sử dụng</p>

      <div className="bg-card rounded-3xl p-6 shadow-md mb-6">
        <div className="flex justify-center mb-4">
           <MockQR code={qrPayload || code.split(", ")[0]} />
        </div>
        <div className="text-xs font-semibold mb-1" style={{ color: "#8A8DA8" }}>Mã voucher</div>
        <div className="flex items-center justify-center gap-2">
          <code
            className="text-lg font-black tracking-widest"
            style={{ color: C.indigo, fontFamily: "'Inter', monospace" }}
          >
            {code.split(", ")[0]}
          </code>
          <button onClick={copy} className="p-1.5 rounded-lg hover:bg-muted">
            {copied
              ? <Check className="w-4 h-4" style={{ color: C.teal }} />
              : <Copy className="w-4 h-4" style={{ color: "#8A8DA8" }} />
            }
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: "#B0B3C8" }}>Xuất trình mã hoặc QR code tại cửa hàng</p>
      </div>

      <button onClick={onDone} className="px-8 py-3.5 rounded-2xl font-bold text-white" style={{ backgroundColor: C.peach }}>
        Xem voucher của tôi
      </button>
    </div>
  )
}
