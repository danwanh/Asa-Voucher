import { PaymentResultPage } from "@/pages/customer/PaymentResultPage"

export default function PaymentResultRoute({ searchParams }: { searchParams: { orderId?: string; status?: string } }) {
  return <PaymentResultPage orderId={searchParams.orderId} callbackStatus={searchParams.status} />
}
