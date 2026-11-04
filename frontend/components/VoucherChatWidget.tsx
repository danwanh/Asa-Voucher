"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MessageCircle, RotateCcw, Send, Sparkles, Star, X } from "lucide-react"
import { C, fmt } from "@/utils/constants"
import { aiChatService, type ChatRole, type ChatVoucher } from "@/services/aiChatService"

type ChatEntry = {
  role: ChatRole
  content: string
  vouchers?: ChatVoucher[]
  isError?: boolean
  isWelcome?: boolean
}

const STORAGE_KEY = "asa_voucher_chat_v1"
const MAX_INPUT = 500
const SUGGESTIONS = [
  "Cà phê ở TP.HCM dưới 100k",
  "Vé xem phim rẻ nhất",
  "Voucher giảm nhiều nhất",
]
const WELCOME: ChatEntry = {
  role: "assistant",
  isWelcome: true,
  content: "Chào bạn! Mình là trợ lý tìm voucher của Asa. Bạn muốn tìm gì, ở đâu, tầm giá bao nhiêu?"
}

function loadHistory(): ChatEntry[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null")
    return Array.isArray(saved) && saved.length > 0 ? saved : [WELCOME]
  } catch {
    return [WELCOME]
  }
}

function saveHistory(entries: ChatEntry[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-30)))
  } catch {
    // ignore: storage may be unavailable (private mode)
  }
}

function getChatErrorMessage(error: unknown) {
  const err = error as { code?: string; response?: { status?: number; data?: { error?: { message?: string } } } }
  if (err?.code === "ECONNABORTED") return "Trợ lý phản hồi quá lâu, bạn thử lại nhé."
  const status = err?.response?.status
  if (status === 503) return "Trợ lý AI tạm thời chưa sẵn sàng."
  if (status === 429) return "Bạn hỏi hơi nhanh, đợi vài phút rồi thử lại nhé."
  return err?.response?.data?.error?.message ?? "Có lỗi khi tìm voucher, bạn thử lại nhé."
}

export function VoucherChatWidget() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<ChatEntry[]>([WELCOME])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // Restore after mount to avoid a hydration mismatch
  useEffect(() => {
    setEntries(loadHistory())
  }, [])

  useEffect(() => {
    saveHistory(entries)
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [entries, open])

  const send = async (text: string) => {
    const content = text.trim().slice(0, MAX_INPUT)
    if (!content || isSending) return

    const next = [...entries, { role: "user" as const, content }]
    setEntries(next)
    setInput("")
    setIsSending(true)
    try {
      // Only real turns go to the backend: no welcome text, no error bubbles
      const history = next
        .filter((entry) => !entry.isWelcome && !entry.isError)
        .slice(-10)
        .map(({ role, content: message }) => ({ role, content: message }))
      const result = await aiChatService.askVoucherChat(history)
      setEntries((current) => [...current, { role: "assistant", content: result.reply, vouchers: result.vouchers }])
    } catch (error) {
      setEntries((current) => [...current, { role: "assistant", content: getChatErrorMessage(error), isError: true }])
    } finally {
      setIsSending(false)
    }
  }

  const reset = () => {
    setEntries([WELCOME])
    setInput("")
  }

  const openVoucher = (id: string) => {
    setOpen(false)
    router.push(`/vouchers/${id}`)
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý tìm voucher"
          className="fixed z-40 right-4 bottom-20 md:bottom-6 inline-flex items-center gap-2 pl-4 pr-5 py-3 rounded-full shadow-lg text-white font-bold text-sm hover:scale-105 transition-transform"
          style={{ backgroundColor: C.peach }}
        >
          <MessageCircle className="w-5 h-5" />
          Tìm voucher với AI
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Trợ lý tìm voucher"
          className="fixed z-50 inset-x-2 bottom-2 top-16 md:inset-auto md:right-6 md:bottom-6 md:w-[380px] md:h-[600px] md:max-h-[calc(100vh-48px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-black/5 overflow-hidden"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          <div className="flex items-center gap-2 px-4 py-3 text-white" style={{ backgroundColor: C.indigo }}>
            <Sparkles className="w-4 h-4" />
            <div className="flex-1">
              <p className="font-bold text-sm">Trợ lý tìm voucher</p>
              <p className="text-[11px] opacity-75">Gợi ý từ AI, kết quả lấy từ voucher đang bán</p>
            </div>
            <button type="button" onClick={reset} aria-label="Cuộc trò chuyện mới" title="Cuộc trò chuyện mới" className="p-1.5 rounded-lg hover:bg-white/10">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="p-1.5 rounded-lg hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3" style={{ backgroundColor: C.content }}>
            {entries.map((entry, index) => (
              <div key={index} className={entry.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={entry.role === "user" ? "max-w-[85%]" : "max-w-[92%] w-full"}>
                  <div
                    className="inline-block px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap"
                    style={
                      entry.role === "user"
                        ? { backgroundColor: C.peach, color: "white" }
                        : { backgroundColor: "white", color: entry.isError ? "#B91C1C" : C.indigo }
                    }
                  >
                    {entry.content}
                  </div>
                  {entry.vouchers && entry.vouchers.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {entry.vouchers.map((voucher) => (
                        <ChatVoucherItem key={voucher.id} voucher={voucher} onOpen={() => openVoucher(voucher.id)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "#8A8DA8" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tìm voucher...
              </div>
            )}

            {entries.length === 1 && !isSending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-white hover:shadow-sm"
                    style={{ borderColor: C.apricot, color: C.indigo }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 p-3 border-t border-black/5"
            onSubmit={(event) => {
              event.preventDefault()
              void send(input)
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={MAX_INPUT}
              placeholder="VD: buffet ở Hà Nội dưới 300k"
              aria-label="Nhập yêu cầu tìm voucher"
              className="flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none border-[#E2DFC8]"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              aria-label="Gửi"
              className="p-2.5 rounded-xl text-white disabled:opacity-50"
              style={{ backgroundColor: C.peach }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function ChatVoucherItem({ voucher, onOpen }: { voucher: ChatVoucher; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex gap-3 p-2 rounded-xl bg-white text-left hover:shadow-md transition-shadow border border-black/5"
    >
      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: C.muted }}>
        {voucher.imageUrl && <img src={voucher.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: C.indigo }}>{voucher.name}</p>
        {voucher.partnerName && <p className="text-[11px] truncate" style={{ color: "#8A8DA8" }}>{voucher.partnerName}</p>}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-black" style={{ color: C.peach }}>{fmt(voucher.sellingPrice)}</span>
          {voucher.originalPrice > voucher.sellingPrice && (
            <span className="text-[11px] line-through" style={{ color: "#9CA3AF" }}>{fmt(voucher.originalPrice)}</span>
          )}
          {voucher.discountRate > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: C.apricot + "60", color: "#6B4F00" }}>
              -{voucher.discountRate}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "#8A8DA8" }}>
          {voucher.reviewCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-current" style={{ color: C.apricot }} /> {voucher.averageRating}
            </span>
          )}
          {voucher.applicableArea && <span className="truncate">{voucher.applicableArea}</span>}
        </div>
      </div>
    </button>
  )
}
