'use client'

import type { PlanCronograma, PlanCronogramaFila } from '@/types/planTrabajo'
import { TdrEditableTable, type ColumnaTabla } from '@/components/tdr/TdrEditableTable'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  valor: PlanCronograma
  onSave: (v: PlanCronograma) => Promise<void>
  onCancel: () => void
}

const COLUMNS: ColumnaTabla<PlanCronogramaFila>[] = [
  { key: 'fase', label: 'Fase', type: 'text', required: true, width: '130px' },
  { key: 'edt', label: 'EDT', type: 'text', required: true, width: '160px' },
  { key: 'actividad', label: 'Actividad', type: 'text' },
  { key: 'fechaInicio', label: 'Inicio', type: 'text', width: '110px', placeholder: 'dd/mm/yyyy' },
  { key: 'fechaFin', label: 'Fin', type: 'text', width: '110px', placeholder: 'dd/mm/yyyy' },
  { key: 'horasPlan', label: 'Horas', type: 'number', width: '80px' },
]

const filaVacia = (): PlanCronogramaFila => ({
  fase: '',
  edt: '',
  actividad: '',
  fechaInicio: '',
  fechaFin: '',
  horasPlan: 0,
})

export function CronogramaResumenEditor({ valor, onSave, onCancel }: Props) {
  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Cronograma Resumen</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <TdrEditableTable
            data={valor.filas}
            columns={COLUMNS}
            filaVacia={filaVacia}
            onSave={async (rows) => onSave({ filas: rows })}
            onCancel={onCancel}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
