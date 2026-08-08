import App from "@/components/App"

export default function OrderDetailRoute({ params }: { params: { orderId: string } }) {
  return <App initialPage="orders" initialOrderId={params.orderId} />
}
