import type { Metadata } from "next"
import "@/styles/index.css"
import { Toaster } from "@/app/components/ui/sonner"

export const metadata: Metadata = {
  title: "Asa Vouchers",
  description: "Nền tảng mua bán voucher ưu đãi",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}<Toaster position="top-right" /></body>
    </html>
  )
}
