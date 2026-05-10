'use client'

import type { PlanRestriccion } from '@/types/planTrabajo'
import { TdrEditableTable, type ColumnaTabla } from '@/components/tdr/TdrEditableTable'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  valor: PlanRestriccion[]
  onSave: (v: PlanRestriccion[]) => Promise<void>
  onCancel: () => void
}

const COLUMNS: ColumnaTabla<PlanRestriccion>[] = [
  { key: 'texto', label: 'Restricción', type: 'text', required: true },
  { key: 'categoria', label: 'Categoría', type: 'text', width: '160px', placeholder: 'Ej: ACCESO, SEGURIDAD...' },
]

const filaVacia = (): PlanRestriccion => ({ texto: '', categoria: '' })

export function RestriccionesEditor({ valor, onSave, onCancel }: Props) {
  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Restricciones</SheetTitle>
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
