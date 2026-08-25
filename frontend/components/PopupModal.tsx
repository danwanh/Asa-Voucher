"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { C } from "@/utils/constants"
import { cmsContentService } from "@/services/cmsContentService"
import type { CmsContent } from "@/types"
import { CmsRichTextContent } from "@/components/CmsRichText"

const LAST_CLOSED_KEY = "asa_popup_last_closed_at_v1"
const DISPLAY_INTERVAL_MS = 24 * 60 * 60 * 1000

function wasClosedWithin24Hours(): boolean {
  try {
    const lastClosedAt = Number(localStorage.getItem(LAST_CLOSED_KEY))
    const elapsed = Date.now() - lastClosedAt
    return Number.isFinite(lastClosedAt) && elapsed >= 0 && elapsed < DISPLAY_INTERVAL_MS
  } catch {
    return false
  }
}

function markClosed() {
  try {
    localStorage.setItem(LAST_CLOSED_KEY, String(Date.now()))
  } catch {
    // bỏ qua nếu localStorage không khả dụng
  }
}

interface PopupModalProps {
  isHome: boolean
}

export function PopupModal({ isHome }: PopupModalProps) {
  const [popups, setPopups] = useState<CmsContent[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const requestStarted = useRef(false)

  useEffect(() => {
    if (!isHome) {
      requestStarted.current = false
      setVisible(false)
      return
    }
    if (requestStarted.current || wasClosedWithin24Hours()) return
    requestStarted.current = true

    let cancelled = false
    cmsContentService.listPublic("popup")
      .then((items) => {
        if (cancelled) return
        if (items.length === 0) return
        setPopups(items)
        setActiveIndex(0)
        setVisible(true)
      })
      .catch((error) => {
        requestStarted.current = false
        console.error("Không thể tải popup trang chủ", error)
      })
    return () => {
      cancelled = true
    }
  }, [isHome])

  const popup = popups[activeIndex]
  if (!popup || !visible || !isHome) return null

  const hasPrevious = activeIndex > 0
  const hasNext = activeIndex < popups.length - 1
  const closePopup = () => {
    markClosed()
    setVisible(false)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={closePopup}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={popup.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closePopup}
          aria-label="Đóng popup"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {popup.image_url && (
          <div className="max-h-64 overflow-hidden">
            <img src={popup.image_url} alt={popup.title} className="w-full object-cover" />
          </div>
        )}

        <div className="p-6">
          <h2 className="text-xl font-black" style={{ color: C.indigo, fontFamily: "'Nunito', sans-serif" }}>{popup.title}</h2>
          {popup.content && (
            <CmsRichTextContent html={popup.content} className="mt-2 text-sm leading-relaxed" />
          )}
          <div className="mt-6 flex items-center justify-between gap-3">
            {popups.length > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveIndex((index) => index - 1)}
                  disabled={!hasPrevious}
                  aria-label="Popup trước"
                  className="rounded-full border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ borderColor: "#E2DFC8", color: C.indigo }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-12 text-center text-xs font-bold" style={{ color: "#8A8DA8" }}>
                  {activeIndex + 1} / {popups.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveIndex((index) => index + 1)}
                  disabled={!hasNext}
                  aria-label="Popup tiếp theo"
                  className="rounded-full border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ borderColor: "#E2DFC8", color: C.indigo }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : <span />}
            <button
              type="button"
              onClick={closePopup}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: C.teal }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
