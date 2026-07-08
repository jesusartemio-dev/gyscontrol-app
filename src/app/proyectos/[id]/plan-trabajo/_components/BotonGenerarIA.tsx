'use client'

import { Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  puedeGenerar: boolean
  iaHabilitada: boolean
  generando: boolean
  iaOcupada?: boolean
  mensajeProgreso: string
  progreso?: number
  onGenerar: () => Promise<void>
  onCancelar?: () => void
  destacar?: boolean
  motivoBloqueo?: string
}

// Etapa 2 del flujo: "Redactar con IA" — objetivo, alcance general/detallado,
// EPP, herramientas y restricciones. Solo se habilita cuando la Etapa 1
// (Generar datos) ya completó personalAsignado/matrizRaci/histogramas/etc.
export function BotonGenerarIA({ puedeGenerar, iaHabilitada, generando, iaOcupada, mensajeProgreso, progreso = 0, onGenerar, onCancelar, destacar, motivoBloqueo }: Props) {
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
        disabled={generando || iaOcupada || !puedeGenerar}
        className={`bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 ${destacar && !generando ? 'animate-pulse' : ''}`}
      >
        {generando
          ? <><Loader2 className="animate-spin mr-2" size={14} />Redactando...</>
          : <><Sparkles size={14} className="mr-2" />2. Redactar con IA</>}
      </Button>

      {generando ? (
        <>
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground truncate">{mensajeProgreso}</span>
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
          {onCancelar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelar}
              className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Cancelar generación"
            >
              <X size={14} />
            </Button>
          )}
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          {puedeGenerar
            ? 'Redacta objetivo, alcance, EPP, herramientas y restricciones con Sonnet.'
            : motivoBloqueo ?? 'Completá los prerrequisitos para generar con IA.'}
        </span>
      )}
    </div>
  )
}
