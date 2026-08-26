import App from "@/components/App"

export default function VoucherStaffRoute({ params }: { params: { path?: string[] } }) {
  const routePath = `/voucher-staff/${params.path?.join("/") ?? ""}`
  return <App protectedRoute routePath={routePath} />
}
