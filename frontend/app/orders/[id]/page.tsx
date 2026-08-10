import App from "@/components/App"

export default function OrderDetailRoute({ params }: { params: { id: string } }) {
  return <App initialPage="orders" initialOrderId={params.id} />
}
