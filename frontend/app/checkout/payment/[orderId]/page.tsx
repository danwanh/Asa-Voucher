import App from "@/components/App"

export default function PaymentRoute({ params }: { params: { orderId: string } }) {
  return <App initialPage="payment" initialOrderId={params.orderId} />
}
