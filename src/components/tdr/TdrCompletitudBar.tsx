'use client'

import { Progress } from '@/components/ui/progress'
import { EstadoBloqueBadge } from './EstadoBloqueBadge'
import type { BloquesCompletitud, BloqueId, EstadoBloque } from '@/types/tdr'

interface Props {
  bloques: BloquesCompletitud | null | undefined
  onBloqueClick?: (bloque: BloqueId) => void
}

const BLOQUES_LABELS: Record<BloqueId, string> = {
  identificacion: 'Identificación',
  alcance: 'Alcance',
  suministros: 'Suministros',
  personal: 'Personal',
  plazos: 'Plazos',
  ssoma: 'SSOMA',
  comercial: 'Comercial',
  entregables: 'Entregables',
}

const BLOQUES_ORDEN: BloqueId[] = [
  'identificacion', 'alcance', 'suministros', 'personal',
  'plazos', 'ssoma', 'comercial', 'entregables',
]

export function TdrCompletitudBar({ bloques, onBloqueClick }: Props) {
  const estados: BloquesCompletitud =
    bloques ??
    (Object.fromEntries(
      BLOQUES_ORDEN.map(id => [id, 'vacio' as EstadoBloque]),
    ) as BloquesCompletitud)

  const completos = Object.values(estados).filter(e => e === 'completo').length
  const parciales = Object.values(estados).filter(e => e === 'parcial').length
  const porcentaje = Math.round(((completos + parciales * 0.5) / 8) * 100)

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {/* Barra horizontal con porcentaje */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Completitud del análisis</span>
          <span className="text-sm font-semibold tabular-nums">{porcentaje}%</span>
        </div>
        <Progress value={porcentaje} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {completos} de 8 bloques completos · {parciales} parciales
        </p>
      </div>

      {/* 8 indicadores separados */}
      <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
        {BLOQUES_ORDEN.map(id => {
          const estado = estados[id]
          const clickable = onBloqueClick != null
          return (
            <button
              key={id}
              type="button"
              disabled={!clickable}
              onClick={() => onBloqueClick?.(id)}
              className={`flex flex-col items-start gap-1 rounded-md border p-2 text-left transition ${
                clickable ? 'hover:bg-muted cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {BLOQUES_LABELS[id]}
              </span>
              <EstadoBloqueBadge estado={estado} size="sm" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
