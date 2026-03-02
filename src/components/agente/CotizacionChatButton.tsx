'use client'

import { useState, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatPanel } from './ChatPanel'

interface Props {
  cotizacionId: string
}

export function CotizacionChatButton({ cotizacionId }: Props) {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    fetch('/api/agente/features')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setEnabled(data.chatCotizacion !== false) })
      .catch(() => {})
  }, [])

  if (!enabled) return null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 text-blue-700 border-blue-300 hover:bg-blue-50"
      >
        <MessageSquare className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Asistente</span>
      </Button>
      <ChatPanel open={open} onOpenChange={setOpen} cotizacionId={cotizacionId} />
    </>
  )
}
