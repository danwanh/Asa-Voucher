import App from "@/components/App"

export default function PartnerRoute({ params }: { params: { path?: string[] } }) {
  const routePath = `/partner/${params.path?.join("/") ?? ""}`
  return <App protectedRoute routePath={routePath} />
}
