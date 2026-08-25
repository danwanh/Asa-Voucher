"use client"

import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import type { Editor } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import DOMPurify from "dompurify"
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Redo2, RemoveFormatting, Strikethrough, Undo2 } from "lucide-react"

const extensions = [StarterKit]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function cmsContentToEditorHtml(value: string) {
  if (!value) return ""
  if (/<[a-z][\s\S]*>/i.test(value)) return value
  return value
    .split(/\r?\n+/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("")
}

export function cmsContentToPlainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

const toolbarItems = [
  { label: "Đậm", icon: Bold, command: (editor: Editor | null) => editor?.chain().focus().toggleBold().run(), active: (editor: Editor | null) => editor?.isActive("bold") },
  { label: "Nghiêng", icon: Italic, command: (editor: Editor | null) => editor?.chain().focus().toggleItalic().run(), active: (editor: Editor | null) => editor?.isActive("italic") },
  { label: "Gạch ngang", icon: Strikethrough, command: (editor: Editor | null) => editor?.chain().focus().toggleStrike().run(), active: (editor: Editor | null) => editor?.isActive("strike") },
  { label: "Tiêu đề lớn", icon: Heading1, command: (editor: Editor | null) => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: (editor: Editor | null) => editor?.isActive("heading", { level: 2 }) },
  { label: "Tiêu đề nhỏ", icon: Heading2, command: (editor: Editor | null) => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: (editor: Editor | null) => editor?.isActive("heading", { level: 3 }) },
  { label: "Danh sách", icon: List, command: (editor: Editor | null) => editor?.chain().focus().toggleBulletList().run(), active: (editor: Editor | null) => editor?.isActive("bulletList") },
  { label: "Danh sách đánh số", icon: ListOrdered, command: (editor: Editor | null) => editor?.chain().focus().toggleOrderedList().run(), active: (editor: Editor | null) => editor?.isActive("orderedList") },
]

export function CmsRichTextEditor({ value, onChange, placeholder = "Nhập nội dung..." }: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const editor = useEditor({
    extensions,
    content: cmsContentToEditorHtml(value),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "cms-rich-text-editor", "data-placeholder": placeholder },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML()
      onChange(currentEditor.getText().trim() ? html : "")
    },
  })

  useEffect(() => {
    if (!editor) return
    const nextContent = cmsContentToEditorHtml(value)
    if (nextContent !== editor.getHTML() && nextContent !== "") {
      editor.commands.setContent(nextContent, { emitUpdate: false })
    }
    if (!value && editor.getText().trim()) editor.commands.clearContent(true)
  }, [editor, value])

  return (
    <div className="overflow-hidden rounded-xl border-2" style={{ borderColor: "#E5E7EB" }}>
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-2" style={{ borderColor: "#E5E7EB", backgroundColor: "#FAFAF9" }}>
        {toolbarItems.map(({ label, icon: Icon, command, active }) => (
          <button key={label} type="button" title={label} aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={() => command(editor)}
            className="rounded-lg p-2 transition-colors hover:bg-white" style={{ color: active(editor) ? "#0F766E" : "#6B7280", backgroundColor: active(editor) ? "#CCFBF1" : "transparent" }}>
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <span className="mx-1 h-5 w-px" style={{ backgroundColor: "#E5E7EB" }} />
        <button type="button" title="Xóa định dạng" aria-label="Xóa định dạng" onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} className="rounded-lg p-2 hover:bg-white" style={{ color: "#6B7280" }}>
          <RemoveFormatting className="h-4 w-4" />
        </button>
        <button type="button" title="Hoàn tác" aria-label="Hoàn tác" onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().undo().run()} className="rounded-lg p-2 hover:bg-white" style={{ color: "#6B7280" }}>
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" title="Làm lại" aria-label="Làm lại" onMouseDown={(event) => event.preventDefault()} onClick={() => editor?.chain().focus().redo().run()} className="rounded-lg p-2 hover:bg-white" style={{ color: "#6B7280" }}>
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

export function CmsRichTextContent({ html, className = "" }: { html: string; className?: string }) {
  const safeHtml = DOMPurify.sanitize(cmsContentToEditorHtml(html), {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "code", "pre"],
    ALLOWED_ATTR: [],
  })

  return <div className={`cms-rich-text-content ${className}`} dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
