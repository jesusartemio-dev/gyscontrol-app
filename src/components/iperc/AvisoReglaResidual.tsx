'use client'

// ===================================================
// 📁 AvisoReglaResidual
// 📌 Avisa cuando alguna fila tiene el residual fuera de la regla del SSOMA.
//
// La regla: con control de ingeniería la severidad residual sube 1, con
// control administrativo la probabilidad residual sube 1.
//
// La app la aplica sola al guardar, así que una fila solo queda fuera si
// entró por otro camino: una versión revisada subida desde Excel, o una fila
// generada antes de que la regla existiera. Son justo los casos en los que
// nadie se iba a dar cuenta mirando la tabla.
// ===================================================

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2, Wand2 } from 'lucide-react'

interface FilaFuera {
  id: string
  numero: number
  tarea: string
  actual: string
  esperado: string
}

interface Props {
  proyectoId: string
  /** Cambia cuando las filas pudieron moverse. */
  refreshKey?: number
  onCorregido?: () => void
}

export function AvisoReglaResidual({ proyectoId, refreshKey, onCorregido }: Props) {
  const [fuera, setFuera] = useState<FilaFuera[]>([])
  const [total, setTotal] = useState(0)
  const [corrigiendo, setCorrigiendo] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/iperc/regla-residual`)
      if (!r.ok) return
      const d = await r.json()
      setFuera(d.fuera ?? [])
      setTotal(d.total ?? 0)
    } catch { /* el aviso es informativo: si falla, la pantalla sigue igual */ }
  }, [proyectoId])

  useEffect(() => { cargar() }, [cargar, refreshKey])

  if (fuera.length === 0) return null

  const corregir = async () => {
    setCorrigiendo(true)
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/iperc/regla-residual`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error ?? 'No se pudo recalcular'); return }
      toast.success(`${d.corregidas} fila(s) recalculadas`)
      await cargar()
      onCorregido?.()
    } finally {
      setCorrigiendo(false)
    }
  }

  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {fuera.length} de {total} filas tienen el riesgo residual fuera de la regla
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            Con control de ingeniería la severidad residual sube 1; con control administrativo,
            la probabilidad. Estas filas no lo cumplen, así que muestran el riesgo distinto de lo
            que diría el criterio del SSOMA.
          </p>

          <div className="mt-1.5 space-y-0.5">
            {fuera.slice(0, 5).map(f => (
              <p key={f.id} className="text-[11px] text-amber-900">
                <span className="font-mono">{String(f.numero).padStart(3, '0')}</span>
                {' · '}
                <span className="font-mono">{f.actual}</span>
                {' → debería ser '}
                <span className="font-mono font-semibold">{f.esperado}</span>
                {' · '}
                <span className="text-amber-800">{f.tarea}</span>
              </p>
            ))}
            {fuera.length > 5 && (
              <p className="text-[11px] text-amber-800">y {fuera.length - 5} más</p>
            )}
          </div>
        </div>

        <Button
          size="sm" variant="outline"
          className="shrink-0 border-amber-400 bg-white text-xs hover:bg-amber-100"
          onClick={corregir}
          disabled={corrigiendo}
        >
          {corrigiendo
            ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            : <Wand2 className="mr-1 h-3.5 w-3.5" />}
          Recalcular {fuera.length}
        </Button>
      </div>
    </div>
  )
}
