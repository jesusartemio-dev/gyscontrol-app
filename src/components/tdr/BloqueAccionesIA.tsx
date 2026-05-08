'use client'

import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface Props {
  bloque: string
  disabled?: boolean
  onExtraerConIA?: () => void | Promise<void>
}

export function BloqueAccionesIA({
  bloque,
  disabled = true,
  onExtraerConIA,
}: Props) {
  // Placeholder. La lógica real se implementa en el Bloque 3.
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || !onExtraerConIA}
      onClick={onExtraerConIA}
      title={`Extraer datos del bloque ${bloque} con IA`}
    >
      <Sparkles className="mr-1 h-3 w-3" />
      Extraer con IA
    </Button>
  )
}
