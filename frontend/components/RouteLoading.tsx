export function RouteLoading({ label = "Đang tải trang..." }: { label?: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4F1DE" }}>
      <div className="text-center" role="status" aria-live="polite" aria-label={label}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-white shadow-sm" style={{ backgroundColor: "#E07A5F" }}>
          <span className="animate-pulse">A</span>
        </div>
        <div className="mb-3 h-1.5 w-36 overflow-hidden rounded-full" style={{ backgroundColor: "#E2DFC8" }}>
          <div className="h-full w-1/2 animate-[loading-slide_1.2s_ease-in-out_infinite] rounded-full" style={{ backgroundColor: "#E07A5F" }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: "#3D405B" }}>{label}</p>
      </div>
    </main>
  )
}
