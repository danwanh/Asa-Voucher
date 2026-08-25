import App from "@/components/App"

export default function AdminRoute({ params }: { params: { path?: string[] } }) {
  const routePath = `/admin/${params.path?.join("/") ?? ""}`
  return <App protectedRoute routePath={routePath} />
}
