import App from "@/components/App"

export default function StaffRoute({ params }: { params: { path?: string[] } }) {
  const routePath = `/staff/${params.path?.join("/") ?? ""}`
  return <App protectedRoute routePath={routePath} />
}
