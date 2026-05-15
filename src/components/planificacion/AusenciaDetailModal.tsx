'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CeldaEntry {
  id: string
  turno: string
  tipo: 'proyecto' | 'ausencia'
  ausencia?: { tipo: string | undefined; codigo: string | undefined; color: string | undefined }
  esExcepcional: boolean
  notas: string | null
}

const TURNO_LABELS: Record<string, string> = {
  dia_completo: 'Día completo',
  am: 'Solo mañana (AM)',
  pm: 'Solo tarde (PM)',
}

interface Props {
  open: boolean
  onClose: () => void
  celda: CeldaEntry | null
}

export default function AusenciaDetailModal({ open, onClose, celda }: Props) {
  if (!open || !celda) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-sm rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Detalle de ausencia</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tipo</span>
              <span className="text-sm font-medium">{celda.ausencia?.tipo ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Código</span>
              <span className="text-sm font-medium font-mono">{celda.ausencia?.codigo ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Turno</span>
              <span className="text-sm font-medium">{TURNO_LABELS[celda.turno] ?? celda.turno}</span>
            </div>
            {celda.notas && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-muted-foreground shrink-0">Notas</span>
                <span className="text-sm text-right">{celda.notas}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Para gestionar esta ausencia, accede al módulo de Ausencias.
          </div>
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}
