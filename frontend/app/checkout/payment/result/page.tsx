import App from "@/components/App"

export default function PaymentResultRoute({ searchParams }: { searchParams: { orderId?: string; status?: string } }) {
  return <App initialPage="orders" initialOrderId={searchParams.orderId} initialPaymentStatus={searchParams.status} />
}
