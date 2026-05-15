'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export interface CeldaDetalleData {
  nombrePersona?: string
  fecha: string // YYYY-MM-DD
  celda: {
    tipo: 'proyecto' | 'ausencia'
    turno: string
    proyecto?: { id: string; codigo: string; nombre: string; color?: string }
    ausencia?: { nombre?: string; tipo?: string; codigo?: string; color?: string | null }
    esExcepcional: boolean
    notas: string | null
  } | null
}

interface Props {
  open: boolean
  onClose: () => void
  data: CeldaDetalleData | null
}

const TURNO_LABELS: Record<string, string> = {
  dia_completo: 'Día completo',
  // turno_a/b/c/noche: pendientes de definición de horarios
}

export function CeldaDetalleModal({ open, onClose, data }: Props) {
  if (!data) return null

  const fechaDate = new Date(data.fecha + 'T00:00:00.000Z')
  const fechaLabel = format(fechaDate, "EEEE d 'de' MMMM yyyy", { locale: es })
  const { celda } = data

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base capitalize">{fechaLabel}</DialogTitle>
          {data.nombrePersona && (
            <p className="text-sm text-muted-foreground">{data.nombrePersona}</p>
          )}
        </DialogHeader>

        {!celda && (
          <p className="text-sm text-muted-foreground py-2">Sin asignación este día.</p>
        )}

        {celda?.tipo === 'proyecto' && (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                Proyecto
              </p>
              <p className="text-sm font-medium">
                [{celda.proyecto?.codigo}] {celda.proyecto?.nombre}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                Turno
              </p>
              <p className="text-sm">{TURNO_LABELS[celda.turno] ?? celda.turno}</p>
            </div>
            {celda.notas && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                  Notas
                </p>
                <p className="text-sm">{celda.notas}</p>
              </div>
            )}
            {celda.esExcepcional && (
              <p className="text-xs text-amber-600 font-medium">⏰ Día excepcional</p>
            )}
          </div>
        )}

        {celda?.tipo === 'ausencia' && (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                Tipo de ausencia
              </p>
              <p className="text-sm font-medium">
                {celda.ausencia?.nombre ?? celda.ausencia?.tipo ?? 'Ausencia'}
              </p>
            </div>
            {celda.notas && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                  Notas
                </p>
                <p className="text-sm">{celda.notas}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
