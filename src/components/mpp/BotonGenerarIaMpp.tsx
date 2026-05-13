'use client'

import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  generando: boolean
  preRequisitosOk: boolean
  statusMsg: string
  progreso: number | null
  onClick: () => void
}

export function BotonGenerarIaMpp({ generando, preRequisitosOk, statusMsg, progreso, onClick }: Props) {
  const disabled = generando || !preRequisitosOk

  return (
    <div className="space-y-1.5">
      <Button
        onClick={onClick}
        disabled={disabled}
        className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-60"
        size="sm"
      >
        {generando ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        {generando ? 'Generando con IA…' : 'Generar con IA'}
      </Button>

      {generando && (
        <div className="space-y-1 max-w-sm">
          {statusMsg && (
            <p className="text-xs text-muted-foreground truncate">{statusMsg}</p>
          )}
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: progreso != null ? `${progreso}%` : '0%' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
