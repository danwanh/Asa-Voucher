import type { Metadata } from "next"
import "@/styles/index.css"

export const metadata: Metadata = {
  title: "Asa Vouchers",
  description: "Nền tảng mua bán voucher ưu đãi",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
