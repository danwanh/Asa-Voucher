import App from "@/components/App"

export default function VoucherDetailRoute({ params }: { params: { id: string } }) {
  return <App initialPage="detail" initialVoucherId={params.id} />
}
