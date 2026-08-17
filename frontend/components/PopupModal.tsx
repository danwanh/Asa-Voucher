"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { C } from "@/utils/constants"
import { cmsContentService } from "@/services/cmsContentService"
import type { CmsContent } from "@/types"

const STORAGE_PREFIX = "asa_popup_dismissed_v1"

function dismissedKey(popupId: string) {
  return `${STORAGE_PREFIX}_${popupId}`
}

function neverShowAgain(popupId: string) {
  try {
    localStorage.setItem(dismissedKey(popupId), "1")
  } catch {
    // bỏ qua nếu localStorage không khả dụng
  }
}

function wasDismissed(popupId: string): boolean {
  try {
    return localStorage.getItem(dismissedKey(popupId)) === "1"
  } catch {
    return false
  }
}

export function PopupModal() {
  const [popup, setPopup] = useState<CmsContent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    cmsContentService.listPublic("popup")
      .then((items) => {
        if (cancelled) return
        if (items.length === 0) return
        const first = items[0]
        if (wasDismissed(first.id)) return
        setPopup(first)
        setVisible(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!popup || !visible) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={() => setVisible(false)}
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
          onClick={() => setVisible(false)}
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
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line" style={{ color: "#4B5563" }}>{popup.content}</p>
          )}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: C.teal }}
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => { neverShowAgain(popup.id); setVisible(false) }}
              className="flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-bold"
              style={{ borderColor: "#E2DFC8", color: C.indigo }}
            >
              Không hiện nữa
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}