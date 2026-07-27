import { C } from "@/utils/constants"

interface Props {
  code: string
  size?: number
}

export function MockQR({ code, size = 112 }: Props) {
  const cells = Array.from({ length: 64 }, (_, i) =>
    (code.charCodeAt(i % code.length) + i * 7) % 3 !== 0
  )
  return (
    <div
      className="p-2 bg-white rounded-xl border-2"
      style={{ width: size, height: size, borderColor: C.indigo + "30" }}
    >
      <div className="w-full h-full grid grid-cols-8 gap-px">
        {cells.map((on, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{ backgroundColor: on ? C.indigo : "transparent" }}
          />
        ))}
      </div>
    </div>
  )
}
