'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { ChatPanel } from './ChatPanel'

export function ChatButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all duration-200 hover:scale-110 hover:shadow-[0_6px_28px_rgba(37,99,235,0.5)] active:scale-95"
        title="Asistente GYS"
      >
        <Sparkles className="h-6 w-6 transition-transform duration-200 group-hover:rotate-12" />
        {/* Badge IA */}
        <span className="absolute -top-1 -right-1 flex h-5 w-auto min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-900 shadow-sm">
          IA
        </span>
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-blue-500 opacity-0 animate-ping" />
        )}
      </button>
      <ChatPanel open={open} onOpenChange={setOpen} />
    </>
  )
}
