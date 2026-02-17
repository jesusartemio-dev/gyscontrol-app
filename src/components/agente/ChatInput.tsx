'use client'

import { useState, useRef, useCallback } from 'react'
import { ArrowUp, Paperclip, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '@/lib/agente/types'

interface Props {
  onSend: (text: string, attachments?: ChatAttachment[]) => void
  disabled?: boolean
  placeholder?: string
}

const MAX_FILE_SIZE = 30 * 1024 * 1024 // 30MB

export function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSend = (text.trim() || attachments.length > 0) && !disabled

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if ((!trimmed && attachments.length === 0) || disabled) return
    onSend(trimmed || '(documento adjunto)', attachments.length > 0 ? attachments : undefined)
    setText('')
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [text, attachments, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`El archivo "${file.name}" excede el límite de 30MB`)
        continue
      }

      const isPdf = file.type === 'application/pdf'
      const isImage = file.type.startsWith('image/')

      if (!isPdf && !isImage) {
        alert(`Solo se aceptan archivos PDF e imágenes. "${file.name}" no es compatible.`)
        continue
      }

      const base64 = await fileToBase64(file)

      setAttachments((prev) => [
        ...prev,
        {
          type: 'pdf' as const,
          name: file.name,
          base64,
          mimeType: file.type,
        },
      ])
    }

    e.target.value = ''
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div className="p-3 bg-slate-50/80">
      {/* Card container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-shadow focus-within:shadow-md focus-within:border-blue-300">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1.5 text-xs text-blue-700"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="max-w-[130px] truncate">{att.name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="rounded-full p-0.5 hover:bg-blue-200 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-1 p-2">
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
              disabled
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
            title="Adjuntar PDF o imagen"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Describe lo que necesitas cotizar...'}
            disabled={disabled}
            rows={1}
            className={cn(
              'flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none',
              'placeholder:text-gray-400',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'scrollbar-thin'
            )}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200',
              canSend
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow-md active:scale-95'
                : 'bg-gray-100 text-gray-400'
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
