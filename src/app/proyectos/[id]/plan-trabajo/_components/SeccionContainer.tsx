'use client'

import React from 'react'
import { CheckCircle, Circle, Hand, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BotonRegenerarSeccion } from './BotonRegenerarSeccion'
import type { SeccionRegenerable } from '@/types/planTrabajo'
import type { EdicionManual } from '@/lib/planTrabajo/edicionesManuales'

interface Props {
  seccion: SeccionRegenerable
  titulo: string
  /** De dónde sale el contenido: redactado por IA, calculado de la BD o texto fijo de plantilla. */
  tipo: 'ia' | 'calculado' | 'plantilla'
  completa?: boolean
  iaHabilitada: boolean
  iaOcupada?: boolean
  onRegen: (seccion: SeccionRegenerable, instrucciones?: string) => Promise<void>
  regenerando: SeccionRegenerable | null
  mensajeRegen: string
  onEditar?: () => void
  /** Editada a mano desde su última generación. */
  edicion?: EdicionManual
  /** Solo Alcance Detallado: textos editados a mano. */
  textosEditadosAlcance?: number
  children: React.ReactNode
}

const BADGE_TIPO = {
  ia: { texto: 'IA', clase: 'bg-indigo-50 text-indigo-700 border-indigo-200', title: 'Redactada con IA' },
  calculado: { texto: 'Calculado', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200', title: 'Calculada desde organigrama y cronograma, sin IA' },
  plantilla: { texto: 'Plantilla', clase: 'bg-gray-50 text-gray-600 border-gray-200', title: 'Texto fijo de plantilla (no se exporta)' },
} as const

export function SeccionContainer({
  seccion,
  titulo,
  tipo,
  completa,
  iaHabilitada,
  iaOcupada,
  onRegen,
  regenerando,
  mensajeRegen,
  onEditar,
  edicion,
  textosEditadosAlcance = 0,
  children,
}: Props) {
  const isRegenerando = regenerando === seccion
  const badge = BADGE_TIPO[tipo]
  const editada = !!edicion || textosEditadosAlcance > 0

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      {/* Header */}
      {/* En celular el título baja de línea y los botones nunca se encogen: antes
          el título los empujaba fuera de la tarjeta (overflow-hidden) y el lápiz
          y el ↻ desaparecían. */}
      <div className="flex items-start justify-between gap-2 px-3 sm:px-4 py-2.5 bg-gray-50 border-b">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          {completa
            ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            : <Circle className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
          <span className="text-sm font-semibold text-gray-700">{titulo}</span>
          <span className={`rounded border px-1.5 py-0 text-[10px] font-medium ${badge.clase}`} title={badge.title}>{badge.texto}</span>
          {editada && (
            <span
              className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-700"
              title={edicion
                ? `Editada a mano el ${new Date(edicion.fecha).toLocaleDateString('es-PE')} por ${edicion.por}`
                : `${textosEditadosAlcance} texto(s) editado(s) a mano (se respetan al regenerar)`}
            >
              <Hand className="h-2.5 w-2.5" />
              {edicion ? 'Editada a mano' : `${textosEditadosAlcance} editado(s)`}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
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
              tieneContenido={completa}
              edicion={edicion}
              textosEditadosAlcance={textosEditadosAlcance}
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
      <div className="p-3 sm:p-4">
        {!completa && !isRegenerando ? (
          <p className="text-xs text-muted-foreground italic">
            {tipo === 'calculado'
              ? <>Sección no calculada — usá &quot;Generar datos&quot; o el botón <span className="not-italic">↻</span>.</>
              : <>Sección no generada — usá el botón <span className="not-italic">↻</span> para generar con IA.</>}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
