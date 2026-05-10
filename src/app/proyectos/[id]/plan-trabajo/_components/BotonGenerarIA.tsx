'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  puedeGenerar: boolean
  iaHabilitada: boolean
  generando: boolean
  iaOcupada?: boolean
  mensajeProgreso: string
  onGenerar: () => Promise<void>
}

export function BotonGenerarIA({ puedeGenerar, iaHabilitada, generando, iaOcupada, mensajeProgreso, onGenerar }: Props) {
  if (!iaHabilitada) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-xs text-muted-foreground">La generación con IA está deshabilitada para este proyecto.</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
      <Button
        onClick={onGenerar}
        disabled={generando || iaOcupada}
        className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
      >
        {generando
          ? <><Loader2 className="animate-spin mr-2" size={14} />Generando...</>
          : <><Sparkles size={14} className="mr-2" />Generar con IA</>}
      </Button>
      {generando && mensajeProgreso && (
        <span className="text-sm text-muted-foreground animate-pulse">{mensajeProgreso}</span>
      )}
      {!generando && (
        <span className="text-xs text-muted-foreground">
          {puedeGenerar
            ? 'Genera o regenera todas las secciones del plan con Sonnet.'
            : 'Completá los prerrequisitos para generar con IA.'}
        </span>
      )}
    </div>
  )
}
