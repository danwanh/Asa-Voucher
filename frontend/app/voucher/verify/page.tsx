"use client"

import { useSearchParams } from "next/navigation"
import App from "@/components/App"

export default function VoucherVerifyRoute() {
  const params = useSearchParams()
  return <App initialStaffCode={params?.get("code") ?? ""} />
}
