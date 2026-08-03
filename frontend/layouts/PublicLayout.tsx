import { C } from "@/utils/constants"

interface Props {
  children: React.ReactNode
  onLogin?: () => void
  onRegister?: () => void
}

export function PublicLayout({ children }: Props) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: C.content, fontFamily: "'Nunito', sans-serif" }}>
      {children}
    </div>
  )
}
