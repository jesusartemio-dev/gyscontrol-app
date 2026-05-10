'use client'

import React from 'react'
import { CheckCircle, Circle, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BotonRegenerarSeccion } from './BotonRegenerarSeccion'
import type { SeccionRegenerable } from '@/types/planTrabajo'

interface Props {
  seccion: SeccionRegenerable
  titulo: string
  completa?: boolean
  iaHabilitada: boolean
  iaOcupada?: boolean
  onRegen: (seccion: SeccionRegenerable, instrucciones?: string) => Promise<void>
  regenerando: SeccionRegenerable | null
  mensajeRegen: string
  onEditar?: () => void
  children: React.ReactNode
}

export function SeccionContainer({
  seccion,
  titulo,
  completa,
  iaHabilitada,
  iaOcupada,
  onRegen,
  regenerando,
  mensajeRegen,
  onEditar,
  children,
}: Props) {
  const isRegenerando = regenerando === seccion

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          {completa
            ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            : <Circle className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
          <span className="text-sm font-semibold text-gray-700">{titulo}</span>
        </div>
        <div className="flex items-center gap-1">
          {onEditar && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-gray-700"
              onClick={onEditar}
              title="Editar esta sección"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {iaHabilitada && (
            <BotonRegenerarSeccion
              seccion={seccion}
              isRegenerando={isRegenerando}
              iaOcupada={iaOcupada}
              onRegen={onRegen}
            />
          )}
        </div>
      </div>

      {/* Progress overlay during regeneration */}
      {isRegenerando && mensajeRegen && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500 shrink-0" />
          <span className="text-xs text-indigo-700 animate-pulse">{mensajeRegen}</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {!completa && !isRegenerando ? (
          <p className="text-xs text-muted-foreground italic">
            Sección no generada — usá el botón <span className="not-italic">↻</span> para generar con IA.
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
