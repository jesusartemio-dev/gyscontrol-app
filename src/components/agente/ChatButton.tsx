'use client'

import { useState, useEffect } from 'react'
import { MessageSquareText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatPanel } from './ChatPanel'

export function ChatButton() {
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(true)

  // Stop pulsing after the user opens the chat for the first time
  useEffect(() => {
    if (open) setPulse(false)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full',
          'bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white',
          'shadow-lg transition-all duration-200',
          'hover:scale-[1.08] hover:shadow-xl active:scale-95'
        )}
        title="Asistente GYS"
      >
        {/* Icon transition */}
        <MessageSquareText
          className={cn(
            'absolute h-7 w-7 transition-all duration-300',
            open ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          )}
        />
        <X
          className={cn(
            'absolute h-6 w-6 transition-all duration-300',
            open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          )}
        />

        {/* IA badge */}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-900 shadow-sm">
            IA
          </span>
        )}

        {/* Pulse ring */}
        {pulse && !open && (
          <span className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-20" />
        )}
      </button>
      <ChatPanel open={open} onOpenChange={setOpen} />
    </>
  )
}
