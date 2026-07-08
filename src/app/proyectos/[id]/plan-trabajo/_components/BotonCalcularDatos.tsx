'use client'

import { Loader2, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  puedeGenerar: boolean
  calculando: boolean
  disabled?: boolean
  destacar?: boolean
  onCalcular: () => Promise<void>
}

// Etapa 1 del flujo: "Generar datos" — personalAsignado, matrizRaci, histogramas,
// cronogramaResumen y referencias, calculados por servidor sin IA (instantáneo).
export function BotonCalcularDatos({ puedeGenerar, calculando, disabled, destacar, onCalcular }: Props) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border bg-white p-4 transition-all flex-1 ${destacar ? 'border-emerald-300 ring-2 ring-emerald-200 ring-offset-1' : ''}`}>
      <Button
        onClick={onCalcular}
        disabled={calculando || disabled || !puedeGenerar}
        className={`bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 ${destacar && !calculando ? 'animate-pulse' : ''}`}
      >
        {calculando
          ? <><Loader2 className="animate-spin mr-2" size={14} />Calculando...</>
          : <><Calculator size={14} className="mr-2" />1. Generar datos</>}
      </Button>
      <span className="text-xs text-muted-foreground">
        {puedeGenerar
          ? 'Calcula personal, RACI, histogramas y cronograma directo de la base de datos (sin IA, instantáneo).'
          : 'Completá los prerrequisitos (organigrama, cronograma, cotización aprobada) para calcular los datos.'}
      </span>
    </div>
  )
}
