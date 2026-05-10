'use client'

import type { PlanPersonal } from '@/types/planTrabajo'
import { TdrEditableTable, type ColumnaTabla } from '@/components/tdr/TdrEditableTable'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  valor: PlanPersonal[]
  onSave: (v: PlanPersonal[]) => Promise<void>
  onCancel: () => void
}

const COLUMNS: ColumnaTabla<PlanPersonal>[] = [
  { key: 'nombre', label: 'Nombre', type: 'text', required: true },
  { key: 'cargo', label: 'Cargo', type: 'text', required: true },
  { key: 'empresa', label: 'Empresa', type: 'text', width: '130px' },
  { key: 'siglas', label: 'Siglas', type: 'text', width: '80px' },
  { key: 'cip', label: 'CIP', type: 'text', width: '90px' },
  { key: 'email', label: 'Email', type: 'text', width: '180px' },
  { key: 'telefono', label: 'Teléfono', type: 'text', width: '120px' },
]

const filaVacia = (): PlanPersonal => ({
  nombre: '',
  cargo: '',
  empresa: '',
  siglas: '',
  cip: '',
  email: '',
  telefono: '',
})

export function PersonalAsignadoEditor({ valor, onSave, onCancel }: Props) {
  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="sm:max-w-5xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Personal Asignado</SheetTitle>
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
