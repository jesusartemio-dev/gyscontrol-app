'use client'

import { useState, useEffect } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SECCIONES_LOTE_A = ['Objetivo', 'Alcance General', 'Alcance Detallado', 'EPP Requeridos', 'Restricciones', 'Referencias']
const SECCIONES_LOTE_B = ['Herramientas y Equipos', 'Personal Asignado', 'Matriz RACI', 'Histogramas', 'Cronograma Resumen', 'Responsabilidades']

interface Props {
  puedeGenerar: boolean
  iaHabilitada: boolean
  generando: boolean
  iaOcupada?: boolean
  mensajeProgreso: string
  progreso?: number
  onGenerar: () => Promise<void>
  destacar?: boolean
}

export function BotonGenerarIA({ puedeGenerar, iaHabilitada, generando, iaOcupada, mensajeProgreso, progreso = 0, onGenerar, destacar }: Props) {
  const [seccionIdx, setSeccionIdx] = useState(0)

  useEffect(() => {
    if (!generando) { setSeccionIdx(0); return }
    const interval = setInterval(() => setSeccionIdx(i => i + 1), 2500)
    return () => clearInterval(interval)
  }, [generando])

  const mensajeVisible = (): string => {
    if (!generando) return mensajeProgreso
    if (progreso >= 20 && progreso < 55) return `Generando ${SECCIONES_LOTE_A[seccionIdx % SECCIONES_LOTE_A.length]}...`
    if (progreso >= 55 && progreso < 85) return `Generando ${SECCIONES_LOTE_B[seccionIdx % SECCIONES_LOTE_B.length]}...`
    return mensajeProgreso
  }

  if (!iaHabilitada) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-xs text-muted-foreground">La generación con IA está deshabilitada para este proyecto.</p>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 rounded-lg border bg-white p-4 transition-all flex-1 ${destacar ? 'border-indigo-300 ring-2 ring-indigo-200 ring-offset-1' : ''}`}>
      <Button
        onClick={onGenerar}
        disabled={generando || iaOcupada}
        className={`bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 ${destacar && !generando ? 'animate-pulse' : ''}`}
      >
        {generando
          ? <><Loader2 className="animate-spin mr-2" size={14} />Generando...</>
          : <><Sparkles size={14} className="mr-2" />Generar con IA</>}
      </Button>

      {generando ? (
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate">{mensajeVisible()}</span>
            {progreso > 0 && (
              <span className="text-xs font-medium text-indigo-600 shrink-0">{progreso}%</span>
            )}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">
          {puedeGenerar
            ? 'Genera o regenera todas las secciones del plan con Sonnet.'
            : 'Completá los prerrequisitos para generar con IA.'}
        </span>
      )}
    </div>
  )
}
