'use client'

import type { PlanReferencia } from '@/types/planTrabajo'
import { TdrEditableTable, type ColumnaTabla } from '@/components/tdr/TdrEditableTable'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  valor: PlanReferencia[]
  onSave: (v: PlanReferencia[]) => Promise<void>
  onCancel: () => void
}

const COLUMNS: ColumnaTabla<PlanReferencia>[] = [
  { key: 'titulo', label: 'Título', type: 'text', required: true },
  { key: 'codigoDocumento', label: 'Código', type: 'text', width: '140px' },
  {
    key: 'origen',
    label: 'Origen',
    type: 'select',
    required: true,
    width: '140px',
    options: [
      { value: 'TDR', label: 'TDR' },
      { value: 'COTIZACION', label: 'Cotización' },
      { value: 'NORMATIVA', label: 'Normativa' },
      { value: 'MANUAL', label: 'Manual' },
    ],
  },
]

const filaVacia = (): PlanReferencia => ({ titulo: '', codigoDocumento: '', origen: 'MANUAL' })

export function ReferenciasEditor({ valor, onSave, onCancel }: Props) {
  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Referencias</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <TdrEditableTable
            data={valor}
            columns={COLUMNS}
            filaVacia={filaVacia}
            onSave={onSave}
            onCancel={onCancel}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
