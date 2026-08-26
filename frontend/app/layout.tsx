import type { Metadata } from "next"
import "@/styles/index.css"
import { Toaster } from "@/app/components/ui/sonner"
import { CartProvider } from "@/components/CartProvider"

export const metadata: Metadata = {
  title: "Asa Vouchers",
  description: "Nền tảng mua bán voucher ưu đãi",
  icons: {
    icon: '/icon.png'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body><CartProvider>{children}</CartProvider><Toaster position="top-right" /></body>
    </html>
  )
}
