'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ChatPanelContent } from './ChatPanelContent'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cotizacionId?: string
  currentUserId?: string
}

export function ChatPanel({ open, onOpenChange, cotizacionId, currentUserId }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-[520px] [&>button:first-child]:hidden"
      >
        {/* Hidden title for accessibility */}
        <SheetHeader className="sr-only">
          <SheetTitle>Asistente GYS</SheetTitle>
          <SheetDescription>Chat con el asistente comercial de GYS</SheetDescription>
        </SheetHeader>

        <ChatPanelContent
          cotizacionId={cotizacionId}
          mode="sheet"
          onClose={() => onOpenChange(false)}
          currentUserId={currentUserId}
        />
      </SheetContent>
    </Sheet>
  )
}
